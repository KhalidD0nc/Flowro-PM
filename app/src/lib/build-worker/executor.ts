import { copyTemplate, isServerReady, readWorkspaceFiles, runCommand, startDevServer, writeWorkspaceFile, type CommandResult } from "./fs"
import {
    buildBuildManifestPrompt,
    buildBundledFileGenerationPrompt,
    buildRepairPrompt,
    type BuildManifest,
    type BuildManifestFile,
    type Stage3BuildJob,
} from "./kimiPrompt"
import { generateBuildCompletionWithModel } from "./openrouter-build"
import { buildFallbackFiles } from "./fallback"
import { registerActiveBuild, unregisterActiveBuild } from "./cancel"
import { getBuildRun, setProjectStage, updateBuildRun } from "@/lib/firebase/collections"
import type { BuildPhase, BuildRun } from "@/lib/project-plan/schema"

const BUILD_MODEL = process.env.OPENROUTER_MODEL_BUILD || "moonshotai/kimi-k2"
const MAX_MANIFEST_FILES = 10
const MAX_REPAIR_ATTEMPTS = 1
const INSTALL_TIMEOUT_MS = 180000
const BUILD_TIMEOUT_MS = 180000

class BuildCanceledError extends Error {
    constructor() {
        super("Build canceled")
        this.name = "BuildCanceledError"
    }
}

type BuildProgressInput = {
    phase?: BuildPhase
    completedFiles?: number
    totalFiles?: number
    status?: BuildRun["status"]
}

export function deriveBuildProgress(input: BuildProgressInput): number {
    if (input.status === "success") return 100
    if (input.status === "failed" || input.status === "canceled") return 100

    const phaseWeights: Record<BuildPhase, number> = {
        queued: 4,
        planning: 12,
        generating: 35,
        installing: 58,
        building: 74,
        repairing: 84,
        fallback: 82,
        preview: 94,
        completed: 100,
        failed: 100,
        canceled: 100,
    }

    if (input.phase === "generating" && input.totalFiles && input.totalFiles > 0) {
        return Math.min(55, 18 + Math.round((input.completedFiles ?? 0) / input.totalFiles * 37))
    }

    return phaseWeights[input.phase ?? "queued"]
}

export function isEditablePath(filePath: string, editablePaths: string[]): boolean {
    if (!filePath || filePath.startsWith("/") || filePath.includes("..")) return false
    return editablePaths.some((editablePath) => filePath === editablePath || filePath.startsWith(`${editablePath}/`))
}

export function parseBundledFiles(response: string, editablePaths: string[]): Record<string, string> {
    const files: Record<string, string> = {}
    const fileBlockRegex = /<<<FILE:([^\n>]+)>>>\s*([\s\S]*?)\s*<<<END_FILE>>>/g
    let match: RegExpExecArray | null

    while ((match = fileBlockRegex.exec(response)) !== null) {
        const filePath = match[1].trim()
        if (!isEditablePath(filePath, editablePaths)) {
            throw new Error(`Generated file is outside editable paths: ${filePath}`)
        }
        files[filePath] = stripMarkdownCodeBlocks(match[2])
    }

    if (Object.keys(files).length === 0) {
        throw new Error("No marker-delimited files found in build response")
    }

    return files
}

export async function executeBuildRun(
    projectId: string,
    runId: string,
    job: Stage3BuildJob
): Promise<void> {
    const logs: string[] = []
    const steps: string[] = []
    const commandsRun: BuildRun["commandsRun"] = []
    const generatedFiles: string[] = []
    const startedAtMs = Date.now()
    const startedAt = new Date(startedAtMs).toISOString()
    const controller = registerActiveBuild(runId)
    let fallbackUsed = false

    function elapsedMs() {
        return Date.now() - startedAtMs
    }

    async function updateProgress(updates: Partial<BuildRun>): Promise<void> {
        await updateBuildRun(projectId, runId, {
            elapsedMs: elapsedMs(),
            ...updates,
        })
    }

    async function appendLog(line: string): Promise<void> {
        logs.push(line)
        console.log(`[build-run ${runId}] ${line}`)
        await updateProgress({ logs: [...logs] })
    }

    async function appendStep(step: string): Promise<void> {
        steps.push(step)
        await updateProgress({ steps: [...steps], currentAction: step })
    }

    async function appendCommand(command: string, result: CommandResult): Promise<void> {
        commandsRun.push({
            command,
            status: result.exitCode === 0 ? "success" : "failed",
            summary: result.exitCode === 0
                ? "Completed successfully"
                : `Failed with exit code ${result.exitCode}: ${result.stderr.slice(0, 200)}`,
            stdout: result.stdout.slice(0, 5000),
            stderr: result.stderr.slice(0, 5000),
        })
        await updateProgress({ commandsRun: [...commandsRun] })
    }

    async function checkCanceled(): Promise<void> {
        if (controller.signal.aborted) throw new BuildCanceledError()
        const currentRun = await getBuildRun(projectId, runId)
        if (currentRun?.status === "canceled") {
            controller.abort()
            throw new BuildCanceledError()
        }
    }

    async function writeFiles(files: Record<string, string>, source: "ai" | "fallback"): Promise<void> {
        const entries = Object.entries(files)
        await updateProgress({
            totalFiles: entries.length,
            completedFiles: 0,
            fallbackUsed,
        })

        for (let index = 0; index < entries.length; index++) {
            await checkCanceled()
            const [filePath, content] = entries[index]
            await updateProgress({ currentFile: filePath, completedFiles: index })
            await writeWorkspaceFile(job.targetWorkspacePath, filePath, content)
            if (!generatedFiles.includes(filePath)) generatedFiles.push(filePath)
            await appendLog(`Written ${filePath} (${content.length} chars, ${source})`)
            await updateProgress({ filesChanged: [...generatedFiles], completedFiles: index + 1 })
        }
    }

    try {
        await updateProgress({
            status: "running",
            agentStatus: "building",
            phase: "queued",
            startedAt,
            currentAction: "Preparing workspace",
            fallbackUsed: false,
        })

        await appendStep("Copying template to workspace")
        await appendLog(`Copying template ${job.templateManifest.id} to ${job.targetWorkspacePath}`)
        await copyTemplate(job.templateManifest.id, job.targetWorkspacePath)
        await appendLog("Template copied successfully")
        await checkCanceled()

        await updateProgress({ phase: "planning", currentAction: "Planning file manifest" })
        await appendStep("Planning core app files")
        const manifest = await createBuildManifest(job, controller.signal, appendLog)
        await appendLog(`Manifest ready: ${manifest.files.length} files`)

        await updateProgress({
            phase: "generating",
            currentAction: "Generating bundled app files",
            totalFiles: manifest.files.length,
            completedFiles: 0,
        })

        try {
            const bundledResponse = await generateBuildCompletionWithModel(
                {
                    messages: [{ role: "user", content: buildBundledFileGenerationPrompt(manifest, job) }],
                    maxTokens: 14000,
                    timeoutMs: 90000,
                    maxRetries: 1,
                    signal: controller.signal,
                },
                BUILD_MODEL
            )
            const bundledFiles = parseBundledFiles(bundledResponse, job.editablePaths)
            await writeFiles(bundledFiles, "ai")
        } catch (generationError) {
            fallbackUsed = true
            await updateProgress({ phase: "fallback", fallbackUsed: true, currentAction: "AI generation stalled; using deterministic fallback" })
            await appendLog(`AI generation degraded: ${generationError instanceof Error ? generationError.message : String(generationError)}`)
            await writeFiles(buildFallbackFiles(job), "fallback")
        }

        await checkCanceled()
        await updateProgress({ phase: "installing", currentAction: "Installing dependencies" })
        await appendStep("Installing dependencies")
        await appendLog(`Executing: npm install --no-audit --no-fund (timeout ${INSTALL_TIMEOUT_MS / 1000}s)`)
        const installResult = await runCommand(job.targetWorkspacePath, "npm install --no-audit --no-fund", INSTALL_TIMEOUT_MS, controller.signal)
        await appendCommand("npm install --no-audit --no-fund", installResult)

        if (installResult.exitCode !== 0) {
            await finalizeBuild("failed", "npm install failed", logs, steps, commandsRun, projectId, runId, startedAtMs, null, fallbackUsed)
            return
        }

        await checkCanceled()
        await updateProgress({ phase: "building", currentAction: "Compiling generated app" })
        await appendStep("Running production build")
        await appendLog(`Executing: npm run build (timeout ${BUILD_TIMEOUT_MS / 1000}s)`)
        let buildResult = await runCommand(job.targetWorkspacePath, "npm run build", BUILD_TIMEOUT_MS, controller.signal)
        await appendCommand("npm run build", buildResult)

        let repairAttempts = 0
        while (buildResult.exitCode !== 0 && repairAttempts < MAX_REPAIR_ATTEMPTS && !fallbackUsed) {
            repairAttempts++
            await checkCanceled()
            await updateProgress({ phase: "repairing", currentAction: `Repairing build errors (${repairAttempts}/${MAX_REPAIR_ATTEMPTS})` })
            await appendStep(`Repairing build errors (${repairAttempts}/${MAX_REPAIR_ATTEMPTS})`)
            await appendLog(`Build error: ${buildResult.stderr.slice(0, 500)}`)

            try {
                const workspaceFiles = await readWorkspaceFiles(job.targetWorkspacePath)
                const repairResponse = await generateBuildCompletionWithModel(
                    {
                        messages: [{ role: "user", content: buildRepairPrompt(buildResult.stderr, workspaceFiles) }],
                        maxTokens: 9000,
                        timeoutMs: 60000,
                        maxRetries: 0,
                        signal: controller.signal,
                    },
                    BUILD_MODEL
                )
                const repairPlan = extractJsonFromResponse(repairResponse) as { files?: Array<{ path: string; content: string }> }
                const repairFiles = Object.fromEntries((repairPlan.files ?? [])
                    .filter((file) => isEditablePath(file.path, job.editablePaths))
                    .map((file) => [file.path, file.content]))

                if (Object.keys(repairFiles).length > 0) {
                    await writeFiles(repairFiles, "ai")
                }

                buildResult = await runCommand(job.targetWorkspacePath, "npm run build", BUILD_TIMEOUT_MS, controller.signal)
                await appendCommand("npm run build (retry)", buildResult)
            } catch (repairError) {
                await appendLog(`Repair attempt failed: ${repairError instanceof Error ? repairError.message : String(repairError)}`)
                break
            }
        }

        if (buildResult.exitCode !== 0 && !fallbackUsed) {
            fallbackUsed = true
            await updateProgress({ phase: "fallback", fallbackUsed: true, currentAction: "Repair failed; switching to deterministic fallback" })
            await appendStep("Switching to deterministic fallback")
            await writeFiles(buildFallbackFiles(job), "fallback")
            buildResult = await runCommand(job.targetWorkspacePath, "npm run build", BUILD_TIMEOUT_MS, controller.signal)
            await appendCommand("npm run build (fallback)", buildResult)
        }

        if (buildResult.exitCode !== 0) {
            await finalizeBuild("failed", fallbackUsed ? "Fallback build failed" : "Build failed", logs, steps, commandsRun, projectId, runId, startedAtMs, null, fallbackUsed)
            return
        }

        await checkCanceled()
        await updateProgress({ phase: "preview", currentAction: "Starting preview server" })
        await appendStep("Starting preview server")
        const previewUrl = startDevServer(job.targetWorkspacePath, projectId, 3001)
        await appendLog(`Dev server started at ${previewUrl}`)
        const ready = await isServerReady(previewUrl, 30000, 500)
        await appendLog(ready ? "Preview server is ready" : "Preview server did not become ready in time")

        await finalizeBuild(
            "success",
            ready ? "Build completed and preview server is running" : "Build completed but preview server is not responding",
            logs,
            steps,
            commandsRun,
            projectId,
            runId,
            startedAtMs,
            previewUrl,
            fallbackUsed,
        )
    } catch (error) {
        if (error instanceof BuildCanceledError || controller.signal.aborted) {
            await finalizeBuild("canceled", "Build canceled by user", logs, steps, commandsRun, projectId, runId, startedAtMs, null, fallbackUsed)
        } else {
            const message = error instanceof Error ? error.message : "Unknown build error"
            await appendLog(`Fatal error: ${message}`)
            await finalizeBuild("failed", message, logs, steps, commandsRun, projectId, runId, startedAtMs, null, fallbackUsed)
        }
    } finally {
        unregisterActiveBuild(runId)
    }
}

async function createBuildManifest(
    job: Stage3BuildJob,
    signal: AbortSignal,
    appendLog: (line: string) => Promise<void>,
): Promise<BuildManifest> {
    const fallbackManifest = createDeterministicManifest(job)

    try {
        const response = await generateBuildCompletionWithModel(
            {
                messages: [{ role: "user", content: buildBuildManifestPrompt(job) }],
                maxTokens: 2000,
                timeoutMs: 45000,
                maxRetries: 0,
                signal,
            },
            BUILD_MODEL
        )
        const parsed = extractJsonFromResponse(response) as Partial<BuildManifest>
        const files = (parsed.files ?? [])
            .filter((file): file is BuildManifestFile => Boolean(file?.path && file.reason))
            .filter((file) => isEditablePath(file.path, job.editablePaths))
            .slice(0, MAX_MANIFEST_FILES)

        if (files.length === 0) throw new Error("Manifest did not include editable files")
        return { summary: parsed.summary || "AI-selected core files", files }
    } catch (error) {
        await appendLog(`Manifest planning degraded: ${error instanceof Error ? error.message : String(error)}`)
        return fallbackManifest
    }
}

function createDeterministicManifest(job: Stage3BuildJob): BuildManifest {
    const routeFiles = job.projectPlan.routes
        .slice(0, 5)
        .map((route) => route.path === "/" ? "src/app/page.tsx" : `src/app${route.path}/page.tsx`)
        .map((filePath) => filePath.replace(/\/+/g, "/"))
        .filter((filePath) => isEditablePath(filePath, job.editablePaths))

    const files = Array.from(new Set([
        "src/app/layout.tsx",
        "src/app/page.tsx",
        "src/app/globals.css",
        "src/lib/mock-data.ts",
        ...routeFiles,
    ])).slice(0, MAX_MANIFEST_FILES)

    return {
        summary: "Deterministic manifest for core app shell and primary routes",
        files: files.map((filePath) => ({ path: filePath, reason: "Core generated app file" })),
    }
}

async function finalizeBuild(
    status: "success" | "failed" | "canceled",
    summary: string,
    logs: string[],
    steps: string[],
    commandsRun: BuildRun["commandsRun"],
    projectId: string,
    runId: string,
    startedAtMs: number,
    previewUrl: string | null,
    fallbackUsed: boolean,
): Promise<void> {
    const finishedAt = new Date().toISOString()
    const phase: BuildPhase = status === "success" ? "completed" : status

    await updateBuildRun(projectId, runId, {
        status,
        phase,
        agentStatus: status === "success" ? "completed" : "blocked",
        steps: [...steps, summary],
        logs: [...logs, `[build-worker] ${summary}`],
        commandsRun,
        previewUrl,
        previewAvailable: status === "success" && previewUrl !== null,
        fallbackUsed,
        finishedAt,
        elapsedMs: Date.now() - startedAtMs,
        currentAction: summary,
        currentFile: undefined,
    })

    if (status === "success") {
        await setProjectStage(projectId, "preview_ready")
    } else if (status === "failed") {
        await setProjectStage(projectId, "failed")
    }

    console.log(`[build-run ${runId}] Finalized: ${status} - ${summary}`)
}

/**
 * Extract JSON object from an LLM response that may be wrapped in markdown.
 */
export function extractJsonFromResponse(response: string): unknown {
    const trimmed = response.trim()

    if (trimmed.startsWith("{")) {
        try {
            return JSON.parse(trimmed)
        } catch {
            // fall through
        }
    }

    const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlockMatch) {
        return JSON.parse(codeBlockMatch[1].trim())
    }

    const firstBrace = trimmed.indexOf("{")
    const lastBrace = trimmed.lastIndexOf("}")
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1))
    }

    throw new Error("Could not extract JSON from response")
}

export function stripMarkdownCodeBlocks(content: string): string {
    const trimmed = content.trim()
    const codeBlockMatch = trimmed.match(/^```(?:\w+)?\s*\n?([\s\S]*?)```$/)
    if (codeBlockMatch) {
        return codeBlockMatch[1].trim()
    }
    return trimmed
}
