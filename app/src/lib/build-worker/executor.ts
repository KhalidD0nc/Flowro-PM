import { promises as fsp } from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { copyTemplate, getPreviewPort, isServerReady, readRepairContextFiles, runCommand, startDevServer, writeWorkspaceFile, type CommandResult } from "./fs"
import {
    buildBuildManifestPrompt,
    buildBundledFileGenerationPrompt,
    buildFileGenerationPrompt,
    buildFormatRetryPrompt,
    buildRepairPrompt,
    type BuildManifest,
    type BuildManifestFile,
    type BuildJob,
} from "./agentPrompt"
import { generateBuildCompletionWithFallback, generateBuildCompletionWithModel } from "./openrouter-build"
import { buildFallbackFiles } from "./fallback"
import { generateDesignSystem, type DesignSystemSpec } from "./designAgent"
import { buildMissingImportStubs, detectPackagesFromFiles, normalizeGeneratedFilesForVite, validateImportCoherence, validateVitePreview } from "./vite"
import { registerActiveBuild, unregisterActiveBuild } from "./cancel"
import { getBuildRun, setProjectStage, updateBuildRun } from "@/lib/firebase/collections"
import type { BuildPhase, BuildRun } from "@/lib/project-plan/schema"
import { provisionSupabase, SupabaseProvisioningError } from "./supabaseProvisioner"
import type { SupabaseContext } from "./agentPrompt"

const BUILD_MODEL = process.env.OPENROUTER_MODEL_BUILD || "moonshotai/kimi-k2.6"
const REPAIR_MODEL = process.env.OPENROUTER_MODEL_REPAIR || "openai/gpt-5.5"
const MAX_MANIFEST_FILES = 10
const MAX_REPAIR_ATTEMPTS = 2
const MAX_FORMAT_RETRIES = 2
const INSTALL_TIMEOUT_MS = 180000
const BUILD_TIMEOUT_MS = 180000
const PREVIEW_READY_TIMEOUT_MS = 30000
const SUPABASE_TEMPLATE_OWNED_FILES = new Set([
    "src/components/ProtectedRoute.tsx",
    "src/pages/LoginPage.tsx",
    "src/pages/SignupPage.tsx",
    "src/pages/PasswordResetPage.tsx",
    "src/lib/auth.ts",
    "src/lib/supabase.ts",
    "src/lib/supabase-helpers.ts",
])
const SUPABASE_TEMPLATE_REPAIR_BLOCKED_PREFIX = "Supabase template-owned file failed typecheck; repair cannot edit it:"

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
        provisioning: 20,
        schema_gen: 27,
        generating: 42,
        installing: 62,
        building: 76,
        repairing: 86,
        fallback: 84,
        preview: 95,
        completed: 100,
        failed: 100,
        canceled: 100,
    }

    if (input.phase === "generating" && input.totalFiles && input.totalFiles > 0) {
        return Math.min(55, 18 + Math.round((input.completedFiles ?? 0) / input.totalFiles * 37))
    }

    return phaseWeights[input.phase ?? "queued"]
}

export function summarizeSupabaseTemplateOwnedTypecheckFailure(output: string): string | null {
    const normalizedOutput = output.replace(/\\/g, "/")
    const matchingFiles = Array.from(SUPABASE_TEMPLATE_OWNED_FILES)
        .filter((filePath) => normalizedOutput.includes(filePath))

    if (matchingFiles.length === 0) return null

    return `${SUPABASE_TEMPLATE_REPAIR_BLOCKED_PREFIX} ${matchingFiles.join(", ")}. Fix the deterministic Supabase auth/template source before rerunning the build.`
}

function isSupabaseTemplateOwnedValidationFailure(validation: { errors: string[] }): boolean {
    return validation.errors.some((error) => error.startsWith(SUPABASE_TEMPLATE_REPAIR_BLOCKED_PREFIX))
}

export function isEditablePath(filePath: string, editablePaths: string[]): boolean {
    if (!filePath || filePath.startsWith("/") || filePath.includes("..")) return false
    return editablePaths.some((editablePath) => filePath === editablePath || filePath.startsWith(`${editablePath}/`))
}

export function parseBundledFiles(response: string, editablePaths: string[]): Record<string, string> {
    const fileMap = new Map<string, { content: string; isComplete: boolean; length: number }>()

    // Helper to decide if content looks truncated (ellipsis not in spread syntax)
    function isLikelyTruncated(content: string): boolean {
        return content.includes("...") && !content.includes("...props") && !content.includes("...rest") && !content.includes("...args")
    }

    // Helper to store a file, preferring complete/longer versions
    function storeFile(filePath: string, content: string, isComplete: boolean) {
        if (filePath.startsWith("/") || filePath.includes("..")) {
            throw new Error(`Generated file is outside editable paths: ${filePath}`)
        }
        if (!isEditablePath(filePath, editablePaths)) {
            throw new Error(`Generated file is outside editable paths: ${filePath}`)
        }
        const existing = fileMap.get(filePath)
        let shouldReplace = false
        if (!existing) {
            shouldReplace = true
        } else if (!existing.isComplete && isComplete) {
            shouldReplace = true // replace incomplete with complete
        } else if (existing.isComplete && isComplete && content.length > existing.length) {
            shouldReplace = true // replace with longer complete version
        } else if (!existing.isComplete && !isComplete && content.length > existing.length) {
            shouldReplace = true // both incomplete, keep longer
        }

        if (shouldReplace) {
            fileMap.set(filePath, { content: stripMarkdownCodeBlocks(content), isComplete, length: content.length })
        }
    }

    let match: RegExpExecArray | null

    // Parse <<<FILE:path>>> ... <<<END_FILE>>> blocks
    const fileBlockRegex = /<<<FILE:([^\n>]+)>>>\s*([\s\S]*?)\s*<<<END_FILE>>>/g
    while ((match = fileBlockRegex.exec(response)) !== null) {
        storeFile(match[1].trim(), match[2], true)
    }

    // Parse <file path="..."> ... </file> blocks
    const xmlFileRegex = /<file\s+path=["']([^"']+)["']>\s*([\s\S]*?)(?:<\/file>|$)/g
    while ((match = xmlFileRegex.exec(response)) !== null) {
        const hasClosingTag = response.substring(match.index, match.index + match[0].length).includes("</file>")
        storeFile(match[1].trim(), match[2], hasClosingTag)
    }

    // Parse markdown code blocks with file paths like ```file path="..."
    const markdownFileRegex = /```(?:file )?path="([^"]+)"\n([\s\S]*?)```/g
    while ((match = markdownFileRegex.exec(response)) !== null) {
        storeFile(match[1].trim(), match[2], true)
    }

    if (fileMap.size === 0) {
        throw new Error("No marker-delimited files found in build response")
    }

    // Build final record and warn about incomplete/truncated files
    const files: Record<string, string> = {}
    const entries = Array.from(fileMap.entries())
    for (const [path, { content, isComplete }] of entries) {
        if (!isComplete) {
            process.stderr.write(`[parseBundledFiles] Warning: File ${path} appears truncated (no closing tag)\n`)
        }
        if (isLikelyTruncated(content)) {
            process.stderr.write(`[parseBundledFiles] Warning: File ${path} contains ellipsis and may be truncated\n`)
        }
        files[path] = content
    }

    return files
}

export async function executeBuildRun(
    projectId: string,
    runId: string,
    job: BuildJob
): Promise<void> {
    const logs: string[] = []
    const steps: string[] = []
    const commandsRun: BuildRun["commandsRun"] = []
    const generatedFiles: string[] = []
    const startedAtMs = Date.now()
    const startedAt = new Date(startedAtMs).toISOString()
    const controller = registerActiveBuild(runId)
    let fallbackUsed = false
    const isSupabaseBuild = job.supabaseConfig?.provider === "supabase_postgres"

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
        process.stdout.write(`[build-run ${runId}] ${line}\n`)
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

    async function writeFiles(files: Record<string, string>, source: "ai" | "fallback"): Promise<Record<string, string>> {
        const normalized = normalizeGeneratedFilesForVite(files)
        if (normalized.skippedFiles.length > 0) {
            await appendLog(`Skipped protected or invalid files: ${normalized.skippedFiles.join(", ")}`)
        }

        const merged: Record<string, string> = { ...normalized.files }
        if (source === "ai" && job.supabaseConfig?.authMode === "email_only") {
            for (const filePath of Object.keys(merged)) {
                if (SUPABASE_TEMPLATE_OWNED_FILES.has(filePath)) {
                    delete merged[filePath]
                    await appendLog(`Skipped AI overwrite of Supabase template file: ${filePath}`)
                }
            }
        }

        // Auto-stub any relative import that does not resolve to a generated file.
        // This keeps tsc/Vite green when the model forgets to emit a referenced module.
        const stubs = buildMissingImportStubs(merged)
        for (const stubPath of Object.keys(stubs)) {
            try {
                await fsp.access(path.join(job.targetWorkspacePath, stubPath))
                delete stubs[stubPath]
                await appendLog(`Skipped auto-stub for existing template file: ${stubPath}`)
            } catch {
                // Missing on disk; keep the generated stub.
            }
        }

        const stubPaths = Object.keys(stubs)
        if (stubPaths.length > 0) {
            await appendLog(`Auto-stubbing ${stubPaths.length} missing import(s): ${stubPaths.join(", ")}`)
            for (const [stubPath, stubContent] of Object.entries(stubs)) {
                merged[stubPath] = stubContent
            }
        }

        const entries = Object.entries(merged)
        await updateProgress({
            totalFiles: entries.length,
            completedFiles: 0,
            fallbackUsed,
        })

        for (let index = 0; index < entries.length; index++) {
            await checkCanceled()
            const [filePath, content] = entries[index]
            const fileSource = stubs[filePath] !== undefined ? "stub" : source
            await updateProgress({ currentFile: filePath, completedFiles: index })
            await writeWorkspaceFile(job.targetWorkspacePath, filePath, content)
            if (!generatedFiles.includes(filePath)) generatedFiles.push(filePath)
            await appendLog(`Written ${filePath} (${content.length} chars, ${fileSource})`)
            await updateProgress({ filesChanged: [...generatedFiles], completedFiles: index + 1 })
        }

        const coherenceErrors = validateImportCoherence(merged)
        if (coherenceErrors.length > 0) {
            await appendLog(`Import coherence check failed after stubbing: ${coherenceErrors.join("; ")}`)
        } else {
            await appendLog("Import coherence check passed")
        }

        return merged
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

        // ── Supabase provisioning ──
        let supabaseContext: SupabaseContext | null = null
        if (isSupabaseBuild) {
            await updateProgress({ phase: "provisioning", currentAction: "Provisioning Supabase project..." })
            await appendStep("Provisioning Supabase project")
            try {
                supabaseContext = await provisionSupabase(job, appendLog)
                job.supabaseContext = supabaseContext
                await updateProgress({
                    supabaseProvision: {
                        projectId: supabaseContext.projectRef,
                        projectRef: supabaseContext.projectRef,
                        projectUrl: supabaseContext.projectUrl,
                        browserKey: supabaseContext.browserKey,
                        browserKeyType: supabaseContext.browserKeyType,
                        anonKey: supabaseContext.anonKey,
                        canonicalTables: supabaseContext.canonicalTables,
                        migrationPath: supabaseContext.migrationPath,
                        schemaSQL: supabaseContext.schemaSQL,
                        rlsPoliciesSQL: supabaseContext.rlsPoliciesSQL,
                        status: "provisioned",
                    },
                })
            } catch (error) {
                const code = error instanceof SupabaseProvisioningError ? error.code : "supabase_provision_failed"
                const message = error instanceof Error ? error.message : String(error)
                await appendLog(`${code}: ${message}`)
                await updateProgress({
                    currentAction: code,
                    supabaseProvision: {
                        status: "failed",
                        error: message,
                    },
                })
                throw error
            }
            await checkCanceled()
        }

        // ── Write deterministic auth templates before manifest planning ──
        if (job.supabaseConfig?.authMode === "email_only") {
            await appendStep("Writing auth templates")
            const authTemplateDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "authTemplates")
            const authFiles = [
                { src: "LoginPage.tsx", dest: "src/pages/LoginPage.tsx" },
                { src: "SignupPage.tsx", dest: "src/pages/SignupPage.tsx" },
                { src: "PasswordResetPage.tsx", dest: "src/pages/PasswordResetPage.tsx" },
                { src: "ProtectedRoute.tsx", dest: "src/components/ProtectedRoute.tsx" },
            ]
            for (const { src, dest } of authFiles) {
                const content = await fsp.readFile(path.join(authTemplateDir, src), "utf-8")
                await writeWorkspaceFile(job.targetWorkspacePath, dest, content)
                await appendLog(`Pre-wrote auth template: ${dest}`)
            }
            await checkCanceled()
        }

        await updateProgress({ phase: "planning", currentAction: "Generating design system" })
        await appendStep("Generating design system")
        let designSystem: DesignSystemSpec | undefined
        try {
            designSystem = await generateDesignSystem(job.projectPlan, job.buildContract, job.designArchetype ?? "saas", controller.signal)
            job.designSystem = designSystem as unknown as Record<string, unknown>
            await appendLog(`Design system generated: ${designSystem.personality}`)
            await appendLog(`Colors: primary=${designSystem.colorPalette.primary}, background=${designSystem.colorPalette.background}`)
            await appendLog(`Typography: heading=${designSystem.typography.headingFont}, density=${designSystem.spacing.density}`)
        } catch (dsError) {
            await appendLog(`Design system generation failed: ${dsError instanceof Error ? dsError.message : String(dsError)}. Using deterministic fallback.`)
        }

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

        let allFiles: Record<string, string> | null = null

        try {
            const { content: bundledResponse, model: usedModel } = await generateBuildCompletionWithFallback({
                messages: [{ role: "user", content: buildBundledFileGenerationPrompt(manifest, job) }],
                maxTokens: 40000,
                timeoutMs: 90000,
                maxRetries: 1,
                signal: controller.signal,
            })
            await appendLog(`Bundled generation succeeded with model: ${usedModel}`)
            allFiles = parseBundledFiles(bundledResponse, job.editablePaths)
            await writeFiles(allFiles, "ai")
        } catch (generationError) {
            await appendLog(`Bundled generation failed: ${generationError instanceof Error ? generationError.message : String(generationError)}`)

            // Format retries for full bundled generation
            for (let retry = 0; retry < MAX_FORMAT_RETRIES && !allFiles; retry++) {
                try {
                    await appendLog(`Format retry ${retry + 1}/${MAX_FORMAT_RETRIES}: requesting re-formatted output`)
                    const lastResponse = generationError instanceof Error ? generationError.message : String(generationError)
                    const { content: retryResponse } = await generateBuildCompletionWithFallback({
                        messages: [{ role: "user", content: buildFormatRetryPrompt(lastResponse) }],
                        maxTokens: 40000,
                        timeoutMs: 90000,
                        maxRetries: 0,
                        signal: controller.signal,
                    })
                    allFiles = parseBundledFiles(retryResponse, job.editablePaths)
                    await appendLog(`Format retry ${retry + 1} succeeded`)
                    await writeFiles(allFiles, "ai")
                } catch (retryError) {
                    await appendLog(`Format retry ${retry + 1} failed: ${retryError instanceof Error ? retryError.message : String(retryError)}`)
                }
            }

            // Hybrid generation: bundled design system + per-file pages
            if (!allFiles && manifest.files.length > 6) {
                await appendLog("Switching to hybrid generation: design system bundled, pages per-file")
                try {
                    const designSystemPaths = new Set(["src/styles.css", "src/components/ui/app-kit.tsx", "src/lib/mock-data.ts"])
                    const dsManifest: BuildManifest = {
                        summary: `${manifest.summary} (design system)`,
                        files: manifest.files.filter((f) => designSystemPaths.has(f.path)),
                    }
                    const pageManifest: BuildManifest = {
                        summary: `${manifest.summary} (pages)`,
                        files: manifest.files.filter((f) => !designSystemPaths.has(f.path)),
                    }

                    // Generate design system files bundled
                    if (dsManifest.files.length > 0) {
                        await appendLog(`Hybrid step 1: generating ${dsManifest.files.length} design system files bundled`)
                        const { content: dsResponse } = await generateBuildCompletionWithFallback({
                            messages: [{ role: "user", content: buildBundledFileGenerationPrompt(dsManifest, job) }],
                            maxTokens: 40000,
                            timeoutMs: 90000,
                            maxRetries: 1,
                            signal: controller.signal,
                        })
                        const dsFiles = parseBundledFiles(dsResponse, job.editablePaths)
                        await writeFiles(dsFiles, "ai")
                        allFiles = { ...(allFiles ?? {}), ...dsFiles }
                        await appendLog(`Design system files generated: ${Object.keys(dsFiles).join(", ")}`)
                    }

                    // Generate page files per-file
                    if (pageManifest.files.length > 0) {
                        await appendLog(`Hybrid step 2: generating ${pageManifest.files.length} page files individually`)
                        const pageFiles = await generateFilesIndividually(job, pageManifest, appendLog, controller.signal)
                        await writeFiles(pageFiles, "ai")
                        allFiles = { ...(allFiles ?? {}), ...pageFiles }
                    }
                } catch (hybridError) {
                    await appendLog(`Hybrid generation failed: ${hybridError instanceof Error ? hybridError.message : String(hybridError)}`)
                    allFiles = null
                }
            }

            // Final fallback: per-file for all files
            if (!allFiles) {
                await appendLog("All bundled generation attempts failed; trying per-file generation for all files")
                try {
                    allFiles = await generateFilesIndividually(job, manifest, appendLog, controller.signal)
                    await writeFiles(allFiles, "ai")
                } catch (perFileError) {
                    if (isSupabaseBuild) {
                        throw new Error(`Supabase app generation failed and mock fallback is disabled: ${perFileError instanceof Error ? perFileError.message : String(perFileError)}`)
                    }
                    fallbackUsed = true
                    await updateProgress({ phase: "fallback", fallbackUsed: true, currentAction: "All generation methods failed; using deterministic fallback" })
                    await appendLog(`Per-file generation failed: ${perFileError instanceof Error ? perFileError.message : String(perFileError)}`)
                    await writeFiles(buildFallbackFiles(job), "fallback")
                }
            }
        }

        await checkCanceled()

        // Safety net: if AI generation skipped App.tsx, the template placeholder
        // ("Generated app ready") survives and the user sees nothing. Force-overwrite
        // from the deterministic fallback so the preview always shows real content.
        const appTsxPath = path.join(job.targetWorkspacePath, "src/App.tsx")
        try {
            const currentApp = await fsp.readFile(appTsxPath, "utf-8")
            if (
                currentApp.includes("Generated app ready") ||
                currentApp.includes("Stage 2 worker will replace")
            ) {
                if (isSupabaseBuild) {
                    throw new Error("Supabase build left the placeholder App.tsx in place; mock fallback is disabled.")
                }
                await appendLog("Detected placeholder App.tsx after generation; overwriting from deterministic fallback")
                const fb = buildFallbackFiles(job)
                const overrides: Record<string, string> = {}
                const fallbackKeys = ["src/App.tsx", "src/components/ui/app-kit.tsx", "src/styles.css"]
                if (job.supabaseConfig?.provider !== "supabase_postgres") {
                    fallbackKeys.push("src/lib/mock-data.ts")
                }
                for (const key of fallbackKeys) {
                    if (fb[key]) overrides[key] = fb[key]
                }
                await writeFiles(overrides, "fallback")
                fallbackUsed = true
                await updateProgress({ fallbackUsed: true })
            }
        } catch {
            if (isSupabaseBuild) {
                throw new Error("Supabase build did not produce App.tsx; mock fallback is disabled.")
            }
            // App.tsx missing entirely — write fallback core files
            await appendLog("App.tsx missing after generation; writing deterministic fallback core files")
            await writeFiles(buildFallbackFiles(job), "fallback")
            fallbackUsed = true
            await updateProgress({ fallbackUsed: true })
        }

        await updateProgress({ phase: "installing", currentAction: "Installing dependencies" })
        await appendStep("Installing dependencies")
        await appendLog(`Executing: npm install --no-audit --no-fund (timeout ${INSTALL_TIMEOUT_MS / 1000}s)`)
        const installResult = await runCommand(job.targetWorkspacePath, "npm install --no-audit --no-fund", INSTALL_TIMEOUT_MS, controller.signal)
        await appendCommand("npm install --no-audit --no-fund", installResult)

        if (installResult.exitCode !== 0) {
            await finalizeBuild("failed", "npm install failed", logs, steps, commandsRun, projectId, runId, startedAtMs, null, fallbackUsed)
            return
        }

        const generatedContext = await readRepairContextFiles(job.targetWorkspacePath, job.editablePaths)
        const detectedPackages = detectPackagesFromFiles(generatedContext)
        await updateProgress({ detectedPackages })
        if (detectedPackages.length > 0) {
            await appendStep("Installing detected packages")
            await appendLog(`Detected packages: ${detectedPackages.join(", ")}`)
            const packageInstallCommand = `npm install --no-audit --no-fund ${detectedPackages.join(" ")}`
            const packageInstallResult = await runCommand(job.targetWorkspacePath, packageInstallCommand, INSTALL_TIMEOUT_MS, controller.signal)
            await appendCommand(packageInstallCommand, packageInstallResult)
            if (packageInstallResult.exitCode !== 0) {
                await appendLog("Detected package installation failed; continuing to preview validation")
            } else {
                await updateProgress({ installedPackages: detectedPackages })
            }
        } else {
            await appendLog("No additional packages detected from generated imports")
        }

        await checkCanceled()
        await updateProgress({ phase: "preview", currentAction: "Starting Vite preview server" })
        await appendStep("Starting Vite preview server")
        const previewUrl = startDevServer(job.targetWorkspacePath, projectId, getPreviewPort(projectId))
        await appendLog(`Dev server started at ${previewUrl}`)
        let ready = await isServerReady(previewUrl, PREVIEW_READY_TIMEOUT_MS, 500)
        let validation = ready
            ? await validateVitePreview(previewUrl)
            : { success: false, errors: ["Preview server did not become ready in time"], warnings: [] }
        await appendLog(validation.success ? "Preview validation passed" : `Preview validation failed: ${validation.errors.join("; ")}`)
        if (validation.warnings.length > 0) {
            await appendLog(`Preview warnings: ${validation.warnings.join("; ")}`)
        }
        if (validation.success) {
            const diagnosticBuild = await runCommand(job.targetWorkspacePath, "npm run build", BUILD_TIMEOUT_MS, controller.signal, { env: { NODE_ENV: "production" } })
            await appendCommand("npm run build (vite diagnostic)", diagnosticBuild)
            if (diagnosticBuild.exitCode !== 0) {
                const templateOwnedFailure = isSupabaseBuild
                    ? summarizeSupabaseTemplateOwnedTypecheckFailure(`${diagnosticBuild.stderr}\n${diagnosticBuild.stdout}`)
                    : null
                validation = {
                    success: false,
                    errors: [templateOwnedFailure ?? `Vite diagnostic build failed: ${summarizeCommandOutput(`${diagnosticBuild.stderr}\n${diagnosticBuild.stdout}`)}`],
                    warnings: validation.warnings,
                }
            }
        }

        let repairAttempts = 0
        if (!validation.success && isSupabaseTemplateOwnedValidationFailure(validation)) {
            await appendLog("Skipping AI repair because the failure is in a protected Supabase template-owned file")
        }

        while (!validation.success && !isSupabaseTemplateOwnedValidationFailure(validation) && repairAttempts < MAX_REPAIR_ATTEMPTS && !fallbackUsed) {
            repairAttempts++
            await updateProgress({ repairAttempts })
            await checkCanceled()
            await updateProgress({ phase: "repairing", currentAction: `Repairing build errors (${repairAttempts}/${MAX_REPAIR_ATTEMPTS})` })
            await appendStep(`Repairing build errors (${repairAttempts}/${MAX_REPAIR_ATTEMPTS})`)

            try {
                const buildResult = await runCommand(job.targetWorkspacePath, "npm run build", BUILD_TIMEOUT_MS, controller.signal, { env: { NODE_ENV: "production" } })
                await appendCommand("npm run build (diagnostic)", buildResult)
                const buildError = buildResult.exitCode === 0
                    ? validation.errors.join("\n")
                    : `${buildResult.stderr}\n${buildResult.stdout}`.trim()
                const workspaceFiles = await readRepairContextFiles(job.targetWorkspacePath, job.editablePaths)
                await appendLog(`Repair context ready: ${Object.keys(workspaceFiles).length} editable files`)
                const repairResponse = await generateBuildCompletionWithModel(
                    {
                        messages: [{ role: "user", content: buildRepairPrompt(buildError, workspaceFiles) }],
                        maxTokens: 40000,
                        timeoutMs: 60000,
                        maxRetries: 0,
                        signal: controller.signal,
                    },
                    REPAIR_MODEL
                )
                const repairPlan = extractJsonFromResponse(repairResponse) as { files?: Array<{ path: string; content: string }> }
                const repairFiles = Object.fromEntries((repairPlan.files ?? [])
                    .filter((file) => isEditablePath(file.path, job.editablePaths))
                    .map((file) => [file.path, file.content]))

                if (Object.keys(repairFiles).length > 0) {
                    await writeFiles(repairFiles, "ai")
                    const repairedContext = await readRepairContextFiles(job.targetWorkspacePath, job.editablePaths)
                    const repairedPackages = detectPackagesFromFiles(repairedContext)
                    if (repairedPackages.length > 0) {
                        const packageInstallCommand = `npm install --no-audit --no-fund ${repairedPackages.join(" ")}`
                        const packageInstallResult = await runCommand(job.targetWorkspacePath, packageInstallCommand, INSTALL_TIMEOUT_MS, controller.signal)
                        await appendCommand(`${packageInstallCommand} (repair)`, packageInstallResult)
                    }
                }

                ready = await isServerReady(previewUrl, PREVIEW_READY_TIMEOUT_MS, 500)
                validation = ready
                    ? await validateVitePreview(previewUrl)
                    : { success: false, errors: ["Preview server did not become ready after repair"], warnings: [] }
                if (validation.success) {
                    const diagnosticBuild = await runCommand(job.targetWorkspacePath, "npm run build", BUILD_TIMEOUT_MS, controller.signal, { env: { NODE_ENV: "production" } })
                    await appendCommand("npm run build (repair diagnostic)", diagnosticBuild)
                    if (diagnosticBuild.exitCode !== 0) {
                        const templateOwnedFailure = isSupabaseBuild
                            ? summarizeSupabaseTemplateOwnedTypecheckFailure(`${diagnosticBuild.stderr}\n${diagnosticBuild.stdout}`)
                            : null
                        validation = {
                            success: false,
                            errors: [templateOwnedFailure ?? `Vite diagnostic build failed after repair: ${summarizeCommandOutput(`${diagnosticBuild.stderr}\n${diagnosticBuild.stdout}`)}`],
                            warnings: validation.warnings,
                        }
                    }
                }
                await appendLog(validation.success ? "Preview validation passed after repair" : `Preview validation still failing: ${validation.errors.join("; ")}`)
            } catch (repairError) {
                await appendLog(`Repair attempt failed: ${repairError instanceof Error ? repairError.message : String(repairError)}`)
                break
            }
        }

        if (!validation.success && !fallbackUsed && !isSupabaseBuild) {
            fallbackUsed = true
            await updateProgress({ phase: "fallback", fallbackUsed: true, currentAction: "Repair failed; switching to deterministic fallback" })
            await appendStep("Switching to deterministic fallback")
            await writeFiles(buildFallbackFiles(job), "fallback")
            ready = await isServerReady(previewUrl, PREVIEW_READY_TIMEOUT_MS, 500)
            validation = ready
                ? await validateVitePreview(previewUrl)
                : { success: false, errors: ["Preview server did not become ready after fallback"], warnings: [] }
            if (validation.success) {
                const diagnosticBuild = await runCommand(job.targetWorkspacePath, "npm run build", BUILD_TIMEOUT_MS, controller.signal, { env: { NODE_ENV: "production" } })
                await appendCommand("npm run build (fallback diagnostic)", diagnosticBuild)
                if (diagnosticBuild.exitCode !== 0) {
                    validation = {
                        success: false,
                        errors: [`Vite diagnostic build failed after fallback: ${summarizeCommandOutput(`${diagnosticBuild.stderr}\n${diagnosticBuild.stdout}`)}`],
                        warnings: validation.warnings,
                    }
                }
            }
            await appendLog(validation.success ? "Fallback preview validation passed" : `Fallback preview validation failed: ${validation.errors.join("; ")}`)
        }

        if (!validation.success) {
            await updateProgress({ validationErrors: validation.errors })
            await finalizeBuild("failed", fallbackUsed ? "Fallback preview failed" : "Preview validation failed", logs, steps, commandsRun, projectId, runId, startedAtMs, previewUrl, fallbackUsed)
            return
        }

        await updateProgress({ validationErrors: [] })
        await finalizeBuild(
            "success",
            "Vite preview is running",
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

// Core files that MUST always be regenerated. Without App.tsx the template
// placeholder ("Generated app ready") survives and the user sees nothing.
function getRequiredCoreFiles(job: BuildJob): BuildManifestFile[] {
    const base = [
        { path: "src/App.tsx", reason: "App entry: mounts router and wires generated pages" },
        { path: "src/styles.css", reason: "Tailwind entry and theme tokens" },
        { path: "src/components/ui/app-kit.tsx", reason: "Shared UI primitives" },
        { path: "src/pages/LandingPage.tsx", reason: "Landing-first generated app route" },
        { path: "src/pages/AppWorkspace.tsx", reason: "Usable product workspace route" },
        { path: "src/pages/NotFound.tsx", reason: "Catch-all route for invalid URLs" },
    ]
    if (job.supabaseConfig?.provider === "supabase_postgres") {
        return base
    }
    return [
        ...base,
        { path: "src/lib/mock-data.ts", reason: "Local mock data for the preview" },
    ]
}

function mergeRequiredCoreFiles(files: BuildManifestFile[], job: BuildJob): BuildManifestFile[] {
    const existingPaths = new Set(files.map((f) => f.path))
    const merged = [...files]
    for (const required of getRequiredCoreFiles(job)) {
        if (!existingPaths.has(required.path)) {
            merged.unshift(required)
        }
    }
    return merged.slice(0, MAX_MANIFEST_FILES)
}

async function createBuildManifest(
    job: BuildJob,
    signal: AbortSignal,
    appendLog: (line: string) => Promise<void>,
): Promise<BuildManifest> {
    const fallbackManifest = createDeterministicManifest(job)

    try {
        const { content: response, model: usedModel } = await generateBuildCompletionWithFallback({
            messages: [{ role: "user", content: buildBuildManifestPrompt(job) }],
            maxTokens: 40000,
            timeoutMs: 60000,
            maxRetries: 0,
            signal,
        })
        await appendLog(`Manifest planning succeeded with model: ${usedModel}`)
        const parsed = extractJsonFromResponse(response) as Partial<BuildManifest>
        const aiFiles = (parsed.files ?? [])
            .filter((file): file is BuildManifestFile => Boolean(file?.path && file.reason))
            .filter((file) => isEditablePath(file.path, job.editablePaths))

        if (aiFiles.length === 0) throw new Error("Manifest did not include editable files")

        const files = mergeRequiredCoreFiles(aiFiles, job)
        const added = files.length - aiFiles.length
        if (added > 0) {
            await appendLog(`Forced ${added} required core file(s) into AI manifest (App.tsx, styles, etc.)`)
        }
        return { summary: parsed.summary || "AI-selected core files", files }
    } catch (error) {
        await appendLog(`Manifest planning degraded: ${error instanceof Error ? error.message : String(error)}`)
        return fallbackManifest
    }
}

function createDeterministicManifest(job: BuildJob): BuildManifest {
    const files = Array.from(new Set([
        "src/App.tsx",
        "src/styles.css",
        "src/components/ui/app-kit.tsx",
        ...(job.supabaseConfig?.provider !== "supabase_postgres" ? ["src/lib/mock-data.ts"] : []),
        "src/pages/LandingPage.tsx",
        "src/pages/AppWorkspace.tsx",
        "src/pages/NotFound.tsx",
    ])).slice(0, MAX_MANIFEST_FILES)

    return {
        summary: "Deterministic manifest for core Vite preview files",
        files: files.map((filePath) => ({ path: filePath, reason: "Core generated app file" })),
    }
}

/**
 * Generate files one at a time using the LLM.
 * Used as a fallback when bundled generation fails.
 */
async function generateFilesIndividually(
    job: BuildJob,
    manifest: BuildManifest,
    appendLog: (line: string) => Promise<void>,
    signal: AbortSignal,
): Promise<Record<string, string>> {
    const files: Record<string, string> = {}
    const maxRetriesPerFile = 2

    for (const manifestFile of manifest.files) {
        if (signal.aborted) throw new Error("Build canceled during per-file generation")

        let fileContent: string | null = null
        for (let attempt = 0; attempt <= maxRetriesPerFile && !fileContent; attempt++) {
            try {
                await appendLog(`Generating ${manifestFile.path} (attempt ${attempt + 1}/${maxRetriesPerFile + 1})`)
                const { content } = await generateBuildCompletionWithFallback({
                    messages: [{ role: "user", content: buildFileGenerationPrompt(manifestFile.path, job) }],
                    maxTokens: 40000,
                    timeoutMs: 60000,
                    maxRetries: 0,
                    signal,
                })
                fileContent = content
            } catch (error) {
                await appendLog(`Failed to generate ${manifestFile.path}: ${error instanceof Error ? error.message : String(error)}`)
            }
        }

        if (fileContent) {
            files[manifestFile.path] = stripMarkdownCodeBlocks(fileContent)
            await appendLog(`Generated ${manifestFile.path} (${fileContent.length} chars)`)
        } else {
            await appendLog(`WARNING: Could not generate ${manifestFile.path} after ${maxRetriesPerFile + 1} attempts`)
        }
    }

    if (Object.keys(files).length === 0) {
        throw new Error("Per-file generation produced no files")
    }

    await appendLog(`Per-file generation complete: ${Object.keys(files).length}/${manifest.files.length} files generated`)
    return files
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
        previewAvailable: status === "success" && previewUrl !== null,
        fallbackUsed,
        verificationResults,
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

    process.stdout.write(`[build-run ${runId}] Finalized: ${status} - ${summary}\n`)
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
