import { NextRequest, NextResponse } from "next/server"
import { verifyAuthToken, isAuthError, unauthorizedResponse } from "@/app/api/blueprints/auth"
import { logError } from "@/lib/logger"
import { getProject, getBuildRuns, updateProjectPublish, setProjectStage } from "@/lib/firebase/collections"
import { runCommand } from "@/lib/build-worker/fs"
import {
    createVercelDeployment,
    ensureViteVercelJson,
    resolveVercelProjectName,
    verifyPublishedViteApp,
    waitForVercelDeployment,
} from "@/lib/publish/vercel"
import { Timestamp } from "firebase-admin/firestore"
import { homedir } from "os"
import path from "path"
import { promises as fs } from "fs"

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ""
const VERCEL_TOKEN = process.env.VERCEL_TOKEN || ""
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID || ""
const GENERATED_APPS_BASE = process.env.FLOWRO_GENERATED_APPS_PATH || path.join(homedir(), "Desktop", "Flowro-Apps")

function slugify(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 100) || "flowro-app"
}

function parseGithubUrl(url: string): { owner: string; repo: string } | null {
    const match = url.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/)
    if (!match) return null
    return { owner: match[1], repo: match[2] }
}

async function githubRequest(endpoint: string, method: string, body?: unknown): Promise<{ ok: boolean; status: number; data: unknown }> {
    const res = await fetch(`https://api.github.com${endpoint}`, {
        method,
        headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "Content-Type": "application/json",
            "User-Agent": "Flowro-PM",
        },
        body: body ? JSON.stringify(body) : undefined,
    })
    const data = await res.json().catch(() => null)
    return { ok: res.ok, status: res.status, data }
}

async function vercelRequest(endpoint: string, method: string, body?: unknown): Promise<{ ok: boolean; status: number; data: unknown }> {
    const url = new URL(`https://api.vercel.com${endpoint}`)
    if (VERCEL_TEAM_ID) url.searchParams.set("teamId", VERCEL_TEAM_ID)
    const res = await fetch(url.toString(), {
        method,
        headers: {
            Authorization: `Bearer ${VERCEL_TOKEN}`,
            "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
    })
    const data = await res.json().catch(() => null)
    return { ok: res.ok, status: res.status, data }
}

async function verifyOwnership(projectId: string, userId: string): Promise<void> {
    const project = await getProject(projectId)
    if (!project) throw new Error("Project not found")
    if (project.userId !== userId) throw new Error("Access denied")
}

async function resolveWorkspacePath(successfulRunPath: string | null, projectId: string): Promise<string | null> {
    const candidates = [
        successfulRunPath?.startsWith("~")
            ? path.join(homedir(), successfulRunPath.slice(1))
            : successfulRunPath,
        path.join(GENERATED_APPS_BASE, projectId),
    ].filter((candidate): candidate is string => Boolean(candidate))
    for (const p of candidates) {
        try { await fs.access(p); return p } catch { /* try next */ }
    }
    return null
}

// Idempotent: safe whether or not .git / remote already exist
async function gitPush(workspacePath: string, cloneUrl: string, commitMessage: string): Promise<{ error: string | null; sha?: string }> {
    const steps: Array<{ cmd: string; required: boolean }> = [
        { cmd: "git init -b main", required: false },
        // Set-url if origin exists, add if not
        { cmd: `git remote set-url origin ${cloneUrl} 2>/dev/null || git remote add origin ${cloneUrl}`, required: true },
        { cmd: "git add -A", required: true },
        // Commit; tolerate "nothing to commit"
        { cmd: `git -c user.email="flowro@app.com" -c user.name="Flowro" commit -m "${commitMessage}" || true`, required: true },
        { cmd: "git push -u origin main --force", required: true },
    ]

    for (const step of steps) {
        const result = await runCommand(workspacePath, step.cmd, 60000)
        if (step.required && result.exitCode !== 0) {
            return { error: `Git error on [${step.cmd.split(" ")[1]}]: ${result.stderr.slice(0, 300)}` }
        }
    }
    const shaResult = await runCommand(workspacePath, "git rev-parse HEAD", 10000)
    if (shaResult.exitCode !== 0) {
        return { error: `Git error on [rev-parse]: ${shaResult.stderr.slice(0, 300)}` }
    }
    return { error: null, sha: shaResult.stdout.trim() }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    const { projectId } = await params

    try {
        const authResult = await verifyAuthToken(request)
        if (isAuthError(authResult)) return unauthorizedResponse(authResult)

        await verifyOwnership(projectId, authResult.userId)

        if (!GITHUB_TOKEN || !VERCEL_TOKEN) {
            return NextResponse.json({ error: "GITHUB_TOKEN and VERCEL_TOKEN must be set in .env.local" }, { status: 500 })
        }

        const project = await getProject(projectId)
        if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

        const buildRuns = await getBuildRuns(projectId)
        // Primary: find a success run with a recorded workspace path
        const successfulRun = buildRuns.find((r) => r.status === "success" && r.targetWorkspacePath)
        // Fallback: any success run (workspace path may be derived from projectId)
        const anySuccessRun = successfulRun ?? buildRuns.find((r) => r.status === "success")

        // Resolve workspace path: use recorded path if available, else derive from projectId
        const candidatePath = anySuccessRun?.targetWorkspacePath ?? null
        const workspacePath = await resolveWorkspacePath(candidatePath, projectId)

        if (!workspacePath) {
            // No success run at all — check if the workspace dir exists on disk anyway
            // (this handles cases where the build server restarted before finalizing the run)
            const derivedPath = path.join(GENERATED_APPS_BASE, projectId)
            let derivedExists = false
            try { await fs.access(derivedPath); derivedExists = true } catch { /* not found */ }

            if (!derivedExists || buildRuns.length === 0) {
                return NextResponse.json({ error: "No successful build found. Build the app before publishing." }, { status: 400 })
            }
            // Workspace exists on disk but no success record — proceed with derived path
        }

        const resolvedWorkspacePath = workspacePath ?? path.join(GENERATED_APPS_BASE, projectId)

        await updateProjectPublish(projectId, { publishStatus: "pushing" })

        // ── Validate GitHub token ────────────────────────────────────────────
        const meRes = await githubRequest("/user", "GET")
        if (!meRes.ok) {
            await updateProjectPublish(projectId, { publishStatus: "failed", publishError: "Invalid GitHub token" })
            return NextResponse.json({ error: "Invalid GitHub token" }, { status: 401 })
        }
        const githubLogin = (meRes.data as { login: string }).login

        await ensureViteVercelJson(resolvedWorkspacePath)

        // ── Determine if this is a first publish or a re-publish ─────────────
        const existingGithubUrl = project.githubRepoUrl
        const isUpdate = Boolean(existingGithubUrl)

        let githubOwner = githubLogin
        let repoSlug = slugify(project.name)

        if (isUpdate && existingGithubUrl) {
            const parsed = parseGithubUrl(existingGithubUrl)
            if (parsed) { githubOwner = parsed.owner; repoSlug = parsed.repo }
        }

        // ── Ensure GitHub repo exists (create if missing, handles both first publish and deleted repos) ──
        const repoCheckRes = await githubRequest(`/repos/${githubOwner}/${repoSlug}`, "GET")
        if (!repoCheckRes.ok) {
            if (repoCheckRes.status === 404) {
                // Repo doesn't exist (first publish or previously deleted) — create it
                const createRes = await githubRequest("/user/repos", "POST", {
                    name: repoSlug,
                    private: false,
                    auto_init: false,
                    description: `${project.name} — generated by Flowro`,
                })

                if (!createRes.ok) {
                    const errMsg = (createRes.data as { message?: string })?.message || ""
                    if (!errMsg.toLowerCase().includes("already exists")) {
                        // Name conflict with different slug → append timestamp
                        repoSlug = `${repoSlug}-${Date.now()}`
                        const retryRes = await githubRequest("/user/repos", "POST", {
                            name: repoSlug,
                            private: false,
                            auto_init: false,
                            description: `${project.name} — generated by Flowro`,
                        })
                        if (!retryRes.ok) {
                            const msg = `Failed to create GitHub repo: ${(retryRes.data as { message?: string })?.message}`
                            await updateProjectPublish(projectId, { publishStatus: "failed", publishError: msg })
                            return NextResponse.json({ error: msg }, { status: 500 })
                        }
                    }
                }
            } else {
                const msg = `Failed to check GitHub repo: ${(repoCheckRes.data as { message?: string })?.message}`
                await updateProjectPublish(projectId, { publishStatus: "failed", publishError: msg })
                return NextResponse.json({ error: msg }, { status: 500 })
            }
        }

        const githubRepoUrl = `https://github.com/${githubOwner}/${repoSlug}`
        const cloneUrl = `https://${GITHUB_TOKEN}@github.com/${githubOwner}/${repoSlug}.git`
        const commitMessage = isUpdate ? "Update — re-generated by Flowro" : "Initial commit — generated by Flowro"

        // ── Push to GitHub ───────────────────────────────────────────────────
        const gitResult = await gitPush(resolvedWorkspacePath, cloneUrl, commitMessage)
        if (gitResult.error || !gitResult.sha) {
            const error = gitResult.error || "Git push did not produce a commit SHA"
            await updateProjectPublish(projectId, { publishStatus: "failed", publishError: error })
            return NextResponse.json({ error }, { status: 500 })
        }

        await updateProjectPublish(projectId, { publishStatus: "deploying", githubRepoUrl })

        // ── Deploy to Vercel ─────────────────────────────────────────────────
        const repoInfoRes = await githubRequest(`/repos/${githubOwner}/${repoSlug}`, "GET")
        const repoId = repoInfoRes.ok ? (repoInfoRes.data as { id: number }).id : undefined
        if (!repoId) {
            const message = "Failed to resolve GitHub repo id for Vercel deployment."
            await updateProjectPublish(projectId, { publishStatus: "failed", publishError: message })
            return NextResponse.json({ error: message }, { status: 500 })
        }

        const vercelProject = await resolveVercelProjectName({
            baseSlug: slugify(project.name),
            projectId,
            recordedProjectName: project.vercelProjectName,
            request: vercelRequest,
        })
        await updateProjectPublish(projectId, {
            publishStatus: "deploying",
            githubRepoUrl,
            vercelProjectName: vercelProject.projectName,
        })

        const deployment = await createVercelDeployment({
            projectName: vercelProject.projectName,
            repoId,
            ref: "main",
            sha: gitResult.sha,
            request: vercelRequest,
        })
        await waitForVercelDeployment({ deploymentId: deployment.id, request: vercelRequest })
        // Non-fatal: Vercel deployment protection (401) or network issues shouldn't block a successful deploy
        await verifyPublishedViteApp(deployment.url, project.name).catch((err: unknown) => {
            logError("publish_verify", { error: String(err), projectId, url: deployment.url })
        })

        const vercelDeployUrl = deployment.url

        await updateProjectPublish(projectId, {
            publishStatus: "live",
            githubRepoUrl,
            vercelProjectName: vercelProject.projectName,
            vercelDeploymentId: deployment.id,
            vercelDeploymentUrl: deployment.url,
            vercelDeployUrl,
            publishedAt: Timestamp.now(),
            publishError: undefined,
        })
        await setProjectStage(projectId, "published")

        return NextResponse.json({
            githubRepoUrl,
            vercelProjectName: vercelProject.projectName,
            vercelDeploymentId: deployment.id,
            vercelDeploymentUrl: deployment.url,
            vercelDeployUrl,
        })

    } catch (error) {
        logError("publish_project", { error: String(error), projectId })
        const message = error instanceof Error ? error.message : "Publish failed"
        await updateProjectPublish(projectId, { publishStatus: "failed", publishError: message }).catch(() => null)
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
