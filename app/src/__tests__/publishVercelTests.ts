import { promises as fs } from "fs"
import os from "os"
import path from "path"
import {
    createVercelDeployment,
    ensureViteVercelJson,
    resolveVercelProjectName,
    validatePublishedViteHtml,
    waitForVercelDeployment,
    type ApiResult,
} from "../lib/publish/vercel"

type RequestCall = {
    endpoint: string
    method: string
    body?: unknown
}

function createRequestMock(results: ApiResult[]) {
    const calls: RequestCall[] = []
    const request = async (endpoint: string, method: string, body?: unknown): Promise<ApiResult> => {
        calls.push({ endpoint, method, body })
        return results.shift() ?? { ok: false, status: 500, data: { message: "Unexpected request" } }
    }
    return { calls, request }
}

async function vercelProjectNameUsesBaseWhenAvailable(): Promise<boolean> {
    const mock = createRequestMock([
        { ok: false, status: 404, data: { message: "Not found" } },
        { ok: true, status: 200, data: { id: "prj_base" } },
    ])

    const result = await resolveVercelProjectName({
        baseSlug: "expensetracker",
        projectId: "k4lxPLOgoyxVr1A0nKmk",
        githubOwner: "KhalidD0nc",
        repoSlug: "expensetracker",
        repoId: 123,
        request: mock.request,
    })

    const createBody = mock.calls[1]?.body as Record<string, unknown>
    return result.projectName === "expensetracker" &&
        mock.calls[0]?.endpoint === "/v9/projects/expensetracker" &&
        mock.calls[1]?.endpoint === "/v10/projects" &&
        createBody.name === "expensetracker"
}

async function vercelProjectNameAvoidsExistingBase(): Promise<boolean> {
    const mock = createRequestMock([
        { ok: true, status: 200, data: { id: "prj_existing", name: "expensetracker" } },
        { ok: true, status: 200, data: { id: "prj_unique" } },
    ])

    const result = await resolveVercelProjectName({
        baseSlug: "expensetracker",
        projectId: "k4lxPLOgoyxVr1A0nKmk",
        githubOwner: "KhalidD0nc",
        repoSlug: "expensetracker",
        repoId: 123,
        request: mock.request,
    })

    const createBody = mock.calls[1]?.body as Record<string, unknown>
    return result.projectName === "expensetracker-k4lxpl" &&
        createBody.name === "expensetracker-k4lxpl"
}

async function vercelProjectNameReusesRecordedProject(): Promise<boolean> {
    const mock = createRequestMock([
        { ok: true, status: 200, data: { id: "prj_recorded", name: "expensetracker-k4lxpl" } },
    ])

    const result = await resolveVercelProjectName({
        baseSlug: "expensetracker",
        projectId: "k4lxPLOgoyxVr1A0nKmk",
        recordedProjectName: "expensetracker-k4lxpl",
        githubOwner: "KhalidD0nc",
        repoSlug: "expensetracker",
        repoId: 123,
        request: mock.request,
    })

    return result.projectName === "expensetracker-k4lxpl" &&
        result.reusedRecordedProject &&
        mock.calls.length === 1
}

async function vercelJsonMergePreservesSafeFields(): Promise<boolean> {
    const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), "flowro-vercel-json-"))
    try {
        await fs.writeFile(path.join(workspacePath, "vercel.json"), JSON.stringify({
            cleanUrls: true,
            framework: "nextjs",
            rewrites: [{ source: "/old", destination: "/old.html" }],
        }, null, 2))

        await ensureViteVercelJson(workspacePath)

        const parsed = JSON.parse(await fs.readFile(path.join(workspacePath, "vercel.json"), "utf-8")) as {
            cleanUrls?: boolean
            buildCommand?: string
            outputDirectory?: string
            framework?: string
            rewrites?: Array<{ source: string; destination: string }>
        }

        return parsed.cleanUrls === true &&
            parsed.buildCommand === "npm run build" &&
            parsed.outputDirectory === "dist" &&
            parsed.framework === "vite" &&
            parsed.rewrites?.[0]?.source === "/(.*)" &&
            parsed.rewrites?.[0]?.destination === "/index.html"
    } finally {
        await fs.rm(workspacePath, { recursive: true, force: true })
    }
}

async function deploymentRequestTargetsResolvedProjectAndSha(): Promise<boolean> {
    const mock = createRequestMock([
        { ok: true, status: 200, data: { id: "dpl_123", url: "expensetracker-k4lxpl.vercel.app" } },
    ])

    const result = await createVercelDeployment({
        projectName: "expensetracker-k4lxpl",
        repoId: 123,
        ref: "main",
        sha: "abc123",
        request: mock.request,
    })
    const body = mock.calls[0]?.body as {
        project?: string
        gitSource?: { repoId?: string; ref?: string; sha?: string }
        projectSettings?: { framework?: string; outputDirectory?: string }
    }

    return result.id === "dpl_123" &&
        result.url === "https://expensetracker-k4lxpl.vercel.app" &&
        body.project === "expensetracker-k4lxpl" &&
        body.gitSource?.repoId === "123" &&
        body.gitSource?.ref === "main" &&
        body.gitSource?.sha === "abc123" &&
        body.projectSettings?.framework === "vite" &&
        body.projectSettings?.outputDirectory === "dist"
}

async function deploymentPollWaitsUntilReady(): Promise<boolean> {
    const mock = createRequestMock([
        { ok: true, status: 200, data: { readyState: "BUILDING" } },
        { ok: true, status: 200, data: { readyState: "READY" } },
    ])

    await waitForVercelDeployment({
        deploymentId: "dpl_123",
        request: mock.request,
        timeoutMs: 1000,
        intervalMs: 1,
    })

    return mock.calls.length === 2 &&
        mock.calls.every((call) => call.endpoint === "/v13/deployments/dpl_123" && call.method === "GET")
}

export async function runPublishVercelTests(): Promise<Array<{ name: string; passed: boolean }>> {
    return [
        {
            name: "Vercel project resolver uses base slug when available",
            passed: await vercelProjectNameUsesBaseWhenAvailable(),
        },
        {
            name: "Vercel project resolver avoids existing untracked base slug",
            passed: await vercelProjectNameAvoidsExistingBase(),
        },
        {
            name: "Vercel project resolver reuses recorded project",
            passed: await vercelProjectNameReusesRecordedProject(),
        },
        {
            name: "Vercel config merge enforces Vite SPA settings",
            passed: await vercelJsonMergePreservesSafeFields(),
        },
        {
            name: "Vercel deployment request targets resolved project and commit SHA",
            passed: await deploymentRequestTargetsResolvedProjectAndSha(),
        },
        {
            name: "Vercel deployment polling waits until ready",
            passed: await deploymentPollWaitsUntilReady(),
        },
        {
            name: "published HTML validator accepts Vite output",
            passed: validatePublishedViteHtml(
                '<html><body><div id="root"></div><script type="module" src="/assets/index-abc123.js"></script></body></html>',
                "ExpenseTracker",
            ).ok,
        },
        {
            name: "published HTML validator rejects legacy static shell",
            passed: !validatePublishedViteHtml(
                '<html><head><title>Expenses</title><link rel="stylesheet" href="main.css" /></head><body><div id="root"></div><script src="main.js"></script></body></html>',
                "ExpenseTracker",
            ).ok,
        },
    ]
}

if (require.main === module) {
    runPublishVercelTests().then((results) => {
        const passed = results.filter((result) => result.passed).length

        console.log("\nPublishVercel Tests\n")
        results.forEach((result) => {
            console.log(`${result.passed ? "PASS" : "FAIL"}  ${result.name}`)
        })
        console.log(`\nSummary: ${passed}/${results.length} passed`)

        if (passed !== results.length) {
            process.exit(1)
        }
    }).catch((error) => {
        console.error(error)
        process.exit(1)
    })
}
