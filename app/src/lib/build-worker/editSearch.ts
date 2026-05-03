import type { WorkspaceManifest } from "./manifest"
import { isProtectedWorkspaceFile } from "./manifest"

export type EditType =
    | "UPDATE_COMPONENT"
    | "UPDATE_STYLE"
    | "FIX_ISSUE"
    | "REMOVE_ELEMENT"
    | "ADD_FEATURE"
    | "ADD_DEPENDENCY"
    | "REFACTOR"

export interface EditSearchPlan {
    editType: EditType
    reasoning: string
    searchTerms: string[]
    regexPatterns?: string[]
    fileTypesToSearch?: string[]
    fallbackSearch?: {
        terms: string[]
        patterns?: string[]
    }
}

export interface EditSearchResult {
    filePath: string
    lineNumber: number
    lineContent: string
    matchedTerm?: string
    matchedPattern?: string
    contextBefore: string[]
    contextAfter: string[]
    confidence: "high" | "medium" | "low"
}

export interface EditSearchExecution {
    success: boolean
    results: EditSearchResult[]
    filesSearched: number
    usedFallback: boolean
    error?: string
}

export interface TargetSelection {
    ok: boolean
    targetFiles: string[]
    reason: string
    selectedResult?: EditSearchResult
}

const SIMPLE_EDIT_TYPES = new Set<EditType>(["UPDATE_COMPONENT", "UPDATE_STYLE", "FIX_ISSUE", "REMOVE_ELEMENT", "REFACTOR"])

export function createDeterministicSearchPlan(instruction: string, manifest: WorkspaceManifest): EditSearchPlan {
    const lowerInstruction = instruction.toLowerCase()
    const searchTerms = extractQuotedTerms(instruction)
    const componentTerms = extractComponentTerms(lowerInstruction, manifest)

    const editType: EditType = /\b(add|create|new|page|component|install|dependency|package)\b/i.test(instruction)
        ? /\b(install|dependency|package)\b/i.test(instruction) ? "ADD_DEPENDENCY" : "ADD_FEATURE"
        : /\b(remove|delete|hide)\b/i.test(instruction) ? "REMOVE_ELEMENT"
            : /\b(color|background|style|spacing|font|layout|mobile|responsive)\b/i.test(instruction) ? "UPDATE_STYLE"
                : /\b(fix|broken|bug|error|issue)\b/i.test(instruction) ? "FIX_ISSUE"
                    : "UPDATE_COMPONENT"

    const fallbackTerms = [...new Set([...componentTerms, ...instruction.split(/\s+/).filter((word) => word.length > 4).slice(0, 6)])]

    return {
        editType,
        reasoning: "Deterministic fallback plan from instruction keywords.",
        searchTerms: [...new Set([...searchTerms, ...componentTerms])].filter(Boolean),
        regexPatterns: componentTerms.map((term) => `<[^>]*(?:${escapeRegex(term)})[^>]*>`),
        fileTypesToSearch: [".tsx", ".ts", ".jsx", ".js", ".css"],
        fallbackSearch: { terms: fallbackTerms },
    }
}

export function executeEditSearch(searchPlan: EditSearchPlan, manifest: WorkspaceManifest): EditSearchExecution {
    let filesSearched = 0
    let usedFallback = false
    const primaryResults = performSearch(searchPlan, manifest, searchPlan.searchTerms, searchPlan.regexPatterns, () => {
        filesSearched++
    })

    let results = primaryResults
    if (results.length === 0 && searchPlan.fallbackSearch) {
        usedFallback = true
        results = performSearch(searchPlan, manifest, searchPlan.fallbackSearch.terms, searchPlan.fallbackSearch.patterns, () => {
            filesSearched++
        })
    }

    results.sort((a, b) => {
        const confidenceOrder = { high: 3, medium: 2, low: 1 }
        const confidenceDiff = confidenceOrder[b.confidence] - confidenceOrder[a.confidence]
        if (confidenceDiff !== 0) return confidenceDiff
        return scorePreferredFile(b.filePath, searchPlan.editType) - scorePreferredFile(a.filePath, searchPlan.editType)
    })

    return {
        success: results.length > 0,
        results,
        filesSearched,
        usedFallback,
        error: results.length === 0 ? "No editable file matched the edit search plan" : undefined,
    }
}

export function selectTargetFiles(
    instruction: string,
    searchPlan: EditSearchPlan,
    searchResults: EditSearchResult[],
    manifest: WorkspaceManifest,
): TargetSelection {
    if (!SIMPLE_EDIT_TYPES.has(searchPlan.editType)) {
        return {
            ok: false,
            targetFiles: [],
            reason: `P0 targeted edits only support modifying existing files. "${searchPlan.editType}" requires a broader feature workflow.`,
        }
    }

    const protectedTarget = findProtectedTargetMention(instruction)
    if (protectedTarget) {
        return {
            ok: false,
            targetFiles: [],
            reason: `Protected file edits are not allowed in P0 targeted edits: ${protectedTarget}`,
        }
    }

    const selectedResult = searchResults.find((result) => Boolean(manifest.files[result.filePath]) && !isProtectedWorkspaceFile(result.filePath))
    if (selectedResult) {
        return {
            ok: true,
            targetFiles: [selectedResult.filePath],
            reason: `Selected highest-confidence editable match at ${selectedResult.filePath}:${selectedResult.lineNumber}`,
            selectedResult,
        }
    }

    const fallbackFile = deterministicTargetFromInstruction(instruction, manifest)
    if (fallbackFile) {
        return {
            ok: true,
            targetFiles: [fallbackFile],
            reason: `Selected editable file by deterministic filename/component match: ${fallbackFile}`,
        }
    }

    return {
        ok: false,
        targetFiles: [],
        reason: "Could not identify a single existing editable file for this instruction.",
    }
}

export function formatSearchResultsForPrompt(results: EditSearchResult[], limit = 8): string {
    if (results.length === 0) return "No search results found."
    return results.slice(0, limit).map((result) => {
        const before = result.contextBefore.map((line) => `  ${line}`).join("\n")
        const after = result.contextAfter.map((line) => `  ${line}`).join("\n")
        return [
            `File: ${result.filePath}`,
            `Line: ${result.lineNumber}`,
            `Confidence: ${result.confidence}`,
            result.matchedTerm ? `Matched term: ${result.matchedTerm}` : undefined,
            result.matchedPattern ? `Matched pattern: ${result.matchedPattern}` : undefined,
            "Context:",
            before,
            `> ${result.lineContent}`,
            after,
        ].filter(Boolean).join("\n")
    }).join("\n\n")
}

function performSearch(
    searchPlan: EditSearchPlan,
    manifest: WorkspaceManifest,
    terms: string[],
    patterns: string[] | undefined,
    countFile: () => void,
): EditSearchResult[] {
    const results: EditSearchResult[] = []
    const fileTypes = searchPlan.fileTypesToSearch?.length ? searchPlan.fileTypesToSearch : [".tsx", ".ts", ".jsx", ".js", ".css"]

    for (const [filePath, file] of Object.entries(manifest.files)) {
        if (!fileTypes.some((ext) => filePath.endsWith(ext))) continue
        countFile()
        const lines = file.content.split("\n")

        for (let index = 0; index < lines.length; index++) {
            const line = lines[index]
            let matchedTerm: string | undefined
            let matchedPattern: string | undefined

            for (const term of terms) {
                if (term && line.toLowerCase().includes(term.toLowerCase())) {
                    matchedTerm = term
                    break
                }
            }

            if (!matchedTerm && patterns?.length) {
                for (const pattern of patterns) {
                    try {
                        if (new RegExp(pattern, "i").test(line)) {
                            matchedPattern = pattern
                            break
                        }
                    } catch {
                        // Ignore invalid model-generated regex patterns.
                    }
                }
            }

            if (!matchedTerm && !matchedPattern) continue

            results.push({
                filePath,
                lineNumber: index + 1,
                lineContent: line.trim(),
                matchedTerm,
                matchedPattern,
                contextBefore: lines.slice(Math.max(0, index - 3), index),
                contextAfter: lines.slice(index + 1, Math.min(lines.length, index + 4)),
                confidence: inferConfidence(line, matchedTerm, matchedPattern, filePath, searchPlan.editType),
            })
        }
    }

    return results
}

function inferConfidence(
    line: string,
    matchedTerm: string | undefined,
    matchedPattern: string | undefined,
    filePath: string,
    editType: EditType,
): "high" | "medium" | "low" {
    if (matchedTerm && line.includes(matchedTerm)) return "high"
    if (editType === "UPDATE_STYLE" && /className|class=|@apply|color|background/.test(line)) return "high"
    if (editType === "REMOVE_ELEMENT" && /<|button|href|aria-label/.test(line)) return "high"
    if (matchedPattern) return "medium"
    if (filePath.endsWith(".tsx") || filePath.endsWith(".jsx")) return "medium"
    return "low"
}

function scorePreferredFile(filePath: string, editType: EditType): number {
    let score = 0
    if (filePath.endsWith(".tsx") || filePath.endsWith(".jsx")) score += 3
    if (filePath.includes("/components/")) score += 2
    if (filePath.endsWith("App.tsx") || filePath.endsWith("App.jsx")) score += 1
    if (editType === "UPDATE_STYLE" && filePath.endsWith(".css")) score -= 1
    return score
}

function extractQuotedTerms(instruction: string): string[] {
    const terms = new Set<string>()
    const quoteRegex = /["'`“”‘’]([^"'`“”‘’]{2,80})["'`“”‘’]/g
    let match: RegExpExecArray | null
    while ((match = quoteRegex.exec(instruction)) !== null) {
        terms.add(match[1].trim())
    }
    return Array.from(terms)
}

function extractComponentTerms(lowerInstruction: string, manifest: WorkspaceManifest): string[] {
    const terms = new Set<string>()
    const commonTargets = ["app", "dashboard", "header", "nav", "navigation", "sidebar", "footer", "hero", "button", "card", "table", "modal", "form", "settings"]
    for (const target of commonTargets) {
        if (lowerInstruction.includes(target)) terms.add(target)
    }

    for (const file of Object.values(manifest.files)) {
        const name = file.componentName?.toLowerCase()
        if (name && lowerInstruction.includes(name)) {
            terms.add(file.componentName!)
        }
    }

    return Array.from(terms)
}

function deterministicTargetFromInstruction(instruction: string, manifest: WorkspaceManifest): string | null {
    const lowerInstruction = instruction.toLowerCase()
    const candidates = Object.values(manifest.files)
        .filter((file) => !isProtectedWorkspaceFile(file.path))
        .map((file) => {
            const fileName = file.path.split("/").pop()?.toLowerCase() || ""
            const componentName = file.componentName?.toLowerCase() || ""
            let score = 0
            if (file.path.endsWith(".tsx") || file.path.endsWith(".jsx")) score += 2
            if (file.type === "page" || file.type === "component") score += 2
            for (const token of lowerInstruction.split(/[^a-z0-9]+/).filter((item) => item.length > 2)) {
                if (fileName.includes(token)) score += 4
                if (componentName.includes(token)) score += 5
                if (file.content.toLowerCase().includes(token)) score += 1
            }
            return { path: file.path, score }
        })
        .filter((candidate) => candidate.score > 0)
        .sort((a, b) => b.score - a.score)

    return candidates[0]?.path ?? null
}

function findProtectedTargetMention(instruction: string): string | null {
    const lower = instruction.toLowerCase()
    const protectedNames = ["package.json", "vite.config", "tailwind.config", "tsconfig", "postcss.config", "package-lock", "pnpm-lock", "bun.lock"]
    return protectedNames.find((name) => lower.includes(name)) ?? null
}

function escapeRegex(input: string): string {
    return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
