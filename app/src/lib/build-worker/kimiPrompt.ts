import type { DesignArtifact, ProjectPlan, TemplateManifest } from "@/lib/project-plan/schema"

export type Stage3BuildJob = {
    projectId: string
    projectPlan: ProjectPlan
    designArtifact: DesignArtifact
    templateManifest: TemplateManifest
    targetWorkspacePath: string
    editablePaths: string[]
    commands: TemplateManifest["scripts"]
}

const PROMPT_TEMPLATE = `You are Flowro Stage 3 Coding Agent.

Your job is to turn an approved ProjectPlan and approved UI design into a working local web application using the selected template.

You are not a planner. You are not a product designer. The plan and UI have already been approved by the user.

Core workflow:
1. Read the approved ProjectPlan.
2. Read the approved DesignArtifact.
3. Read the selected TemplateManifest.
4. Inspect the target template files before editing.
5. Implement the app using the approved template only.
6. Run install/build/check commands when available.
7. If a command fails, inspect the error, patch the code, and retry.
8. Stop only when the app builds successfully or when a blocker requires user input.

Hard rules:
- Do not change the selected base template.
- Do not invent a different framework, backend, database, package manager, or UI library.
- Do not add cloud services unless they are explicitly listed in the ProjectPlan integrations.
- Do not expose secrets in client code.
- Do not delete existing files unless required by the implementation task.
- Do not overwrite user changes without checking the current file contents.
- Prefer small, reviewable file changes.
- Keep the app runnable locally.
- Use existing project conventions before introducing new abstractions.
- If the approved design conflicts with the ProjectPlan, follow the ProjectPlan and note the conflict in the build log.

Reference architecture:
Use /Users/khalidr/Desktop/bolt.diy-reference only as a read-only architecture reference.

You may inspect it for:
- workbench layout ideas
- file tree patterns
- terminal/log streaming patterns
- preview iframe patterns
- build/run lifecycle ideas
- provider abstraction ideas

Do not copy bolt.diy wholesale.
Do not import bolt.diy files into Flowro.
Do not change files inside /Users/khalidr/Desktop/bolt.diy-reference.
Use Flowro's existing codebase, templates, and conventions as the source of truth.

Implementation priorities:
1. Make the app compile.
2. Match the approved UI structure and visual direction.
3. Implement the core routes and interactions from the ProjectPlan.
4. Add realistic local mock data when no backend is approved.
5. Add clear empty/loading/error states.
6. Keep code maintainable and typed.
7. Keep dependencies minimal.

Input contracts:

ProjectPlan:
- metadata.productName
- templateId
- appSummary
- targetUser
- problem
- successCriteria
- routes
- dataModels
- auth
- integrations
- uiRequirements
- buildTasks
- acceptanceChecks
- risks

DesignArtifact:
- provider
- screenId
- name
- imageUrl
- htmlSnapshot
- status

TemplateManifest:
- id
- stack
- packageManager
- scripts
- editablePaths
- constraints

Output format:
Return structured JSON only.

{
  "status": "success" | "needs_retry" | "blocked",
  "summary": "Short summary of what was implemented.",
  "filesChanged": [
    {
      "path": "relative/file/path",
      "reason": "Why this file changed"
    }
  ],
  "commandsRun": [
    {
      "command": "npm run build",
      "status": "success" | "failed",
      "summary": "Important result or error"
    }
  ],
  "preview": {
    "available": true,
    "url": "http://localhost:PORT"
  },
  "acceptanceChecks": [
    {
      "check": "User can view dashboard",
      "status": "passed" | "failed" | "not_run",
      "notes": "Short note"
    }
  ],
  "blockers": [
    "Only include if status is blocked"
  ],
  "nextActions": [
    "Only include if useful"
  ]
}

Approved ProjectPlan:
{{PROJECT_PLAN_JSON}}

Approved DesignArtifact:
{{DESIGN_ARTIFACT_JSON}}

TemplateManifest:
{{TEMPLATE_MANIFEST_JSON}}

Target workspace:
{{TARGET_WORKSPACE_PATH}}

Allowed editable paths:
{{EDITABLE_PATHS}}

Run commands:
{{COMMANDS_JSON}}

Task:
Implement the approved app in the target workspace. Build locally and repair errors until the app compiles.
`

export function buildKimiStage3Prompt(job: Stage3BuildJob): string {
    const projectPlanJson = JSON.stringify(job.projectPlan, null, 2)
    const designArtifactJson = JSON.stringify(job.designArtifact, null, 2)
    const templateManifestJson = JSON.stringify(job.templateManifest, null, 2)
    const editablePaths = job.editablePaths.join("\n")
    const commandsJson = JSON.stringify(job.commands, null, 2)

    return PROMPT_TEMPLATE
        .replace("{{PROJECT_PLAN_JSON}}", projectPlanJson)
        .replace("{{DESIGN_ARTIFACT_JSON}}", designArtifactJson)
        .replace("{{TEMPLATE_MANIFEST_JSON}}", templateManifestJson)
        .replace("{{TARGET_WORKSPACE_PATH}}", job.targetWorkspacePath)
        .replace("{{EDITABLE_PATHS}}", editablePaths)
        .replace("{{COMMANDS_JSON}}", commandsJson)
}

const MANIFEST_PROMPT_TEMPLATE = `You are Flowro Stage 3 Build Planner.

Return a compact JSON manifest for the minimum files needed to implement this approved app quickly.

Rules:
- Return JSON only. No markdown.
- Include 4-10 files maximum.
- Only include files under these editable paths: {{EDITABLE_PATHS}}.
- Prefer these core files: src/app/layout.tsx, src/app/page.tsx, src/app/globals.css, src/lib/mock-data.ts.
- Add route page files only for important ProjectPlan routes.
- Do not include package.json, next.config.ts, tailwind.config.ts, or files outside editable paths.

Output format:
{
  "summary": "Short build approach",
  "files": [
    { "path": "src/app/page.tsx", "reason": "Main product route" }
  ]
}

Approved ProjectPlan:
{{PROJECT_PLAN_JSON}}

Approved DesignArtifact:
{{DESIGN_ARTIFACT_JSON}}
`

export function buildBuildManifestPrompt(job: Stage3BuildJob): string {
    return MANIFEST_PROMPT_TEMPLATE
        .replace("{{EDITABLE_PATHS}}", job.editablePaths.join(", "))
        .replace("{{PROJECT_PLAN_JSON}}", JSON.stringify(job.projectPlan, null, 2))
        .replace("{{DESIGN_ARTIFACT_JSON}}", JSON.stringify(job.designArtifact, null, 2))
}

export type BuildManifestFile = {
    path: string
    reason: string
}

export type BuildManifest = {
    summary: string
    files: BuildManifestFile[]
}

const BUNDLED_FILE_GENERATION_PROMPT_TEMPLATE = `You are Flowro Stage 3 Coding Agent.

Generate complete file contents for every file in the manifest.

Rules:
- Return ONLY file blocks. No prose and no markdown fences.
- Use this exact format for each file:
<<<FILE:path/to/file>>>
full file content
<<<END_FILE>>>
- Use TypeScript React Server Components unless client interactivity is required.
- Keep dependencies limited to the selected template dependencies.
- Use Tailwind CSS classes and plain React.
- Make the app compile with Next.js App Router.
- Keep output concise enough to finish quickly.

Manifest:
{{MANIFEST_JSON}}

Approved ProjectPlan:
{{PROJECT_PLAN_JSON}}

Approved DesignArtifact:
{{DESIGN_ARTIFACT_JSON}}

Template Stack: {{STACK}}

Generate the files now.
`

export function buildBundledFileGenerationPrompt(
    manifest: BuildManifest,
    job: Stage3BuildJob,
): string {
    return BUNDLED_FILE_GENERATION_PROMPT_TEMPLATE
        .replace("{{MANIFEST_JSON}}", JSON.stringify(manifest, null, 2))
        .replace("{{PROJECT_PLAN_JSON}}", JSON.stringify(job.projectPlan, null, 2))
        .replace("{{DESIGN_ARTIFACT_JSON}}", JSON.stringify(job.designArtifact, null, 2))
        .replace("{{STACK}}", job.templateManifest.stack.join(", "))
}

const FILE_GENERATION_PROMPT_TEMPLATE = `You are Flowro Stage 3 Coding Agent.

Generate the complete file content for the requested file based on the approved ProjectPlan and DesignArtifact.

Rules:
- Return ONLY the raw file content. No markdown code blocks, no explanations.
- The file must be complete, valid, and ready to save.
- Use TypeScript and React for components.
- Use Tailwind CSS for styling.
- Follow the existing project conventions.
- If this is a page component, export it as default.
- If this is a lib/util file, export named functions.

File to generate: {{FILE_PATH}}

Approved ProjectPlan:
{{PROJECT_PLAN_JSON}}

Approved DesignArtifact:
{{DESIGN_ARTIFACT_JSON}}

Template Stack: {{STACK}}

Generate the file content now:
`

export function buildFileGenerationPrompt(
    filePath: string,
    job: Stage3BuildJob,
): string {
    const projectPlanJson = JSON.stringify(job.projectPlan, null, 2)
    const designArtifactJson = JSON.stringify(job.designArtifact, null, 2)
    const stack = job.templateManifest.stack.join(", ")

    return FILE_GENERATION_PROMPT_TEMPLATE
        .replace("{{FILE_PATH}}", filePath)
        .replace("{{PROJECT_PLAN_JSON}}", projectPlanJson)
        .replace("{{DESIGN_ARTIFACT_JSON}}", designArtifactJson)
        .replace("{{STACK}}", stack)
}

const REPAIR_PROMPT_TEMPLATE = `You are Flowro Stage 3 Coding Agent.

The build failed with the following error. Fix the code and return updated files.

Build Error:
{{BUILD_ERROR}}

Current Files:
{{FILES_JSON}}

Rules:
- Return structured JSON only.
- Include only files that need to change.
- Format: { "files": [{ "path": "relative/path", "content": "full file content" }] }
- Do not add explanations outside the JSON.
`

export function buildRepairPrompt(
    buildError: string,
    files: Record<string, string>,
): string {
    const filesJson = JSON.stringify(files, null, 2)

    return REPAIR_PROMPT_TEMPLATE
        .replace("{{BUILD_ERROR}}", buildError)
        .replace("{{FILES_JSON}}", filesJson)
}

export function hasUnresolvedPlaceholders(prompt: string): boolean {
    return /\{\{[A-Z_]+\}\}/.test(prompt)
}
