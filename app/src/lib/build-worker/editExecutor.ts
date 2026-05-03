import { promises as fsp } from "fs"
import path from "path"
import { getBuildRun, setProjectStage, updateBuildRun } from "@/lib/firebase/collections"
import type { BuildPhase, BuildRun } from "@/lib/project-plan/schema"
import type { Stage3BuildJob } from "./agentPrompt"
import { parseBundledFiles, extractJsonFromResponse, isEditablePath } from "./executor"
import { readRepairContextFiles, runCommand, startDevServer, isServerReady, writeWorkspaceFile, type CommandResult } from "./fs"
import { buildWorkspaceManifest } from "./manifest"
import {
    createDeterministicSearchPlan,
    executeEditSearch,
    selectTargetFiles,
    type EditSearchPlan,
} from "./editSearch"
import { buildEditSearchPlanPrompt, buildTargetedEditPrompt, buildTargetedEditRepairPrompt } from "./editPrompt"
import { generateBuildCompletionWithFallback, generateBuildCompletionWithModel } from "./openrouter-build"
import { detectPackagesFromFiles, normalizeGeneratedFilesForVite, validateVitePreview } from "./vite"
import { registerActiveBuild, unregisterActiveBuild } from "./cancel"

const BUILD_MODEL = process.env.OPENROUTER_MODEL_BUILD || "moonshotai/kimi-k2.6"
const BUILD_TIMEOUT_MS = 180000
const INSTALL_TIMEOUT_MS = 180000
const PREVIEW_READY_TIMEOUT_MS = 30000
const MAX_EDIT_REPAIR_ATTEMPTS = 1

class BuildCanceledError extends Error {
    constructor() {
        super("Edit canceled")
        this.name = "BuildCanceledError"
    }
}

export function filterFilesToTargetSet(
    files: Record<string, string>,
    targetFiles: string[],
    editablePaths: string[],
): Record<string, string> {
    const allowedTargets = new Set(targetFiles)
    const filtered: Record<string, string> = {}
    for (const [filePath, content] of Object.entries(files)) {
        if (!allowedTargets.has(filePath)) {
            throw new Error(`Targeted edit attempted to write an unselected file: ${filePath}`)
        }
        if (!isEditablePath(filePath, editablePaths)) {
            throw new Error(`Targeted edit attempted to write outside editable paths: ${filePath}`)
        }
        filtered[filePath] = content
    }
    return filtered
}

export async function executeEditRun(
    projectId: string,
    runId: string,
    job: Stage3BuildJob,
    instruction: string,
): Promise<void> {
    const logs: string[] = []
    const steps: string[] = []
    const commandsRun: BuildRun["commandsRun"] = []
    const filesChanged: string[] = []
    const startedAtMs = Date.now()
    const startedAt = new Date(startedAtMs).toISOString()
    const controller = registerActiveBuild(runId)
    const initialRun = await getBuildRun(projectId, runId)
    let previewUrl: string | null = initialRun?.previewUrl ?? null

    function elapsedMs() {
        return Date.now() - startedAtMs
    }

    async function updateProgress(updates: Partial<BuildRun>): Promise<void> {
        await updateBuildRun(projectId, runId, {
            elapsedMs: elapsedMs(),
            buildContractSnapshot: job.buildContract,
            ...updates,
        })
    }

    async function appendLog(line: string): Promise<void> {
        logs.push(line)
        process.stdout.write(`[edit-run ${runId}] ${line}\n`)
        await updateProgress({ logs: [...logs] })
    }

    async function appendStep(step: string): Promise<void> {
        steps.push(step)
        await updateProgress({ steps: [...steps], currentAction: step })
    }

    async function appendCommand(command: string, result: CommandResult): Promise<void> {
        const combinedOutput = `${result.stderr}\n${result.stdout}`.trim()
        commandsRun.push({
            command,
            status: result.exitCode === 0 ? "success" : "failed",
            summary: result.exitCode === 0
                ? "Completed successfully"
                : `Failed with exit code ${result.exitCode}: ${summarizeCommandOutput(combinedOutput)}`,
            stdout: result.stdout.slice(0, 10000),
            stderr: result.stderr.slice(0, 10000),
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

    async function writeTargetFiles(files: Record<string, string>, targetFiles: string[]): Promise<Record<string, string>> {
        const filtered = filterFilesToTargetSet(files, targetFiles, job.editablePaths)
        const normalized = normalizeGeneratedFilesForVite(filtered)
        if (normalized.skippedFiles.length > 0) {
            throw new Error(`Targeted edit produced protected or invalid files: ${normalized.skippedFiles.join(", ")}`)
        }

        const normalizedPaths = Object.keys(normalized.files)
        for (const filePath of normalizedPaths) {
            if (!targetFiles.includes(filePath)) {
                throw new Error(`Targeted edit normalized to an unselected file: ${filePath}`)
            }
        }

        await updateProgress({ totalFiles: normalizedPaths.length, completedFiles: 0 })

        for (let index = 0; index < normalizedPaths.length; index++) {
            await checkCanceled()
            const filePath = normalizedPaths[index]
            await updateProgress({ currentFile: filePath, completedFiles: index })
            await writeWorkspaceFile(job.targetWorkspacePath, filePath, normalized.files[filePath])
            filesChanged.push(filePath)
            await appendLog(`Updated ${filePath} (${normalized.files[filePath].length} chars)`)
            await updateProgress({ filesChanged: [...filesChanged], completedFiles: index + 1 })
        }

        return normalized.files
    }

    try {
        await updateProgress({
            status: "running",
            agentStatus: "building",
            phase: "queued",
            startedAt,
            currentAction: "Preparing targeted edit",
            runType: "edit",
            editInstruction: instruction,
            fallbackUsed: false,
        })

        await appendStep("Building workspace manifest")
        await updateProgress({ phase: "planning", currentAction: "Inspecting generated workspace" })
        const workspaceExists = await pathExists(job.targetWorkspacePath)
        if (!workspaceExists) {
            throw new Error("Generated app workspace does not exist. Start a build before applying targeted edits.")
        }

        const manifest = await buildWorkspaceManifest(job.targetWorkspacePath, job.editablePaths)
        await appendLog(`Manifest built with ${Object.keys(manifest.files).length} editable file(s)`)
        if (Object.keys(manifest.files).length === 0) {
            throw new Error("No editable generated app files found.")
        }

        await checkCanceled()
        await appendStep("Planning edit search")
        let searchPlan: EditSearchPlan
        try {
            const { content, model } = await generateBuildCompletionWithFallback({
                messages: [{ role: "user", content: buildEditSearchPlanPrompt(instruction, manifest) }],
                maxTokens: 50000,
                timeoutMs: 120000,
                maxRetries: 0,
                signal: controller.signal,
            })
            searchPlan = normalizeSearchPlan(extractJsonFromResponse(content) as Partial<EditSearchPlan>, instruction, manifest)
            await appendLog(`Search plan created with model ${model}: ${searchPlan.editType} (${searchPlan.searchTerms.join(", ") || "no direct terms"})`)
        } catch (error) {
            searchPlan = createDeterministicSearchPlan(instruction, manifest)
            await appendLog(`Search planning degraded to deterministic plan: ${error instanceof Error ? error.message : String(error)}`)
        }

        const searchExecution = executeEditSearch(searchPlan, manifest)
        await appendLog(`Search executed: ${searchExecution.results.length} result(s), ${searchExecution.filesSearched} file scan(s)${searchExecution.usedFallback ? ", fallback terms used" : ""}`)
        const targetSelection = selectTargetFiles(instruction, searchPlan, searchExecution.results, manifest)
        if (!targetSelection.ok) {
            throw new Error(targetSelection.reason)
        }

        const targetFiles = targetSelection.targetFiles
        await appendLog(`Selected target file: ${targetFiles.join(", ")} (${targetSelection.reason})`)
        await updateProgress({ totalFiles: targetFiles.length, completedFiles: 0 })

        await checkCanceled()
        await appendStep("Generating targeted file edit")
        await updateProgress({ phase: "generating", currentAction: "Generating targeted file replacement" })
        const { content: editResponse, model: editModel } = await generateBuildCompletionWithFallback({
            messages: [{
                role: "user",
                content: buildTargetedEditPrompt({
                    instruction,
                    targetFiles,
                    manifest,
                    searchPlan,
                    searchResults: searchExecution.results,
                }),
            }],
            maxTokens: 50000,
            timeoutMs: 90000,
            maxRetries: 1,
            signal: controller.signal,
        })
        await appendLog(`Targeted edit generation succeeded with model: ${editModel}`)

        const parsedFiles = parseBundledFiles(editResponse, job.editablePaths)
        const writtenFiles = await writeTargetFiles(parsedFiles, targetFiles)

        await updateProgress({ phase: "installing", currentAction: "Checking dependencies after edit" })
        const editableContext = await readRepairContextFiles(job.targetWorkspacePath, job.editablePaths)
        const detectedPackages = detectPackagesFromFiles(editableContext)
        await updateProgress({ detectedPackages })
        if (detectedPackages.length > 0) {
            await appendStep("Installing detected packages")
            const packageInstallCommand = `npm install --no-audit --no-fund ${detectedPackages.join(" ")}`
            const packageInstallResult = await runCommand(job.targetWorkspacePath, packageInstallCommand, INSTALL_TIMEOUT_MS, controller.signal)
            await appendCommand(packageInstallCommand, packageInstallResult)
            if (packageInstallResult.exitCode === 0) await updateProgress({ installedPackages: detectedPackages })
        } else {
            await appendLog("No additional packages detected from targeted edit")
        }

        await checkCanceled()
        await appendStep("Validating edited preview")
        await updateProgress({ phase: "preview", currentAction: "Validating Vite preview after edit" })
        previewUrl = startDevServer(job.targetWorkspacePath, projectId, getPreviewPort(projectId))
        await appendLog(`Dev server readying at ${previewUrl}`)
        let validation = await validateCurrentPreview(previewUrl)
        if (validation.success) {
            const diagnosticBuild = await runCommand(job.targetWorkspacePath, "npm run build", BUILD_TIMEOUT_MS, controller.signal, { env: { NODE_ENV: "production" } })
            await appendCommand("npm run build (edit diagnostic)", diagnosticBuild)
            if (diagnosticBuild.exitCode !== 0) {
                validation = {
                    success: false,
                    errors: [`Vite diagnostic build failed: ${summarizeCommandOutput(`${diagnosticBuild.stderr}\n${diagnosticBuild.stdout}`)}`],
                    warnings: validation.warnings,
                }
            }
        }

        let repairAttempts = 0
        while (!validation.success && repairAttempts < MAX_EDIT_REPAIR_ATTEMPTS) {
            repairAttempts++
            await updateProgress({ repairAttempts, phase: "repairing", currentAction: `Repairing targeted edit (${repairAttempts}/${MAX_EDIT_REPAIR_ATTEMPTS})` })
            await appendStep(`Repairing targeted edit (${repairAttempts}/${MAX_EDIT_REPAIR_ATTEMPTS})`)
            const targetContents = await readTargetFiles(job.targetWorkspacePath, targetFiles)
            const repairResponse = await generateBuildCompletionWithModel({
                messages: [{ role: "user", content: buildTargetedEditRepairPrompt({
                    buildError: validation.errors.join("\n"),
                    instruction,
                    targetFiles: targetContents,
                }) }],
                maxTokens: 50000,
                timeoutMs: 120000,
                maxRetries: 1,
                signal: controller.signal,
            }, BUILD_MODEL)
            const repairPlan = extractJsonFromResponse(repairResponse) as { files?: Array<{ path: string; content: string }> }
            const repairFiles = Object.fromEntries((repairPlan.files ?? [])
                .filter((file) => targetFiles.includes(file.path))
                .map((file) => [file.path, file.content]))
            if (Object.keys(repairFiles).length === 0) {
                await appendLog("Repair returned no target files")
                break
            }
            await writeTargetFiles(repairFiles, targetFiles)
            previewUrl = startDevServer(job.targetWorkspacePath, projectId, getPreviewPort(projectId))
            validation = await validateCurrentPreview(previewUrl)
            if (validation.success) {
                const diagnosticBuild = await runCommand(job.targetWorkspacePath, "npm run build", BUILD_TIMEOUT_MS, controller.signal, { env: { NODE_ENV: "production" } })
                await appendCommand("npm run build (edit repair diagnostic)", diagnosticBuild)
                if (diagnosticBuild.exitCode !== 0) {
                    validation = {
                        success: false,
                        errors: [`Vite diagnostic build failed after repair: ${summarizeCommandOutput(`${diagnosticBuild.stderr}\n${diagnosticBuild.stdout}`)}`],
                        warnings: validation.warnings,
                    }
                }
            }
        }

        await appendLog(validation.success ? "Targeted edit preview validation passed" : `Targeted edit validation failed: ${validation.errors.join("; ")}`)
        if (!validation.success) {
            await updateProgress({ validationErrors: validation.errors })
            await finalizeEditRun("failed", "Targeted edit validation failed", projectId, runId, startedAtMs, logs, steps, commandsRun, previewUrl, false)
            return
        }

        await updateProgress({ validationErrors: [], filesChanged: Object.keys(writtenFiles) })
        await finalizeEditRun("success", "Targeted edit applied and preview validated", projectId, runId, startedAtMs, logs, steps, commandsRun, previewUrl, false)
    } catch (error) {
        if (error instanceof BuildCanceledError || controller.signal.aborted) {
            await finalizeEditRun("canceled", "Targeted edit canceled by user", projectId, runId, startedAtMs, logs, steps, commandsRun, previewUrl, false)
        } else {
            const message = error instanceof Error ? error.message : "Unknown targeted edit error"
            await appendLog(`Fatal edit error: ${message}`)
            await finalizeEditRun("failed", message, projectId, runId, startedAtMs, logs, steps, commandsRun, previewUrl, await hasWorkingPreview(previewUrl))
        }
    } finally {
        unregisterActiveBuild(runId)
    }
}

function normalizeSearchPlan(input: Partial<EditSearchPlan>, instruction: string, manifest: Awaited<ReturnType<typeof buildWorkspaceManifest>>): EditSearchPlan {
    const fallback = createDeterministicSearchPlan(instruction, manifest)
    const editTypes = new Set(["UPDATE_COMPONENT", "UPDATE_STYLE", "FIX_ISSUE", "REMOVE_ELEMENT", "ADD_FEATURE", "ADD_DEPENDENCY", "REFACTOR"])
    return {
        editType: input.editType && editTypes.has(input.editType) ? input.editType : fallback.editType,
        reasoning: input.reasoning || fallback.reasoning,
        searchTerms: Array.isArray(input.searchTerms) ? input.searchTerms.filter((term): term is string => typeof term === "string") : fallback.searchTerms,
        regexPatterns: Array.isArray(input.regexPatterns) ? input.regexPatterns.filter((pattern): pattern is string => typeof pattern === "string") : fallback.regexPatterns,
        fileTypesToSearch: Array.isArray(input.fileTypesToSearch) ? input.fileTypesToSearch.filter((ext): ext is string => typeof ext === "string") : fallback.fileTypesToSearch,
        fallbackSearch: input.fallbackSearch || fallback.fallbackSearch,
    }
}

async function validateCurrentPreview(previewUrl: string) {
    const ready = await isServerReady(previewUrl, PREVIEW_READY_TIMEOUT_MS, 500)
    return ready
        ? validateVitePreview(previewUrl)
        : { success: false, errors: ["Preview server did not become ready in time"], warnings: [] }
}

async function readTargetFiles(workspacePath: string, targetFiles: string[]): Promise<Record<string, string>> {
    const files: Record<string, string> = {}
    for (const filePath of targetFiles) {
        files[filePath] = await fsp.readFile(path.join(workspacePath, filePath), "utf-8")
    }
    return files
}

async function pathExists(filePath: string): Promise<boolean> {
    try {
        await fsp.access(filePath)
        return true
    } catch {
        return false
    }
}

async function hasWorkingPreview(previewUrl: string | null): Promise<boolean> {
    if (!previewUrl) return false
    const validation = await validateCurrentPreview(previewUrl)
    return validation.success
}

function getPreviewPort(projectId: string): number {
    let hash = 0
    for (let index = 0; index < projectId.length; index++) {
        hash = ((hash << 5) - hash) + projectId.charCodeAt(index)
        hash |= 0
    }
    return 3001 + Math.abs(hash % 1000)
}

function summarizeCommandOutput(output: string): string {
    const cleaned = output
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .filter((line) => !line.includes("non-standard \"NODE_ENV\" value"))
        .join(" ")
    return (cleaned || "No command output captured").slice(0, 300)
}

async function finalizeEditRun(
    status: "success" | "failed" | "canceled",
    summary: string,
    projectId: string,
    runId: string,
    startedAtMs: number,
    logs: string[],
    steps: string[],
    commandsRun: BuildRun["commandsRun"],
    previewUrl: string | null,
    keepExistingPreviewOnFailure: boolean,
): Promise<void> {
    const finishedAt = new Date().toISOString()
    const phase: BuildPhase = status === "success" ? "completed" : status
    const verificationResults = commandsRun.map((command) => ({
        check: command.command,
        status: command.status === "success" ? "passed" as const : "failed" as const,
        notes: command.summary,
    }))

    await updateBuildRun(projectId, runId, {
        status,
        phase,
        agentStatus: status === "success" ? "completed" : "blocked",
        steps: [...steps, summary],
        logs: [...logs, `[build-worker] ${summary}`],
        commandsRun,
        previewUrl,
        previewAvailable: (status === "success" || keepExistingPreviewOnFailure) && previewUrl !== null,
        verificationResults,
        finishedAt,
        elapsedMs: Date.now() - startedAtMs,
        currentAction: summary,
        currentFile: undefined,
        runType: "edit",
    })

    if (status === "success" || keepExistingPreviewOnFailure) {
        await setProjectStage(projectId, "preview_ready")
    } else if (status === "failed") {
        await setProjectStage(projectId, "failed")
    }
}
