import {
    buildBuildManifestPrompt,
    buildBundledFileGenerationPrompt,
    buildPrompt,
    hasUnresolvedPlaceholders,
    type BuildManifest,
    type BuildJob,
} from "../lib/build-worker/agentPrompt"
import { createBuildContract, getTemplateManifest } from "../lib/project-plan/schema"

const validPlan = {
    metadata: {
        productName: "Task Orbit",
        version: "0.1",
        status: "approved" as const,
    },
    templateId: "vite-react-app" as const,
    appSummary: "A focused workspace for planning team tasks.",
    targetUser: "Product teams",
    problem: "Teams need a faster way to turn planning notes into actionable work.",
    successCriteria: ["A user can create a task plan in under five minutes."],
    routes: [
        {
            path: "/",
            name: "Dashboard",
            purpose: "Show active planning work.",
            primaryActions: ["Create task", "Review plan"],
        },
    ],
    dataModels: [
        {
            name: "Task",
            purpose: "Store work items.",
            fields: ["id: string", "title: string"],
        },
    ],
    auth: {
        required: false,
        notes: "No accounts required for the first local version.",
    },
    integrations: [],
    uiRequirements: ["Use a focused dashboard layout with clear task states."],
    buildTasks: [
        {
            id: "T-1",
            title: "Build dashboard",
            description: "Create the main planning dashboard.",
            status: "pending" as const,
        },
    ],
    acceptanceChecks: ["Dashboard renders without authentication."],
    risks: [],
}

const templateManifest = getTemplateManifest("vite-react-app")
const buildContract = createBuildContract("project-1", validPlan, templateManifest)

const baseJob: BuildJob = {
    projectId: "project-1",
    projectPlan: validPlan,
    buildContract,
    templateManifest,
    targetWorkspacePath: "/Users/khalidr/Desktop/Flowro_PM_Project/Flowro-PM/generated-apps/project-1",
    editablePaths: templateManifest.editablePaths,
    commands: templateManifest.scripts,
}

const supabaseTemplateManifest = getTemplateManifest("vite-react-supabase-app")
const supabasePlan = {
    ...validPlan,
    templateId: "vite-react-supabase-app" as const,
    database: {
        provider: "supabase_postgres" as const,
        authMode: "email_only" as const,
        rlsStrategy: "user_owned" as const,
    },
}
const supabaseJob: BuildJob = {
    projectId: "project-2",
    projectPlan: supabasePlan,
    buildContract: createBuildContract("project-2", supabasePlan, supabaseTemplateManifest),
    templateManifest: supabaseTemplateManifest,
    targetWorkspacePath: "/Users/khalidr/Desktop/Flowro_PM_Project/Flowro-PM/generated-apps/project-2",
    editablePaths: supabaseTemplateManifest.editablePaths,
    commands: supabaseTemplateManifest.scripts,
    supabaseConfig: supabasePlan.database,
    supabaseContext: {
        projectRef: "abc123",
        projectUrl: "https://abc123.supabase.co",
        browserKey: "sb_publishable_test",
        browserKeyType: "publishable",
        anonKey: "sb_publishable_test",
        supabaseProjectId: "abc123",
        canonicalTables: [
            {
                modelName: "Task",
                tableName: "task",
                columns: [
                    { fieldName: "title", columnName: "title", pgType: "text", required: false },
                ],
            },
        ],
        migrationPath: "supabase/migrations/20260505000000_flowro_generated_schema_abc123.sql",
        schemaSQL: "BEGIN; COMMIT;",
        rlsPoliciesSQL: "BEGIN; COMMIT;",
        typescriptTypes: "export type Database = {}",
    },
}

const manifest: BuildManifest = {
    summary: "Core files",
    files: [
        { path: "src/App.tsx", reason: "Dashboard route" },
        { path: "src/lib/mock-data.ts", reason: "Local preview data" },
    ],
}

export function runAgentPromptTests(): Array<{ name: string; passed: boolean }> {
    return [
        {
            name: "buildPrompt replaces every placeholder",
            passed: !hasUnresolvedPlaceholders(buildPrompt(baseJob)),
        },
        {
            name: "buildPrompt includes the approved ProjectPlan JSON",
            passed: buildPrompt(baseJob).includes('"productName": "Task Orbit"'),
        },
        {
            name: "buildPrompt includes the BuildContract JSON",
            passed: buildPrompt(baseJob).includes('"componentRules"') &&
                buildPrompt(baseJob).includes('"productName": "Task Orbit"'),
        },
        {
            name: "buildPrompt has no legacy design artifact fields",
            passed: !new RegExp(["screenId", "htmlSnapshot", "Design" + "Artifact"].join("|"), "i").test(buildPrompt(baseJob)),
        },
        {
            name: "buildPrompt includes the target workspace path",
            passed: buildPrompt(baseJob).includes(baseJob.targetWorkspacePath),
        },
        {
            name: "buildPrompt does not include any '{{' or '}}' after replacement",
            passed: !buildPrompt(baseJob).includes("{{") && !buildPrompt(baseJob).includes("}}"),
        },
        {
            name: "template manifest selection rejects invented template IDs",
            passed: (() => {
                try {
                    getTemplateManifest("made-up-stack")
                    return false
                } catch {
                    return true
                }
            })(),
        },
        {
            name: "buildBuildManifestPrompt asks for compact editable files",
            passed: buildBuildManifestPrompt(baseJob).includes("6-10 files maximum") &&
                buildBuildManifestPrompt(baseJob).includes("src/App.tsx") &&
                buildBuildManifestPrompt(baseJob).includes("src/pages/LandingPage.tsx") &&
                buildBuildManifestPrompt(baseJob).includes("src/pages/AppWorkspace.tsx"),
        },
        {
            name: "buildBundledFileGenerationPrompt includes deterministic file markers",
            passed: buildBundledFileGenerationPrompt(manifest, baseJob).includes("<<<FILE:src/styles.css>>>") &&
                buildBundledFileGenerationPrompt(manifest, baseJob).includes("<<<END_FILE>>>") &&
                buildBundledFileGenerationPrompt(manifest, baseJob).includes("src/lib/mock-data.ts"),
        },
        {
            name: "stage 3 prompts require landing route and app workspace",
            passed: buildPrompt(baseJob).includes('Route "/" is a polished product landing page') &&
                buildPrompt(baseJob).includes('route "/app" is the usable product workspace') &&
                buildPrompt(baseJob).includes('landing CTA must navigate to "/app"') &&
                buildBundledFileGenerationPrompt(manifest, baseJob).includes('Route "/" landing page MUST use <LandingShell>') &&
                buildBundledFileGenerationPrompt(manifest, baseJob).includes('Route "/app" workspace MUST use <AppShell>') &&
                buildBundledFileGenerationPrompt(manifest, baseJob).includes("BrowserRouter"),
        },
        {
            name: "generation and repair prompts warn against custom @apply aliases",
            passed: buildBundledFileGenerationPrompt(manifest, baseJob).includes("never write @apply text-label") &&
                buildBundledFileGenerationPrompt(manifest, baseJob).includes("@apply may only reference real Tailwind utility classes") &&
                buildPrompt(baseJob).includes("Tailwind v4 CSS rule"),
        },
        {
            name: "Supabase manifest prompt avoids mock-data fallback",
            passed: buildBuildManifestPrompt(supabaseJob).includes("do not include mock-data.ts") &&
                !buildBuildManifestPrompt(supabaseJob).includes("always include all seven"),
        },
        {
            name: "Supabase generation prompt uses canonical table names and publishable key",
            passed: buildBundledFileGenerationPrompt(manifest, supabaseJob).includes("Task -> task") &&
                buildBundledFileGenerationPrompt(manifest, supabaseJob).includes("VITE_SUPABASE_PUBLISHABLE_KEY") &&
                buildBundledFileGenerationPrompt(manifest, supabaseJob).includes('supabase.from("<table>")') &&
                !buildBundledFileGenerationPrompt(manifest, supabaseJob).includes("Table names: Task"),
        },
    ]
}

if (require.main === module) {
    const results = runAgentPromptTests()
    const passed = results.filter((result) => result.passed).length

    console.log("\nAgentPrompt Tests\n")
    results.forEach((result) => {
        console.log(`${result.passed ? "PASS" : "FAIL"}  ${result.name}`)
    })
    console.log(`\nSummary: ${passed}/${results.length} passed`)

    if (passed !== results.length) {
        process.exit(1)
    }
}
