import {
    deriveBuildProgress,
    extractJsonFromResponse,
    parseBundledFiles,
    stripMarkdownCodeBlocks,
} from "../lib/build-worker/executor"
import { buildFallbackFiles } from "../lib/build-worker/fallback"
import { buildCompletionDefaults } from "../lib/build-worker/openrouter-build"
import { getTemplateManifest } from "../lib/project-plan/schema"
import type { Stage3BuildJob } from "../lib/build-worker/kimiPrompt"

const templateManifest = getTemplateManifest("nextjs-app")

const baseJob: Stage3BuildJob = {
    projectId: "project-1",
    projectPlan: {
        metadata: { productName: "Task Orbit", version: "0.1", status: "approved" },
        templateId: "nextjs-app",
        appSummary: "A focused workspace for planning team tasks.",
        targetUser: "Product teams",
        problem: "Teams need a faster way to turn planning notes into actionable work.",
        successCriteria: ["Dashboard renders", "Routes are visible"],
        routes: [
            { path: "/", name: "Dashboard", purpose: "Show active planning work.", primaryActions: ["Create task"] },
            { path: "/tasks", name: "Tasks", purpose: "Review task queue.", primaryActions: ["Review task"] },
        ],
        dataModels: [{ name: "Task", purpose: "Store work items.", fields: ["id: string", "title: string"] }],
        auth: { required: false, notes: "No accounts required for preview." },
        integrations: [],
        uiRequirements: ["Use a focused dashboard layout."],
        buildTasks: [{ id: "T-1", title: "Build dashboard", description: "Create the main dashboard.", status: "pending" }],
        acceptanceChecks: ["Dashboard renders without authentication."],
        risks: [],
    },
    designArtifact: {
        id: "design-1",
        projectId: "project-1",
        provider: "stitch",
        stitchProjectId: "stitch-1",
        screenId: "screen-1",
        name: "Dashboard Design",
        imageUrl: "https://example.com/image.png",
        htmlUrl: null,
        htmlSnapshot: "<html><body>Design</body></html>",
        status: "approved",
    },
    templateManifest,
    targetWorkspacePath: "/tmp/flowro-project-1",
    editablePaths: templateManifest.editablePaths,
    commands: templateManifest.scripts,
}

export function runBuildExecutorTests(): Array<{ name: string; passed: boolean }> {
    return [
        {
            name: "extractJsonFromResponse parses direct JSON",
            passed: (() => {
                const result = extractJsonFromResponse('{"status":"success"}')
                return (result as Record<string, unknown>).status === "success"
            })(),
        },
        {
            name: "extractJsonFromResponse parses markdown-wrapped JSON",
            passed: (() => {
                const result = extractJsonFromResponse('```json\n{"status":"ok"}\n```')
                return (result as Record<string, unknown>).status === "ok"
            })(),
        },
        {
            name: "extractJsonFromResponse parses JSON with surrounding text",
            passed: (() => {
                const result = extractJsonFromResponse('Here is the result:\n{"status":"ok"}\nHope that helps!')
                return (result as Record<string, unknown>).status === "ok"
            })(),
        },
        {
            name: "stripMarkdownCodeBlocks removes code fences",
            passed: (() => {
                const result = stripMarkdownCodeBlocks('```tsx\nconst x = 1;\n```')
                return result === "const x = 1;"
            })(),
        },
        {
            name: "stripMarkdownCodeBlocks leaves plain text alone",
            passed: (() => {
                const result = stripMarkdownCodeBlocks('const x = 1;')
                return result === "const x = 1;"
            })(),
        },
        {
            name: "parseBundledFiles accepts marker-delimited editable files",
            passed: (() => {
                const result = parseBundledFiles("<<<FILE:src/app/page.tsx>>>\nexport default function Page() { return null }\n<<<END_FILE>>>", ["src/app"])
                return result["src/app/page.tsx"].includes("Page")
            })(),
        },
        {
            name: "parseBundledFiles rejects files outside editable paths",
            passed: (() => {
                try {
                    parseBundledFiles("<<<FILE:package.json>>>\n{}\n<<<END_FILE>>>", ["src/app"])
                    return false
                } catch {
                    return true
                }
            })(),
        },
        {
            name: "buildFallbackFiles produces required app files",
            passed: (() => {
                const files = buildFallbackFiles(baseJob)
                return Boolean(files["src/app/page.tsx"] && files["src/app/layout.tsx"] && files["src/lib/mock-data.ts"])
            })(),
        },
        {
            name: "deriveBuildProgress accounts for generated file count",
            passed: deriveBuildProgress({ status: "running", phase: "generating", completedFiles: 2, totalFiles: 4 }) > 30,
        },
        {
            name: "build completion defaults are bounded for fast worker calls",
            passed: buildCompletionDefaults.timeoutMs < 300000 && buildCompletionDefaults.maxRetries < 3,
        },
    ]
}

if (require.main === module) {
    const results = runBuildExecutorTests()
    const passed = results.filter((result) => result.passed).length

    console.log("\nBuildExecutor Tests\n")
    results.forEach((result) => {
        console.log(`${result.passed ? "PASS" : "FAIL"}  ${result.name}`)
    })
    console.log(`\nSummary: ${passed}/${results.length} passed`)

    if (passed !== results.length) {
        process.exit(1)
    }
}
