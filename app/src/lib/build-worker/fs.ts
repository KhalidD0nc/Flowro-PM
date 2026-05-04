import { exec, spawn, type ChildProcess } from "child_process"
import { promises as fs } from "fs"
import path from "path"

const DEFAULT_REPAIR_CONTEXT_MAX_BYTES = 200_000
const DEFAULT_REPAIR_CONTEXT_MAX_FILES = 40
const EXCLUDED_CONTEXT_DIRS = new Set([
    ".git",
    ".next",
    "coverage",
    "dist",
    "node_modules",
    "out",
])

/**
 * Copy a template directory to the target workspace.
 */
export async function copyTemplate(templateId: string, targetPath: string): Promise<void> {
    const templatePath = path.resolve(process.cwd(), "templates", templateId)
    await fs.rm(targetPath, { recursive: true, force: true })
    await fs.mkdir(targetPath, { recursive: true })
    await copyDir(templatePath, targetPath)
}

const SKIP_TEMPLATE_DIRS = new Set([
    "node_modules",
    "dist",
    ".git",
    ".next",
    "coverage",
    "out",
])

async function copyDir(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true })
    const entries = await fs.readdir(src, { withFileTypes: true })
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name)
        const destPath = path.join(dest, entry.name)
        if (entry.isDirectory()) {
            if (SKIP_TEMPLATE_DIRS.has(entry.name)) continue
            await copyDir(srcPath, destPath)
        } else {
            await fs.copyFile(srcPath, destPath)
        }
    }
}

/**
 * Write a file inside the workspace, creating parent directories as needed.
 */
export async function writeWorkspaceFile(
    workspacePath: string,
    relativePath: string,
    content: string
): Promise<void> {
    const fullPath = path.join(workspacePath, relativePath)
    await fs.mkdir(path.dirname(fullPath), { recursive: true })
    await fs.writeFile(fullPath, content, "utf-8")
}

/**
 * Read all text files in the workspace for repair context.
 */
export async function readWorkspaceFiles(workspacePath: string): Promise<Record<string, string>> {
    const files: Record<string, string> = {}
    const entries = await fs.readdir(workspacePath, { withFileTypes: true, recursive: true })
    for (const entry of entries) {
        if (entry.isFile()) {
            const fullPath = path.join(entry.parentPath || workspacePath, entry.name)
            const relPath = path.relative(workspacePath, fullPath)
            if (isTextFile(relPath)) {
                try {
                    files[relPath] = await fs.readFile(fullPath, "utf-8")
                } catch {
                    // skip unreadable files
                }
            }
        }
    }
    return files
}

export interface RepairContextOptions {
    maxBytes?: number
    maxFiles?: number
}

/**
 * Read a bounded set of editable source files for LLM repair.
 *
 * Repair prompts must stay small: this intentionally skips dependency/build
 * directories and only includes files the build worker is allowed to patch.
 */
export async function readRepairContextFiles(
    workspacePath: string,
    editablePaths: string[],
    options: RepairContextOptions = {}
): Promise<Record<string, string>> {
    const maxBytes = options.maxBytes ?? DEFAULT_REPAIR_CONTEXT_MAX_BYTES
    const maxFiles = options.maxFiles ?? DEFAULT_REPAIR_CONTEXT_MAX_FILES
    const files: Record<string, string> = {}
    let totalBytes = 0

    for (const editablePath of editablePaths) {
        const normalizedEditablePath = normalizeRelativePath(editablePath)
        if (!normalizedEditablePath) continue

        const absoluteEditablePath = path.join(workspacePath, normalizedEditablePath)
        await walkRepairContext(workspacePath, absoluteEditablePath, async (relativePath, absolutePath) => {
            if (Object.keys(files).length >= maxFiles) return false
            if (!isTextFile(relativePath)) return true

            try {
                const stat = await fs.stat(absolutePath)
                if (!stat.isFile()) return true
                if (totalBytes + stat.size > maxBytes) return false

                files[relativePath] = await fs.readFile(absolutePath, "utf-8")
                totalBytes += stat.size
            } catch {
                // skip unreadable files
            }

            return true
        })

        if (Object.keys(files).length >= maxFiles || totalBytes >= maxBytes) break
    }

    return files
}

async function walkRepairContext(
    workspacePath: string,
    currentPath: string,
    visitFile: (relativePath: string, absolutePath: string) => Promise<boolean>
): Promise<boolean> {
    let entries
    try {
        entries = await fs.readdir(currentPath, { withFileTypes: true })
    } catch {
        return true
    }

    for (const entry of entries) {
        const absolutePath = path.join(currentPath, entry.name)
        const relativePath = normalizeRelativePath(path.relative(workspacePath, absolutePath))

        if (!relativePath) continue
        if (entry.isDirectory()) {
            if (EXCLUDED_CONTEXT_DIRS.has(entry.name)) continue
            const shouldContinue = await walkRepairContext(workspacePath, absolutePath, visitFile)
            if (!shouldContinue) return false
            continue
        }

        if (entry.isFile()) {
            const shouldContinue = await visitFile(relativePath, absolutePath)
            if (!shouldContinue) return false
        }
    }

    return true
}

function normalizeRelativePath(filePath: string): string {
    return filePath.replace(/\\/g, "/").replace(/^\/+/, "")
}

function isTextFile(filePath: string): boolean {
    const textExtensions = new Set([
        ".ts", ".tsx", ".js", ".jsx", ".json", ".css", ".html", ".md",
        ".yml", ".yaml", ".toml", ".svg", ".txt",
    ])
    const ext = path.extname(filePath).toLowerCase()
    return textExtensions.has(ext)
}

export interface CommandResult {
    exitCode: number
    stdout: string
    stderr: string
}

export interface RunCommandOptions {
    env?: Record<string, string | undefined>
}

/**
 * Run a shell command in the workspace directory with a timeout.
 */
export function runCommand(
    cwd: string,
    command: string,
    timeoutMs = 120000,
    signal?: AbortSignal,
    options: RunCommandOptions = {}
): Promise<CommandResult> {
    return new Promise((resolve) => {
        if (signal?.aborted) {
            resolve({ exitCode: 1, stdout: "", stderr: "Command canceled" })
            return
        }

        const child = exec(command, { cwd, timeout: timeoutMs, env: createCommandEnv(options.env) }, (error, stdout, stderr) => {
            signal?.removeEventListener("abort", abortCommand)
            if (error) {
                resolve({ exitCode: error.code as number || 1, stdout, stderr })
            } else {
                resolve({ exitCode: 0, stdout, stderr })
            }
        })

        function abortCommand() {
            child.kill("SIGTERM")
            resolve({ exitCode: 1, stdout: "", stderr: "Command canceled" })
        }

        signal?.addEventListener("abort", abortCommand, { once: true })

        child.on("error", (err) => {
            signal?.removeEventListener("abort", abortCommand)
            resolve({ exitCode: 1, stdout: "", stderr: err.message })
        })
    })
}

const activeServers = new Map<string, ChildProcess>()

/**
 * Start the dev server (npm run dev) in the background for a workspace.
 * Returns the preview URL. Kills any existing server for this project first.
 */
export function startDevServer(workspacePath: string, projectId: string, port = 3001): string {
    // Kill any existing server for this project
    const existing = activeServers.get(projectId)
    if (existing && !existing.killed) {
        existing.kill("SIGTERM")
        activeServers.delete(projectId)
    }

    const child = spawn("npm", ["run", "dev", "--", "--port", String(port)], {
        cwd: workspacePath,
        detached: false,
        stdio: "pipe",
        env: createCommandEnv({ PORT: String(port) }),
    })

    child.stdout?.on("data", (data) => {
        process.stdout.write(`[dev-server ${projectId}] ${data.toString().trim()}\n`)
    })

    child.stderr?.on("data", (data) => {
        process.stderr.write(`[dev-server ${projectId}] ${data.toString().trim()}\n`)
    })

    child.on("exit", (code) => {
        process.stdout.write(`[dev-server ${projectId}] exited with code ${code}\n`)
        activeServers.delete(projectId)
    })

    child.on("error", (err) => {
        process.stderr.write(`[dev-server ${projectId}] error: ${err instanceof Error ? err.message : String(err)}\n`)
        activeServers.delete(projectId)
    })

    activeServers.set(projectId, child)
    return `http://localhost:${port}`
}

/**
 * Poll a URL until it responds or timeout is reached.
 */
export async function isServerReady(url: string, timeoutMs = 30000, intervalMs = 500): Promise<boolean> {
    const start = Date.now()
    while (Date.now() - start < timeoutMs) {
        try {
            const res = await fetch(url, { method: "HEAD" })
            if (res.ok || res.status === 404) {
                // 404 means the server is up even if the route doesn't exist yet
                return true
            }
        } catch {
            // server not ready yet
        }
        await new Promise((r) => setTimeout(r, intervalMs))
    }
    return false
}

/**
 * Stop the dev server for a project.
 */
export function stopDevServer(projectId: string): void {
    const child = activeServers.get(projectId)
    if (child && !child.killed) {
        child.kill("SIGTERM")
    }
    activeServers.delete(projectId)
}

export function getPreviewPort(projectId: string, basePort = 3100): number {
    let hash = 0
    for (const char of projectId) {
        hash = (hash * 31 + char.charCodeAt(0)) % 1000
    }
    return basePort + hash
}

function createCommandEnv(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
    const env: Record<string, string | undefined> = { ...process.env, ...overrides }
    if (env.NODE_ENV && !["development", "production", "test"].includes(env.NODE_ENV)) {
        env.NODE_ENV = undefined
    }
    return env as NodeJS.ProcessEnv
}
