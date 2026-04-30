import {
    buildBuildManifestPrompt,
    buildBundledFileGenerationPrompt,
    buildKimiStage3Prompt,
    hasUnresolvedPlaceholders,
    type BuildManifest,
    type Stage3BuildJob,
} from "../lib/build-worker/agentPrompt"
import { getTemplateManifest } from "../lib/project-plan/schema"

const validPlan = {
    metadata: {
        productName: "Task Orbit",
        version: "0.1",
        status: "approved" as const,
    },
    templateId: "nextjs-app" as const,
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

const validDesignArtifact = {
    id: "design-1",
    projectId: "project-1",
    provider: "stitch" as const,
    stitchProjectId: "stitch-1",
    screenId: "screen-1",
    name: "Dashboard Design",
    imageUrl: "https://example.com/image.png",
    htmlSnapshot: "<html><body>Design</body></html>",
    status: "approved" as const,
}

const templateManifest = getTemplateManifest("nextjs-app")

const baseJob: Stage3BuildJob = {
    projectId: "project-1",
    projectPlan: validPlan,
    designArtifact: validDesignArtifact,
    templateManifest,
    targetWorkspacePath: "/Users/khalidr/Desktop/Flowro_PM_Project/Flowro-PM/generated-apps/project-1",
    editablePaths: templateManifest.editablePaths,
    commands: templateManifest.scripts,
}

const manifest: BuildManifest = {
    summary: "Core files",
    files: [
        { path: "src/app/page.tsx", reason: "Dashboard route" },
        { path: "src/lib/mock-data.ts", reason: "Local preview data" },
    ],
}

export function runKimiPromptTests(): Array<{ name: string; passed: boolean }> {
    return [
        {
            name: "buildKimiStage3Prompt replaces every placeholder",
            passed: !hasUnresolvedPlaceholders(buildKimiStage3Prompt(baseJob)),
        },
        {
            name: "buildKimiStage3Prompt includes the approved ProjectPlan JSON",
            passed: buildKimiStage3Prompt(baseJob).includes('"productName": "Task Orbit"'),
        },
        {
            name: "buildKimiStage3Prompt includes the approved DesignArtifact JSON",
            passed: buildKimiStage3Prompt(baseJob).includes('"screenId": "screen-1"'),
        },
        {
            name: "buildKimiStage3Prompt includes the target workspace path",
            passed: buildKimiStage3Prompt(baseJob).includes(baseJob.targetWorkspacePath),
        },
        {
            name: "buildKimiStage3Prompt does not include any '{{' or '}}' after replacement",
            passed: !buildKimiStage3Prompt(baseJob).includes("{{") && !buildKimiStage3Prompt(baseJob).includes("}}"),
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
            passed: buildBuildManifestPrompt(baseJob).includes("4-10 files maximum") &&
                buildBuildManifestPrompt(baseJob).includes("src/app"),
        },
        {
            name: "buildBundledFileGenerationPrompt includes deterministic file markers",
            passed: buildBundledFileGenerationPrompt(manifest, baseJob).includes("<<<FILE:path/to/file>>>") &&
                buildBundledFileGenerationPrompt(manifest, baseJob).includes("src/lib/mock-data.ts"),
        },
    ]
}

if (require.main === module) {
    const results = runKimiPromptTests()
    const passed = results.filter((result) => result.passed).length

    console.log("\nKimiPrompt Tests\n")
    results.forEach((result) => {
        console.log(`${result.passed ? "PASS" : "FAIL"}  ${result.name}`)
    })
    console.log(`\nSummary: ${passed}/${results.length} passed`)

    if (passed !== results.length) {
        process.exit(1)
    }
}
