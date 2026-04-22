import { mapPRDEntitiesToMermaid, mapPRDFlowsToMermaid } from "@/lib/prd/mermaid"
import { normalizePrdConfig, validatePrdDraft } from "@/lib/prd/editor"
import type { PRDConfig } from "@/lib/prd/schema"

interface TestResult {
    name: string
    passed: boolean
    details: string
}

const samplePrd: PRDConfig = {
    metadata: {
        productName: "Task Orbit",
        platforms: ["web", "ios"],
        targetAudience: "Product teams coordinating weekly planning",
        designVibe: "Focused, calm, and data-dense",
    },
    entities: [
        {
            name: "Workspace",
            description: "A shared planning space for one team.",
            fields: [
                { name: "id", type: "string", required: true },
                { name: "name", type: "string", required: true },
            ],
        },
        {
            name: "RoadmapItem",
            description: "A work item tied to a workspace.",
            fields: [
                { name: "id", type: "string", required: true },
                { name: "workspaceId", type: "string", required: true, relationshipTo: "Workspace" },
            ],
        },
    ],
    flows: [
        {
            id: "flow-onboarding",
            name: "Create first roadmap",
            steps: [
                {
                    id: "step-1",
                    actor: "PM",
                    screen: "Workspace Setup",
                    action: "Create a workspace",
                    outcome: "Workspace is created",
                    nextStepId: "step-2",
                },
                {
                    id: "step-2",
                    screen: "Roadmap Builder",
                    action: "Add the first roadmap item",
                },
            ],
        },
    ],
    features: [
        {
            id: "feature-roadmaps",
            title: "Roadmap board",
            description: "Lets PMs create and order roadmap items.",
            priority: "must",
            scope: "mvp",
            acceptanceCriteria: [
                "Users can create a roadmap item with title and owner.",
                "Users can reorder items on the board.",
            ],
        },
    ],
}

function runEditorTests(): TestResult[] {
    const results: TestResult[] = []

    const flowChart = mapPRDFlowsToMermaid(samplePrd.flows)
    results.push({
        name: "Flow mapper includes explicit next step links",
        passed: flowChart.includes("step-1") && flowChart.includes("step-2") && flowChart.includes("-->|\"Workspace is created\"|"),
        details: "Expected explicit nextStepId edges with outcome labels in the Mermaid flowchart output.",
    })

    const entityChart = mapPRDEntitiesToMermaid(samplePrd.entities)
    results.push({
        name: "Entity mapper includes relationships",
        passed: entityChart.includes("ROADMAPITEM }o--|| WORKSPACE"),
        details: "Expected ERD relationship edges when relationshipTo is provided.",
    })

    const normalized = normalizePrdConfig({
        ...samplePrd,
        entities: [
            {
                ...samplePrd.entities[0],
                description: "",
                fields: [{ name: "id", type: "string", required: true, relationshipTo: "" }],
            },
        ],
        flows: [
            {
                ...samplePrd.flows[0],
                steps: [
                    {
                        ...samplePrd.flows[0].steps[0],
                        actor: "",
                        outcome: "",
                        nextStepId: "",
                    },
                ],
            },
        ],
    })

    results.push({
        name: "Normalizer strips blank optional strings",
        passed: normalized.entities[0].description === undefined &&
            normalized.entities[0].fields[0].relationshipTo === undefined &&
            normalized.flows[0].steps[0].actor === undefined &&
            normalized.flows[0].steps[0].outcome === undefined &&
            normalized.flows[0].steps[0].nextStepId === undefined,
        details: "Blank optional UI fields should be omitted before validation or persistence.",
    })

    const issues = validatePrdDraft(samplePrd)
    results.push({
        name: "Draft validator accepts valid PRD configs",
        passed: issues.length === 0,
        details: `Expected no validation issues, received ${issues.length}.`,
    })

    return results
}

if (require.main === module) {
    const results = runEditorTests()
    const passed = results.filter((result) => result.passed).length

    console.log("\nPRD Editor Tests\n")
    results.forEach((result) => {
        console.log(`${result.passed ? "PASS" : "FAIL"}  ${result.name}`)
        console.log(`  ${result.details}`)
    })
    console.log(`\nSummary: ${passed}/${results.length} passed`)

    if (passed !== results.length) {
        process.exit(1)
    }
}

export { runEditorTests }
