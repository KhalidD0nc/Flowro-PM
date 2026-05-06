import { promises as fs } from "fs"
import path from "path"

const EXCLUDED_DIRS = new Set([".git", ".next", "coverage", "dist", "node_modules", "out"])
const PROTECTED_FILES = new Set([
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "bun.lock",
    "vite.config.ts",
    "vite.config.js",
    "tailwind.config.ts",
    "tailwind.config.js",
    "postcss.config.mjs",
    "postcss.config.js",
    "tsconfig.json",
    "tsconfig.app.json",
    "tsconfig.node.json",
])
const TEXT_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".json", ".css", ".html", ".md", ".svg", ".txt"])

export type WorkspaceFileType = "component" | "page" | "style" | "config" | "utility" | "asset"

export interface WorkspaceFileManifestEntry {
    path: string
    type: WorkspaceFileType
    content: string
    imports: string[]
    exports: string[]
    componentName?: string
    childComponents: string[]
    size: number
}

export interface WorkspaceManifest {
    workspacePath: string
    editablePaths: string[]
    files: Record<string, WorkspaceFileManifestEntry>
}

export function isProtectedWorkspaceFile(filePath: string): boolean {
    const normalized = normalizeRelativePath(filePath)
    const fileName = normalized.split("/").pop() || normalized
    return PROTECTED_FILES.has(fileName) || PROTECTED_FILES.has(normalized)
}

export async function buildWorkspaceManifest(
    workspacePath: string,
    editablePaths: string[],
): Promise<WorkspaceManifest> {
    const files: Record<string, WorkspaceFileManifestEntry> = {}

    for (const editablePath of editablePaths) {
        const normalizedEditablePath = normalizeRelativePath(editablePath)
        if (!normalizedEditablePath) continue
        const absoluteEditablePath = path.join(workspacePath, normalizedEditablePath)
        await walkEditableFiles(workspacePath, absoluteEditablePath, async (relativePath, absolutePath) => {
            if (!isReadableManifestFile(relativePath)) return
            try {
                const content = await fs.readFile(absolutePath, "utf-8")
                files[relativePath] = parseWorkspaceFile(relativePath, content)
            } catch {
                // Skip files that disappear or cannot be read while the dev server is active.
            }
        })
    }

    return {
        workspacePath,
        editablePaths: editablePaths.map(normalizeRelativePath).filter(Boolean),
        files,
    }
}

function parseWorkspaceFile(filePath: string, content: string): WorkspaceFileManifestEntry {
    const componentName = extractComponentName(filePath, content)
    return {
        path: filePath,
        type: determineFileType(filePath, content, componentName),
        content,
        imports: extractImports(content),
        exports: extractExports(content),
        componentName,
        childComponents: extractChildComponents(content, componentName),
        size: Buffer.byteLength(content, "utf-8"),
    }
}

async function walkEditableFiles(
    workspacePath: string,
    currentPath: string,
    visitFile: (relativePath: string, absolutePath: string) => Promise<void>,
): Promise<void> {
    let entries
    try {
        entries = await fs.readdir(currentPath, { withFileTypes: true })
    } catch {
        return
    }

    for (const entry of entries) {
        const absolutePath = path.join(currentPath, entry.name)
        const relativePath = normalizeRelativePath(path.relative(workspacePath, absolutePath))
        if (!relativePath) continue

        if (entry.isDirectory()) {
            if (EXCLUDED_DIRS.has(entry.name)) continue
            await walkEditableFiles(workspacePath, absolutePath, visitFile)
            continue
        }

        if (entry.isFile()) {
            await visitFile(relativePath, absolutePath)
        }
    }
}

function isReadableManifestFile(filePath: string): boolean {
    if (!filePath || filePath.includes("..")) return false
    if (isProtectedWorkspaceFile(filePath)) return false
    const ext = path.extname(filePath).toLowerCase()
    return TEXT_EXTENSIONS.has(ext)
}

function normalizeRelativePath(filePath: string): string {
    return filePath.replace(/\\/g, "/").replace(/^\/+/, "")
}

function determineFileType(filePath: string, content: string, componentName?: string): WorkspaceFileType {
    const fileName = filePath.split("/").pop()?.toLowerCase() || ""
    if (fileName.endsWith(".css")) return "style"
    if (isProtectedWorkspaceFile(filePath)) return "config"
    if (filePath.startsWith("public/")) return "asset"
    if (filePath.includes("/pages/") || fileName === "app.tsx" || fileName === "app.jsx") return "page"
    if (componentName) return "component"
    if (filePath.includes("/lib/") || filePath.includes("/utils/")) return "utility"
    return "utility"
}

function extractImports(content: string): string[] {
    const imports = new Set<string>()
    const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|[\w$]+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|[\w$]+))*\s+from\s+)?["']([^"']+)["']/g
    let match: RegExpExecArray | null
    while ((match = importRegex.exec(content)) !== null) {
        imports.add(match[1])
    }
    return Array.from(imports).sort()
}

function extractExports(content: string): string[] {
    const exports = new Set<string>()
    if (/export\s+default\s+/m.test(content)) exports.add("default")

    const namedExportRegex = /export\s+(?:const|let|var|function|class|type|interface)\s+([A-Za-z_$][\w$]*)/g
    let match: RegExpExecArray | null
    while ((match = namedExportRegex.exec(content)) !== null) {
        exports.add(match[1])
    }

    const exportBlockRegex = /export\s+\{([^}]+)\}/g
    while ((match = exportBlockRegex.exec(content)) !== null) {
        match[1].split(",").map((item) => item.trim().split(/\s+as\s+/)[0]?.trim()).filter(Boolean).forEach((item) => exports.add(item))
    }

    return Array.from(exports).sort()
}

function extractComponentName(filePath: string, content: string): string | undefined {
    const functionMatch = content.match(/(?:export\s+)?(?:default\s+)?function\s+([A-Z][A-Za-z0-9_]*)\s*\(/)
    if (functionMatch) return functionMatch[1]

    const arrowMatch = content.match(/(?:export\s+)?(?:const|let)\s+([A-Z][A-Za-z0-9_]*)\s*=\s*(?:\([^)]*\)|[^=])*=>/)
    if (arrowMatch) return arrowMatch[1]

    const fileName = filePath.split("/").pop()?.replace(/\.(tsx|ts|jsx|js)$/, "")
    if (fileName && /^[A-Z]/.test(fileName) && /<[A-Za-z][\w:-]*(\s|>|\/>)/.test(content)) return fileName
    return undefined
}

function extractChildComponents(content: string, componentName?: string): string[] {
    const childComponents = new Set<string>()
    const componentRegex = /<([A-Z][A-Za-z0-9_]*)[\s/>]/g
    let match: RegExpExecArray | null
    while ((match = componentRegex.exec(content)) !== null) {
        if (match[1] !== componentName) childComponents.add(match[1])
    }
    return Array.from(childComponents).sort()
}
