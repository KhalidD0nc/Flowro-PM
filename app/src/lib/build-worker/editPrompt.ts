import type { WorkspaceManifest } from "./manifest"
import type { EditSearchPlan, EditSearchResult } from "./editSearch"
import { formatSearchResultsForPrompt } from "./editSearch"

export function buildEditSearchPlanPrompt(instruction: string, manifest: WorkspaceManifest): string {
    const fileSummary = Object.values(manifest.files)
        .map((file) => {
            const component = file.componentName ? `, component: ${file.componentName}` : ""
            const children = file.childComponents.length ? `, renders: ${file.childComponents.join(", ")}` : ""
            return `- ${file.path} (${file.type}${component}${children})`
        })
        .join("\n")

    return `You are Flowro's targeted edit search planner.

Return JSON only. No markdown. Do not choose files directly. Create a search plan that can find the exact existing code to edit.

Allowed edit types:
- UPDATE_COMPONENT
- UPDATE_STYLE
- FIX_ISSUE
- REMOVE_ELEMENT
- ADD_FEATURE
- ADD_DEPENDENCY
- REFACTOR

Rules:
- For text changes, include the exact visible text as a search term.
- For style changes, include component names and className-related regex patterns.
- For remove/delete requests, search for the visible label, aria-label, href, or element text.
- For P0, requests that create new pages/components/packages should be classified as ADD_FEATURE or ADD_DEPENDENCY.
- Prefer specific terms over generic words.

Output shape:
{
  "editType": "UPDATE_COMPONENT",
  "reasoning": "Short search strategy",
  "searchTerms": ["exact text", "Header"],
  "regexPatterns": ["className=[\\"'][^\\n]*Header[^\\n]*[\\"']"],
  "fileTypesToSearch": [".tsx", ".ts", ".jsx", ".js", ".css"],
  "fallbackSearch": { "terms": ["header", "button"], "patterns": [] }
}

Editable project files:
${fileSummary}

User instruction:
${instruction}`
}

export function buildTargetedEditPrompt(params: {
    instruction: string
    targetFiles: string[]
    manifest: WorkspaceManifest
    searchPlan: EditSearchPlan
    searchResults: EditSearchResult[]
}): string {
    const targetFileContents = params.targetFiles.map((filePath) => {
        const file = params.manifest.files[filePath]
        return `<<<CURRENT_FILE:${filePath}>>>\n${file?.content ?? ""}\n<<<END_CURRENT_FILE>>>`
    }).join("\n\n")

    return `You are Flowro's targeted edit coding agent.

Modify exactly one existing generated Vite React app file for the user's requested edit.

CRITICAL OUTPUT FORMAT:
Return ONLY marker-delimited full files. No markdown, no explanations.

Example:
<<<FILE:src/App.tsx>>>
complete updated file content
<<<END_FILE>>>

Hard rules:
- Output exactly these target files and no others: ${params.targetFiles.join(", ")}
- Do not create new files.
- Do not edit package.json, lockfiles, config files, or files not listed above.
- Preserve all unrelated code, imports, components, data, styling, and behavior.
- Make the smallest change that satisfies the instruction.
- Every emitted file must be complete from first line to last line.
- No ellipsis (...), no "rest of file", no truncation.
- Keep Vite-compatible TypeScript React code. Do not use Next.js APIs.

Search plan:
${JSON.stringify(params.searchPlan, null, 2)}

Search results:
${formatSearchResultsForPrompt(params.searchResults)}

Current target file contents:
${targetFileContents}

User instruction:
${params.instruction}

Generate the full updated target file now.`
}

export function buildTargetedEditRepairPrompt(params: {
    buildError: string
    instruction: string
    targetFiles: Record<string, string>
}): string {
    return `You are Flowro's targeted edit repair agent.

The targeted edit failed validation. Fix only the target file(s), preserving the user's requested edit.

Return JSON only:
{
  "files": [
    { "path": "src/App.tsx", "content": "complete file content" }
  ]
}

Rules:
- Include only files from this target set: ${Object.keys(params.targetFiles).join(", ")}
- Do not create new files.
- Do not edit protected config/package files.
- Return complete file content.

Validation error:
${params.buildError}

User instruction:
${params.instruction}

Current target files:
${JSON.stringify(params.targetFiles, null, 2)}`
}
