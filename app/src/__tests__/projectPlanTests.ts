import { createBuildContract, getTemplateManifest, projectPlanSchema } from "../lib/project-plan/schema"
import { getBuildStartPlanError } from "../lib/build-worker/startGuard"

const validPlan = {
    metadata: {
        productName: "Task Orbit",
        version: "0.1",
        status: "draft",
    },
    templateId: "vite-react-app",
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
            name: "returns the vite template manifest",
            passed: getTemplateManifest("vite-react-app").stack.includes("Vite") &&
                getTemplateManifest("vite-react-app").scripts.dev === "npm run dev",
        },
        {
            name: "creates a build contract from an approved project plan",
            passed: (() => {
                const approvedPlan = projectPlanSchema.parse({
                    ...validPlan,
                    metadata: { ...validPlan.metadata, status: "approved" },
                })
                const manifest = getTemplateManifest("vite-react-app")
                const contract = createBuildContract("project-1", approvedPlan, manifest)
                return contract.productName === "Task Orbit" &&
                    contract.templateId === "vite-react-app" &&
                    contract.componentRules.length > 0 &&
                    contract.securityGuardrails.some((rule) => rule.includes("secrets"))
            })(),
        },
        {
            name: "build contract requires landing-first generated apps",
            passed: (() => {
                const approvedPlan = projectPlanSchema.parse({
                    ...validPlan,
                    metadata: { ...validPlan.metadata, status: "approved" },
                })
                const manifest = getTemplateManifest("vite-react-app")
                const contract = createBuildContract("project-1", approvedPlan, manifest)
                return contract.frontendGuardrails.some((rule) => rule.includes("route /") && rule.includes("route /app")) &&
                    contract.frontendGuardrails.some((rule) => rule.includes("CTA") && rule.includes("/app")) &&
                    contract.frontendGuardrails.some((rule) => rule.includes("prefers-reduced-motion")) &&
                    contract.componentRules.some((rule) => rule.includes("lucide-react"))
            })(),
        },
        {
            name: "build start guard rejects missing or draft plans",
            passed: getBuildStartPlanError(null)?.status === 409 &&
                getBuildStartPlanError({ status: "draft" })?.error.includes("Approve the project plan"),
        },
        {
            name: "build start guard allows approved plans",
            passed: getBuildStartPlanError({ status: "approved" }) === null,
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
