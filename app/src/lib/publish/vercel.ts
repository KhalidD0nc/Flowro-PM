import { promises as fs } from "fs"
import path from "path"

export type ApiResult = {
    ok: boolean
    status: number
    data: unknown
}

export type VercelRequest = (endpoint: string, method: string, body?: unknown) => Promise<ApiResult>

export type ResolvedVercelProject = {
    projectName: string
    reusedRecordedProject: boolean
    createdProject: boolean
}

export type VercelDeploymentResult = {
    id: string
    url: string
}

type ExistingVercelProject = {
    name?: string
    link?: {
        repo?: string
        repoId?: number | string
        org?: string
        type?: string
    }
}

const VITE_VERCEL_CONFIG = {
    buildCommand: "npm run build",
    outputDirectory: "dist",
    framework: "vite",
    rewrites: [
        {
            source: "/(.*)",
            destination: "/index.html",
        },
    ],
}

const DEPLOYMENT_READY_STATES = new Set(["READY"])
const DEPLOYMENT_FAILED_STATES = new Set(["ERROR", "CANCELED"])

export function uniqueVercelProjectName(baseSlug: string, projectId: string): string {
    const suffix = projectId.replace(/[^a-z0-9]/gi, "").slice(0, 6).toLowerCase() || Date.now().toString(36)
    const maxBaseLength = Math.max(1, 100 - suffix.length - 1)
    return `${baseSlug.slice(0, maxBaseLength).replace(/-+$/g, "")}-${suffix}`
}

export async function ensureViteVercelJson(workspacePath: string): Promise<void> {
    const vercelJsonPath = path.join(workspacePath, "vercel.json")
    let existing: Record<string, unknown> = {}

    try {
        const raw = await fs.readFile(vercelJsonPath, "utf-8")
        const parsed = JSON.parse(raw) as unknown
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            existing = parsed as Record<string, unknown>
        }
    } catch {
        existing = {}
    }

    await fs.writeFile(
        vercelJsonPath,
        `${JSON.stringify({ ...existing, ...VITE_VERCEL_CONFIG }, null, 2)}\n`,
        "utf-8",
    )
}

export async function resolveVercelProjectName(input: {
    baseSlug: string
    projectId: string
    recordedProjectName?: string
    request: VercelRequest
}): Promise<ResolvedVercelProject> {
    const recorded = input.recordedProjectName?.trim()
    if (recorded) {
        const recordedProject = await getVercelProject(recorded, input.request)
        if (recordedProject.exists) {
            return { projectName: recorded, reusedRecordedProject: true, createdProject: false }
        }
    }

    const baseProject = await getVercelProject(input.baseSlug, input.request)
    const candidate = baseProject.exists
        ? uniqueVercelProjectName(input.baseSlug, input.projectId)
        : input.baseSlug

    const createBody: Record<string, unknown> = {
        name: candidate,
        framework: "vite",
        buildCommand: "npm run build",
        outputDirectory: "dist",
    }

    const createRes = await input.request("/v10/projects", "POST", createBody)
    if (createRes.ok || createRes.status === 409) {
        if (createRes.status === 409 && candidate === input.baseSlug) {
            throw new Error(`Vercel project "${candidate}" already exists; refusing to reuse an untracked project.`)
        }
        return { projectName: candidate, reusedRecordedProject: false, createdProject: createRes.ok }
    }

    const message = readApiMessage(createRes.data) || `HTTP ${createRes.status}`
    throw new Error(`Failed to create Vercel project "${candidate}": ${message}`)
}

export async function createVercelDeployment(input: {
    projectName: string
    repoId: number
    ref: string
    sha: string
    request: VercelRequest
}): Promise<VercelDeploymentResult> {
    const deployRes = await input.request("/v13/deployments", "POST", {
        name: input.projectName,
        project: input.projectName,
        target: "production",
        gitSource: {
            type: "github",
            repoId: String(input.repoId),
            ref: input.ref,
            sha: input.sha,
        },
        projectSettings: {
            buildCommand: "npm run build",
            outputDirectory: "dist",
            framework: "vite",
        },
    })

    if (!deployRes.ok) {
        const message = readApiMessage(deployRes.data) || `HTTP ${deployRes.status}`
        throw new Error(`Failed to create Vercel deployment: ${message}`)
    }

    const id = readStringField(deployRes.data, "id")
    const rawUrl = readStringField(deployRes.data, "url")
    if (!id || !rawUrl) {
        throw new Error("Vercel deployment response did not include both id and url.")
    }

    return { id, url: toHttpsUrl(rawUrl) }
}

export async function waitForVercelDeployment(input: {
    deploymentId: string
    request: VercelRequest
    timeoutMs?: number
    intervalMs?: number
}): Promise<void> {
    const timeoutMs = input.timeoutMs ?? 120_000
    const intervalMs = input.intervalMs ?? 3_000
    const deadline = Date.now() + timeoutMs

    while (Date.now() < deadline) {
        const res = await input.request(`/v13/deployments/${encodeURIComponent(input.deploymentId)}`, "GET")
        if (!res.ok) {
            const message = readApiMessage(res.data) || `HTTP ${res.status}`
            throw new Error(`Failed to read Vercel deployment status: ${message}`)
        }

        const state = readStringField(res.data, "readyState") || readStringField(res.data, "state")
        if (state && DEPLOYMENT_READY_STATES.has(state)) return
        if (state && DEPLOYMENT_FAILED_STATES.has(state)) {
            const message = readStringField(res.data, "errorMessage") || readStringField(res.data, "errorCode") || state
            throw new Error(`Vercel deployment failed: ${message}`)
        }

        await new Promise((resolve) => setTimeout(resolve, intervalMs))
    }

    throw new Error("Timed out waiting for Vercel deployment to become ready.")
}

export function validatePublishedViteHtml(html: string, productName: string): { ok: boolean; error?: string } {
    if (!html.includes('id="root"')) {
        return { ok: false, error: "Published app is missing the Vite root element." }
    }
    if (!/\/assets\/index-[^"']+\.(js|css)/.test(html)) {
        return { ok: false, error: "Published app does not reference Vite index assets." }
    }
    if (/\bmain\.js\b/.test(html) || /\bmain\.css\b/.test(html) || /\bcomponents\.css\b/.test(html)) {
        return { ok: false, error: "Published app appears to be a legacy static shell, not the generated Vite build." }
    }
    if (productName.toLowerCase() !== "expenses" && /<title>\s*Expenses\s*<\/title>/i.test(html)) {
        return { ok: false, error: "Published app title belongs to an unrelated Expenses deployment." }
    }

    return { ok: true }
}

export async function verifyPublishedViteApp(url: string, productName: string): Promise<void> {
    const res = await fetch(url, {
        headers: {
            "Cache-Control": "no-cache",
            "User-Agent": "Flowro-Publish-Validator",
        },
    })
    if (!res.ok) {
        throw new Error(`Published app returned HTTP ${res.status}.`)
    }

    const html = await res.text()
    const validation = validatePublishedViteHtml(html, productName)
    if (!validation.ok) {
        throw new Error(`Vercel served a different project/output than the generated Vite build. ${validation.error}`)
    }
}

async function getVercelProject(
    projectName: string,
    request: VercelRequest,
): Promise<{ exists: boolean; project?: ExistingVercelProject }> {
    const res = await request(`/v9/projects/${encodeURIComponent(projectName)}`, "GET")
    if (res.ok) return { exists: true, project: res.data as ExistingVercelProject }
    if (res.status === 404) return { exists: false }
    const message = readApiMessage(res.data) || `HTTP ${res.status}`
    throw new Error(`Failed to inspect Vercel project "${projectName}": ${message}`)
}

function readStringField(data: unknown, field: string): string | undefined {
    if (!data || typeof data !== "object") return undefined
    const value = (data as Record<string, unknown>)[field]
    return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function readApiMessage(data: unknown): string | undefined {
    return readStringField(data, "message") || readStringField(data, "errorMessage") || readStringField(data, "error")
}

function toHttpsUrl(rawUrl: string): string {
    return rawUrl.startsWith("http://") || rawUrl.startsWith("https://") ? rawUrl : `https://${rawUrl}`
}
