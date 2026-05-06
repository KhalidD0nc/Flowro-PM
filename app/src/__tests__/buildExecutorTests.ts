import {
    deriveBuildProgress,
    extractJsonFromResponse,
    parseBundledFiles,
    summarizeSupabaseTemplateOwnedTypecheckFailure,
    stripMarkdownCodeBlocks,
} from "../lib/build-worker/executor"
import { buildFallbackFiles } from "../lib/build-worker/fallback"
import { readRepairContextFiles } from "../lib/build-worker/fs"
import { buildCompletionDefaults } from "../lib/build-worker/openrouter-build"
import { detectPackagesFromFiles, normalizeGeneratedFilesForVite, normalizeGeneratedPath, sanitizeGeneratedContent } from "../lib/build-worker/vite"
import { buildWorkspaceManifest } from "../lib/build-worker/manifest"
import { executeEditSearch, selectTargetFiles, type EditSearchPlan } from "../lib/build-worker/editSearch"
import { filterFilesToTargetSet } from "../lib/build-worker/editExecutor"
import { createBuildContract, getTemplateManifest } from "../lib/project-plan/schema"
import type { BuildJob } from "../lib/build-worker/agentPrompt"
import { shouldPollBuildRun } from "../components/workspace/BuildMissionControl"
import { findLatestRecoverablePreviewRun, findLatestRelaunchablePreviewRun, findLatestSuccessfulPreviewRun } from "../lib/previewSelection"
import type { BuildRun } from "../lib/project-plan/schema"
import { promises as fs } from "fs"
import os from "os"
import path from "path"
import ts from "typescript"

const templateManifest = getTemplateManifest("vite-react-app")
const projectPlan = {
    metadata: { productName: "Task Orbit", version: "0.1", status: "approved" as const },
    templateId: "vite-react-app" as const,
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
    buildTasks: [{ id: "T-1", title: "Build dashboard", description: "Create the main dashboard.", status: "pending" as const }],
    acceptanceChecks: ["Dashboard renders without authentication."],
    risks: [],
}

const baseJob: BuildJob = {
    projectId: "project-1",
    projectPlan,
    buildContract: createBuildContract("project-1", projectPlan, templateManifest),
    templateManifest,
    targetWorkspacePath: "/tmp/flowro-project-1",
    editablePaths: templateManifest.editablePaths,
    commands: templateManifest.scripts,
}

export async function runBuildExecutorTests(): Promise<Array<{ name: string; passed: boolean }>> {
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
                const result = parseBundledFiles("<<<FILE:src/App.tsx>>>\nexport default function App() { return null }\n<<<END_FILE>>>", ["src"])
                return result["src/App.tsx"].includes("App")
            })(),
        },
        {
            name: "parseBundledFiles rejects unsafe paths",
            passed: (() => {
                try {
                    parseBundledFiles("<<<FILE:../package.json>>>\n{}\n<<<END_FILE>>>", ["src"])
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
                return Boolean(files["src/App.tsx"] &&
                    files["src/styles.css"] &&
                    files["src/lib/mock-data.ts"] &&
                    files["src/components/ui/app-kit.tsx"] &&
                    files["src/pages/LandingPage.tsx"] &&
                    files["src/pages/AppWorkspace.tsx"])
            })(),
        },
        {
            name: "buildFallbackFiles implements landing-to-app flow without starter placeholder",
            passed: (() => {
                const files = buildFallbackFiles(baseJob)
                const allContent = Object.values(files).join("\n")
                return files["src/App.tsx"].includes("BrowserRouter") &&
                    files["src/App.tsx"].includes('path="/"') &&
                    files["src/App.tsx"].includes('path="/app/*"') &&
                    files["src/pages/LandingPage.tsx"].includes('to="/app"') &&
                    files["src/pages/AppWorkspace.tsx"].includes("Product workspace") &&
                    !allContent.includes("Generated app ready")
            })(),
        },
        {
            name: "deriveBuildProgress accounts for generated file count",
            passed: deriveBuildProgress({ status: "running", phase: "generating", completedFiles: 2, totalFiles: 4 }) > 30,
        },
        {
            name: "build polling stays active for managed non-terminal runs",
            passed: shouldPollBuildRun({
                id: "run-1",
                projectId: "project-1",
                templateId: "vite-react-app",
                status: "running",
                phase: "preview",
                steps: [],
                logs: [],
                filesChanged: [],
                previewUrl: null,
                commandsRun: [],
                verificationResults: [],
                detectedPackages: [],
                installedPackages: [],
                validationErrors: [],
            }) && !shouldPollBuildRun({
                id: "run-2",
                projectId: "project-1",
                templateId: "vite-react-app",
                status: "failed",
                phase: "failed",
                steps: [],
                logs: [],
                filesChanged: [],
                previewUrl: null,
                commandsRun: [],
                verificationResults: [],
                detectedPackages: [],
                installedPackages: [],
                validationErrors: [],
            }),
        },
        {
            name: "preview selection uses latest successful run when latest run failed",
            passed: (() => {
                const failedLatest = testBuildRun("failed-latest", "failed")
                const successfulOlder = testBuildRun("success-older", "success", {
                    previewAvailable: true,
                    previewUrl: "http://localhost:3310",
                    targetWorkspacePath: "/tmp/flowro-success",
                })
                return findLatestSuccessfulPreviewRun([failedLatest, successfulOlder])?.id === "success-older"
            })(),
        },
        {
            name: "preview selection ignores failed runs without older success",
            passed: findLatestSuccessfulPreviewRun([testBuildRun("failed-latest", "failed")]) === null,
        },
        {
            name: "relaunch selection returns newest successful workspace run",
            passed: (() => {
                const failedLatest = testBuildRun("failed-latest", "failed", { targetWorkspacePath: "/tmp/failed" })
                const newestSuccess = testBuildRun("success-new", "success", {
                    previewAvailable: true,
                    previewUrl: null,
                    targetWorkspacePath: "/tmp/new",
                })
                const olderSuccess = testBuildRun("success-old", "success", {
                    previewAvailable: true,
                    previewUrl: "http://localhost:3310",
                    targetWorkspacePath: "/tmp/old",
                })
                return findLatestRelaunchablePreviewRun([failedLatest, newestSuccess, olderSuccess])?.id === "success-new"
            })(),
        },
        {
            name: "recoverable preview selection can use failed workspace runs",
            passed: findLatestRecoverablePreviewRun([
                testBuildRun("failed-with-workspace", "failed", {
                    targetWorkspacePath: "/tmp/flowro-failed",
                }),
            ])?.id === "failed-with-workspace",
        },
        {
            name: "build completion defaults are bounded for fast worker calls",
            passed: buildCompletionDefaults.timeoutMs < 300000 && buildCompletionDefaults.maxRetries < 3,
        },
        {
            name: "readRepairContextFiles excludes installed dependencies and caps repair context",
            passed: await repairContextExcludesDependencies(),
        },
        {
            name: "normalizeGeneratedPath maps Next page output to Vite App",
            passed: normalizeGeneratedPath("src/app/page.tsx") === "src/App.tsx",
        },
        {
            name: "normalizeGeneratedFilesForVite skips protected config files",
            passed: (() => {
                const result = normalizeGeneratedFilesForVite({
                    "package.json": "{}",
                    "src/App.tsx": "export default function App() { return null }",
                })
                return !result.files["package.json"] &&
                    Boolean(result.files["src/App.tsx"]) &&
                    result.skippedFiles.includes("package.json")
            })(),
        },
        {
            name: "sanitizeGeneratedContent expands custom @apply aliases for Tailwind v4",
            passed: (() => {
                const result = sanitizeGeneratedContent(
                    "src/styles.css",
                    ".text-label { @apply text-[0.75rem] uppercase; }\n.eyebrow { @apply text-label text-slate-500; }",
                )
                return result.includes("@apply text-[0.75rem] leading-[1.6] font-medium tracking-wide uppercase text-slate-500;") &&
                    !result.includes("@apply text-label")
            })(),
        },
        {
            name: "detectPackagesFromFiles extracts external imports only",
            passed: (() => {
                const packages = detectPackagesFromFiles({
                    "src/App.tsx": "import React from 'react'; import { Icon } from 'lucide-react'; import x from './local';",
                })
                return packages.length === 1 && packages[0] === "lucide-react"
            })(),
        },
        {
            name: "workspace manifest excludes dependencies and protected config files",
            passed: await workspaceManifestExcludesProtectedFiles(),
        },
        {
            name: "edit search executor finds exact text with line context",
            passed: await editSearchFindsExactText(),
        },
        {
            name: "target selector chooses one component file for simple edits",
            passed: await targetSelectorChoosesSingleComponentFile(),
        },
        {
            name: "targeted edit parser rejects files outside target set",
            passed: (() => {
                try {
                    filterFilesToTargetSet({ "src/App.tsx": "ok", "src/Other.tsx": "bad" }, ["src/App.tsx"], ["src"])
                    return false
                } catch {
                    return true
                }
            })(),
        },
        {
            name: "targeted edit blocks new feature requests in P0",
            passed: await targetedEditBlocksFeatureRequests(),
        },
        {
            name: "Supabase auth helper accepts sync ProtectedRoute callbacks",
            passed: await supabaseAuthTemplateAcceptsSyncCallbacks(),
        },
        {
            name: "Supabase template-owned typecheck failures are repair-blocked",
            passed: (() => {
                const message = summarizeSupabaseTemplateOwnedTypecheckFailure(
                    "src/components/ProtectedRoute.tsx:10:40 - error TS2345: Type 'void' is not assignable to type 'Promise<void>'.",
                )
                return Boolean(message?.includes("Supabase template-owned file failed typecheck") &&
                    message.includes("src/components/ProtectedRoute.tsx") &&
                    message.includes("repair cannot edit it"))
            })(),
        },
    ]
}

function testBuildRun(
    id: string,
    status: BuildRun["status"],
    overrides: Partial<BuildRun> = {},
): BuildRun {
    return {
        id,
        projectId: "project-1",
        templateId: "vite-react-app",
        status,
        steps: [],
        logs: [],
        filesChanged: [],
        previewUrl: null,
        commandsRun: [],
        verificationResults: [],
        detectedPackages: [],
        installedPackages: [],
        validationErrors: [],
        ...overrides,
    }
}

if (require.main === module) {
    runBuildExecutorTests().then((results) => {
        const passed = results.filter((result) => result.passed).length

        console.log("\nBuildExecutor Tests\n")
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

async function repairContextExcludesDependencies(): Promise<boolean> {
    const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), "flowro-repair-context-"))

    try {
        await fs.mkdir(path.join(workspacePath, "src"), { recursive: true })
        await fs.mkdir(path.join(workspacePath, "node_modules/big-package"), { recursive: true })
        await fs.writeFile(path.join(workspacePath, "src/App.tsx"), "export default function App() { return null }\n")
        await fs.writeFile(path.join(workspacePath, "node_modules/big-package/index.ts"), "x".repeat(1_000_000))

        const files = await readRepairContextFiles(workspacePath, ["src"], { maxBytes: 10_000, maxFiles: 5 })

        return Boolean(files["src/App.tsx"])
            && !files["node_modules/big-package/index.ts"]
            && JSON.stringify(files).length < 10_000
    } finally {
        await fs.rm(workspacePath, { recursive: true, force: true })
    }
}

async function workspaceManifestExcludesProtectedFiles(): Promise<boolean> {
    const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), "flowro-manifest-"))
    try {
        await fs.mkdir(path.join(workspacePath, "src"), { recursive: true })
        await fs.mkdir(path.join(workspacePath, "node_modules/pkg"), { recursive: true })
        await fs.writeFile(path.join(workspacePath, "src/App.tsx"), "export default function App() { return <h1>Dashboard</h1> }\n")
        await fs.writeFile(path.join(workspacePath, "src/styles.css"), "@import \"tailwindcss\";\n")
        await fs.writeFile(path.join(workspacePath, "package.json"), "{}\n")
        await fs.writeFile(path.join(workspacePath, "src/vite.config.ts"), "export default {}\n")
        await fs.writeFile(path.join(workspacePath, "node_modules/pkg/index.ts"), "export const x = 1\n")

        const manifest = await buildWorkspaceManifest(workspacePath, ["src"])
        return Boolean(manifest.files["src/App.tsx"])
            && Boolean(manifest.files["src/styles.css"])
            && !manifest.files["package.json"]
            && !manifest.files["src/vite.config.ts"]
            && !manifest.files["node_modules/pkg/index.ts"]
    } finally {
        await fs.rm(workspacePath, { recursive: true, force: true })
    }
}

async function editSearchFindsExactText(): Promise<boolean> {
    const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), "flowro-search-"))
    try {
        await fs.mkdir(path.join(workspacePath, "src"), { recursive: true })
        await fs.writeFile(path.join(workspacePath, "src/App.tsx"), [
            "export default function App() {",
            "  return <h1>Old Dashboard</h1>",
            "}",
        ].join("\n"))
        const manifest = await buildWorkspaceManifest(workspacePath, ["src"])
        const plan: EditSearchPlan = {
            editType: "UPDATE_COMPONENT",
            reasoning: "Find visible title",
            searchTerms: ["Old Dashboard"],
            fileTypesToSearch: [".tsx"],
        }
        const result = executeEditSearch(plan, manifest)
        return result.success
            && result.results[0]?.filePath === "src/App.tsx"
            && result.results[0]?.lineNumber === 2
            && result.results[0]?.contextBefore.length === 1
    } finally {
        await fs.rm(workspacePath, { recursive: true, force: true })
    }
}

async function targetSelectorChoosesSingleComponentFile(): Promise<boolean> {
    const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), "flowro-target-"))
    try {
        await fs.mkdir(path.join(workspacePath, "src/components"), { recursive: true })
        await fs.writeFile(path.join(workspacePath, "src/App.tsx"), "import Header from './components/Header'; export default function App() { return <Header /> }\n")
        await fs.writeFile(path.join(workspacePath, "src/components/Header.tsx"), "export default function Header() { return <header className=\"bg-white\">Flowro</header> }\n")
        const manifest = await buildWorkspaceManifest(workspacePath, ["src"])
        const plan: EditSearchPlan = {
            editType: "UPDATE_STYLE",
            reasoning: "Find header class",
            searchTerms: ["Header", "header"],
            fileTypesToSearch: [".tsx"],
        }
        const search = executeEditSearch(plan, manifest)
        const selection = selectTargetFiles("make the header black", plan, search.results, manifest)
        return selection.ok
            && selection.targetFiles.length === 1
            && selection.targetFiles[0] === "src/components/Header.tsx"
    } finally {
        await fs.rm(workspacePath, { recursive: true, force: true })
    }
}

async function targetedEditBlocksFeatureRequests(): Promise<boolean> {
    const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), "flowro-block-"))
    try {
        await fs.mkdir(path.join(workspacePath, "src"), { recursive: true })
        await fs.writeFile(path.join(workspacePath, "src/App.tsx"), "export default function App() { return <h1>Dashboard</h1> }\n")
        const manifest = await buildWorkspaceManifest(workspacePath, ["src"])
        const plan: EditSearchPlan = {
            editType: "ADD_FEATURE",
            reasoning: "New page request",
            searchTerms: ["settings"],
            fileTypesToSearch: [".tsx"],
        }
        const search = executeEditSearch(plan, manifest)
        const selection = selectTargetFiles("add a new settings page", plan, search.results, manifest)
        return !selection.ok && selection.reason.includes("P0 targeted edits")
    } finally {
        await fs.rm(workspacePath, { recursive: true, force: true })
    }
}

async function supabaseAuthTemplateAcceptsSyncCallbacks(): Promise<boolean> {
    const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), "flowro-auth-contract-"))
    try {
        await fs.mkdir(path.join(workspacePath, "src/lib"), { recursive: true })
        await fs.mkdir(path.join(workspacePath, "src/components"), { recursive: true })
        await fs.mkdir(path.join(workspacePath, "src/types"), { recursive: true })

        await fs.writeFile(path.join(workspacePath, "src/types/react-router-dom.d.ts"), [
            "declare module 'react-router-dom' {",
            "  export function Navigate(props: { to: string; replace?: boolean }): JSX.Element",
            "}",
        ].join("\n"))

        await fs.writeFile(path.join(workspacePath, "src/lib/auth.ts"), [
            "export type AuthChangeEvent = 'SIGNED_IN' | 'SIGNED_OUT'",
            "export type Session = { user: { id: string } }",
            "const supabase = {",
            "  auth: {",
            "    onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => Promise<void>) {",
            "      void callback('SIGNED_OUT', null)",
            "      return { data: { subscription: { unsubscribe: () => undefined } } }",
            "    },",
            "  },",
            "}",
            "type AuthStateChangeCallback = (event: AuthChangeEvent, session: Session | null) => void | Promise<void>",
            "export function onAuthStateChange(callback: AuthStateChangeCallback) {",
            "  return supabase.auth.onAuthStateChange(async (event, session) => {",
            "    await callback(event, session)",
            "  })",
            "}",
        ].join("\n"))

        const protectedRouteTemplate = await fs.readFile(
            path.join(process.cwd(), "src/lib/build-worker/authTemplates/ProtectedRoute.tsx"),
            "utf-8",
        )
        await fs.writeFile(path.join(workspacePath, "src/components/ProtectedRoute.tsx"), protectedRouteTemplate)

        const configPath = path.join(workspacePath, "tsconfig.json")
        await fs.writeFile(configPath, JSON.stringify({
            compilerOptions: {
                target: "ES2020",
                module: "NodeNext",
                moduleResolution: "NodeNext",
                jsx: "react-jsx",
                strict: true,
                esModuleInterop: true,
                skipLibCheck: true,
                baseUrl: ".",
                paths: { "@/*": ["src/*"] },
                typeRoots: [path.join(process.cwd(), "node_modules/@types"), path.join(workspacePath, "src/types")],
                types: ["react", "react-dom"],
            },
            include: ["src"],
        }, null, 2))

        const config = ts.readConfigFile(configPath, ts.sys.readFile)
        const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, workspacePath)
        const program = ts.createProgram(parsed.fileNames, parsed.options)
        const diagnostics = ts.getPreEmitDiagnostics(program)

        return diagnostics.length === 0
    } finally {
        await fs.rm(workspacePath, { recursive: true, force: true })
    }
}
