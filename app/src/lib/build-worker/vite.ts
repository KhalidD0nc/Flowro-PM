const PROTECTED_CONFIG_FILES = new Set([
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

const PREINSTALLED_PACKAGES = new Set([
    "@vitejs/plugin-react",
    "vite",
    "react",
    "react-dom",
    "tailwindcss",
    "@tailwindcss/postcss",
])

const NODE_BUILT_INS = new Set([
    "assert",
    "buffer",
    "child_process",
    "crypto",
    "events",
    "fs",
    "http",
    "https",
    "os",
    "path",
    "querystring",
    "stream",
    "url",
    "util",
    "zlib",
])

export type NormalizedFilesResult = {
    files: Record<string, string>
    skippedFiles: string[]
}

export type PreviewValidation = {
    success: boolean
    errors: string[]
    warnings: string[]
}

export function normalizeGeneratedFilesForVite(files: Record<string, string>): NormalizedFilesResult {
    const normalized: Record<string, string> = {}
    const skippedFiles: string[] = []

    for (const [rawPath, rawContent] of Object.entries(files)) {
        const filePath = normalizeGeneratedPath(rawPath)
        if (!filePath) {
            skippedFiles.push(rawPath)
            continue
        }

        const fileName = filePath.split("/").pop() || filePath
        if (PROTECTED_CONFIG_FILES.has(fileName) || PROTECTED_CONFIG_FILES.has(filePath)) {
            skippedFiles.push(rawPath)
            continue
        }

        normalized[filePath] = sanitizeGeneratedContent(filePath, rawContent)
    }

    return { files: normalized, skippedFiles }
}

export function normalizeGeneratedPath(rawPath: string): string | null {
    let filePath = rawPath.trim().replace(/\\/g, "/").replace(/^\/+/, "")
    if (!filePath || filePath.includes("..")) return null

    if (filePath.startsWith("app/")) {
        filePath = filePath.replace(/^app\//, "src/")
    }

    if (filePath === "src/app/page.tsx" || filePath === "src/app/App.tsx" || filePath === "src/page.tsx") {
        return "src/App.tsx"
    }

    if (filePath === "src/app/globals.css" || filePath === "src/index.css" || filePath === "src/global.css") {
        return "src/styles.css"
    }

    if (filePath.startsWith("src/app/")) {
        const withoutApp = filePath.replace(/^src\/app\//, "")
        return `src/pages/${withoutApp.replace(/\/page\.(tsx|ts|jsx|js)$/, ".$1")}`
    }

    if (
        filePath === "index.html" ||
        filePath.startsWith("src/") ||
        filePath.startsWith("public/")
    ) {
        return filePath
    }

    const extMatch = filePath.match(/\.(tsx|ts|jsx|js|css|json|svg)$/)
    if (!extMatch) return null
    return `src/${filePath}`
}

export function sanitizeGeneratedContent(filePath: string, content: string): string {
    let sanitized = stripMarkdownCodeFence(content)

    if (/\.(tsx|ts|jsx|js)$/.test(filePath)) {
        sanitized = sanitized.replace(/import\s+["']\.\/[^"']+\.css["'];?\s*\n?/g, "")
    }

    if (filePath.endsWith(".css")) {
        sanitized = sanitized.replace(/\bshadow-(3xl|4xl|5xl)\b/g, "shadow-2xl")
        // Tailwind v4: replace v3-style @tailwind directives with @import + @reference,
        // which is required for @apply to find utility classes from a CSS file.
        if (/@tailwind\s+base/.test(sanitized) || /@tailwind\s+utilities/.test(sanitized)) {
            sanitized = sanitized
                .replace(/@tailwind\s+base;\s*/g, "")
                .replace(/@tailwind\s+components;\s*/g, "")
                .replace(/@tailwind\s+utilities;\s*/g, "")
            sanitized = `@import "tailwindcss";\n@reference "tailwindcss";\n\n${sanitized.trim()}`
        }
    }

    return sanitized.trim() + "\n"
}

export function detectPackagesFromFiles(files: Record<string, string>): string[] {
    const packages = new Set<string>()
    const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|[\w$]+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|[\w$]+))*\s+from\s+)?["']([^"']+)["']/g
    const dynamicImportRegex = /import\(\s*["']([^"']+)["']\s*\)/g
    const requireRegex = /require\(\s*["']([^"']+)["']\s*\)/g

    for (const [filePath, content] of Object.entries(files)) {
        if (!/\.(tsx|ts|jsx|js)$/.test(filePath)) continue

        for (const regex of [importRegex, dynamicImportRegex, requireRegex]) {
            regex.lastIndex = 0
            let match: RegExpExecArray | null
            while ((match = regex.exec(content)) !== null) {
                const packageName = toPackageName(match[1])
                if (packageName) packages.add(packageName)
            }
        }
    }

    return Array.from(packages).sort()
}

export async function validateVitePreview(previewUrl: string): Promise<PreviewValidation> {
    try {
        const response = await fetch(previewUrl, {
            headers: {
                "Cache-Control": "no-cache",
                "User-Agent": "Flowro-Preview-Validator",
            },
        })

        if (!response.ok) {
            return { success: false, errors: [`Preview returned HTTP ${response.status}`], warnings: [] }
        }

        const html = await response.text()
        const errors: string[] = []
        const warnings: string[] = []

        if (!html.includes('id="root"')) {
            errors.push("Preview HTML is missing the Vite root element")
        }
        if (/vite-error-overlay/i.test(html)) {
            errors.push("Vite error overlay detected in preview HTML")
        }
        if (/Generated app ready/.test(html)) {
            warnings.push("Preview is still showing the starter template")
        }

        return { success: errors.length === 0, errors, warnings }
    } catch (error) {
        return {
            success: false,
            errors: [error instanceof Error ? error.message : "Preview validation failed"],
            warnings: [],
        }
    }
}

function toPackageName(importSource: string): string | null {
    if (!importSource || importSource.startsWith(".") || importSource.startsWith("/") || importSource.startsWith("@/")) {
        return null
    }

    const packageName = importSource.startsWith("@")
        ? importSource.split("/").slice(0, 2).join("/")
        : importSource.split("/")[0]

    if (!packageName || NODE_BUILT_INS.has(packageName) || PREINSTALLED_PACKAGES.has(packageName)) {
        return null
    }

    return packageName
}

function stripMarkdownCodeFence(content: string): string {
    const trimmed = content.trim()
    const match = trimmed.match(/^```(?:\w+)?\s*\n?([\s\S]*?)```$/)
    return match ? match[1].trim() : trimmed
}

/**
 * Extract all relative local imports from file content.
 * Returns the raw import sources (e.g. "./components/AppShell").
 */
export function extractRelativeImports(content: string): string[] {
    const imports: string[] = []
    const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|[\w$]+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|[\w$]+))*\s+from\s+)?["'](\.\/[^"']+)["']/g
    let match: RegExpExecArray | null
    while ((match = importRegex.exec(content)) !== null) {
        imports.push(match[1])
    }
    return imports
}

/**
 * Validate that every relative import in the generated files resolves to another
 * file that also exists in the generated set. Returns an array of missing imports.
 */
export function validateImportCoherence(files: Record<string, string>): string[] {
    const missing: string[] = []
    const fileSet = new Set(Object.keys(files))

    for (const [filePath, content] of Object.entries(files)) {
        if (!/\.(tsx|ts|jsx|js)$/.test(filePath)) continue
        const relativeImports = extractRelativeImports(content)

        for (const importPath of relativeImports) {
            const resolved = resolveRelativeImport(filePath, importPath)
            const candidates = importCandidates(resolved)
            const exists = candidates.some((c) => fileSet.has(c))
            if (!exists) {
                missing.push(`${filePath} imports "${importPath}" (resolved: ${resolved}) but file is missing`)
            }
        }
    }

    return missing
}

function resolveRelativeImport(filePath: string, importPath: string): string {
    const dir = filePath.split("/").slice(0, -1).join("/") || "."
    if (importPath.startsWith("./")) {
        return `${dir}/${importPath.slice(2)}`
    }
    if (importPath.startsWith("../")) {
        const parts = dir.split("/").filter(Boolean)
        const upParts = importPath.match(/\.\.\//g) || []
        const remaining = importPath.replace(/\.\.\//g, "")
        const base = parts.slice(0, parts.length - upParts.length).join("/")
        return base ? `${base}/${remaining}` : remaining
    }
    return importPath
}

function importCandidates(resolved: string): string[] {
    return [
        resolved,
        `${resolved}.tsx`,
        `${resolved}.ts`,
        `${resolved}.jsx`,
        `${resolved}.js`,
        `${resolved}/index.tsx`,
        `${resolved}/index.ts`,
        `${resolved}/index.jsx`,
        `${resolved}/index.js`,
    ]
}

/**
 * For every relative import that does not resolve to an existing file, generate
 * a minimal placeholder file so the project still type-checks and renders. This
 * keeps Vite/tsc green long enough for the user to iterate on the missing piece
 * instead of being knocked back to the deterministic fallback.
 */
export function buildMissingImportStubs(files: Record<string, string>): Record<string, string> {
    const stubs: Record<string, string> = {}
    const fileSet = new Set(Object.keys(files))

    for (const [filePath, content] of Object.entries(files)) {
        if (!/\.(tsx|ts|jsx|js)$/.test(filePath)) continue
        const relativeImports = extractRelativeImports(content)

        for (const importPath of relativeImports) {
            const resolved = resolveRelativeImport(filePath, importPath)
            const candidates = importCandidates(resolved)
            if (candidates.some((c) => fileSet.has(c) || stubs[c] !== undefined)) continue

            const stubPath = stubExtensionFor(resolved)
            if (!stubPath) continue
            stubs[stubPath] = stubContentFor(stubPath, importPath)
        }
    }

    return stubs
}

function stubExtensionFor(resolved: string): string | null {
    if (/\.(tsx|ts|jsx|js|css|json)$/.test(resolved)) return resolved
    // Default to .tsx for component-shaped paths (PascalCase last segment), .ts otherwise.
    const last = resolved.split("/").pop() || ""
    const isComponent = /^[A-Z]/.test(last)
    return isComponent ? `${resolved}.tsx` : `${resolved}.ts`
}

function stubContentFor(stubPath: string, importPath: string): string {
    if (stubPath.endsWith(".tsx") || stubPath.endsWith(".jsx")) {
        const componentName = (stubPath.split("/").pop() || "Placeholder").replace(/\.(tsx|jsx)$/, "")
        const safeName = /^[A-Z][A-Za-z0-9_]*$/.test(componentName) ? componentName : "Placeholder"
        // Use `any` props so the stub satisfies any caller's expected shape and
        // keeps tsc green even if the real component would have required props.
        return `// Auto-generated placeholder for missing import "${importPath}".
// Replace with the real implementation.

export default function ${safeName}(_props: any) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
      <p className="font-semibold text-slate-800">${safeName}</p>
      <p className="mt-1 text-xs">Placeholder generated by Flowro because this module was referenced but not produced.</p>
    </div>
  );
}

export const ${safeName}Component: any = ${safeName};
`
    }
    if (stubPath.endsWith(".css")) {
        return `/* Auto-generated placeholder for missing import "${importPath}". */\n`
    }
    if (stubPath.endsWith(".json")) {
        return `{}\n`
    }
    return `// Auto-generated placeholder for missing import "${importPath}".
// Replace with the real implementation.
const placeholder = {} as Record<string, unknown>;
export default placeholder;
`
}
