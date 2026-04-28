import { exec, spawn, type ChildProcess } from "child_process"
import { promises as fs } from "fs"
import path from "path"

/**
 * Copy a template directory to the target workspace.
 */
export async function copyTemplate(templateId: string, targetPath: string): Promise<void> {
    const templatePath = path.resolve(process.cwd(), "templates", templateId)
    await fs.mkdir(targetPath, { recursive: true })
    await copyDir(templatePath, targetPath)
}

async function copyDir(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true })
    const entries = await fs.readdir(src, { withFileTypes: true })
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name)
        const destPath = path.join(dest, entry.name)
        if (entry.isDirectory()) {
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

/**
 * Run a shell command in the workspace directory with a timeout.
 */
export function runCommand(cwd: string, command: string, timeoutMs = 120000, signal?: AbortSignal): Promise<CommandResult> {
    return new Promise((resolve) => {
        if (signal?.aborted) {
            resolve({ exitCode: 1, stdout: "", stderr: "Command canceled" })
            return
        }

        const child = exec(command, { cwd, timeout: timeoutMs }, (error, stdout, stderr) => {
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

    const child = spawn("npm", ["run", "dev"], {
        cwd: workspacePath,
        detached: false,
        stdio: "pipe",
        env: { ...process.env, PORT: String(port) },
    })

    child.stdout?.on("data", (data) => {
        console.log(`[dev-server ${projectId}]`, data.toString().trim())
    })

    child.stderr?.on("data", (data) => {
        console.error(`[dev-server ${projectId}]`, data.toString().trim())
    })

    child.on("exit", (code) => {
        console.log(`[dev-server ${projectId}] exited with code ${code}`)
        activeServers.delete(projectId)
    })

    child.on("error", (err) => {
        console.error(`[dev-server ${projectId}] error:`, err)
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
