import { getTemplateManifest, projectPlanSchema } from "../lib/project-plan/schema"

const validPlan = {
    metadata: {
        productName: "Task Orbit",
        version: "0.1",
        status: "draft",
    },
    templateId: "nextjs-app",
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
            status: "pending",
        },
    ],
    acceptanceChecks: ["Dashboard renders without authentication."],
    risks: [],
}

export function runProjectPlanTests(): Array<{ name: string; passed: boolean }> {
    return [
        {
            name: "accepts a valid project plan",
            passed: projectPlanSchema.safeParse(validPlan).success,
        },
        {
            name: "rejects invented templates",
            passed: !projectPlanSchema.safeParse({ ...validPlan, templateId: "made-up-stack" }).success,
        },
        {
            name: "requires at least one route",
            passed: !projectPlanSchema.safeParse({ ...validPlan, routes: [] }).success,
        },
        {
            name: "returns the nextjs template manifest",
            passed: getTemplateManifest("nextjs-app").scripts.build === "npm run build",
        },
    ]
}

if (require.main === module) {
    const results = runProjectPlanTests()
    const passed = results.filter((result) => result.passed).length

    console.log("\nProjectPlan Tests\n")
    results.forEach((result) => {
        console.log(`${result.passed ? "PASS" : "FAIL"}  ${result.name}`)
    })
    console.log(`\nSummary: ${passed}/${results.length} passed`)

    if (passed !== results.length) {
        process.exit(1)
    }
}
