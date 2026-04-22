import { prdConfigSchema } from "../lib/prd/schema"

const validPrd = {
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
            description: "A prioritized work item linked to a workspace.",
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
                    actor: "PM",
                    screen: "Roadmap Builder",
                    action: "Add the first roadmap item",
                    outcome: "Roadmap item appears on the board",
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

export function runPrdConfigTests(): Array<{ name: string; passed: boolean }> {
    const results: Array<{ name: string; passed: boolean }> = []

    results.push({
        name: "accepts valid PRD config",
        passed: prdConfigSchema.safeParse(validPrd).success,
    })

    results.push({
        name: "rejects missing platforms",
        passed: !prdConfigSchema.safeParse({
            ...validPrd,
            metadata: {
                ...validPrd.metadata,
                platforms: [],
            },
        }).success,
    })

    results.push({
        name: "rejects empty features",
        passed: !prdConfigSchema.safeParse({
            ...validPrd,
            features: [],
        }).success,
    })

    results.push({
        name: "rejects malformed flow steps",
        passed: !prdConfigSchema.safeParse({
            ...validPrd,
            flows: [
                {
                    id: "flow-bad",
                    name: "Broken flow",
                    steps: [
                        {
                            id: "step-1",
                            actor: "User",
                            screen: "",
                            action: "Click submit",
                        },
                    ],
                },
            ],
        }).success,
    })

    results.push({
        name: "rejects invalid priority and scope",
        passed: !prdConfigSchema.safeParse({
            ...validPrd,
            features: [
                {
                    ...validPrd.features[0],
                    priority: "high",
                    scope: "phase-two",
                },
            ],
        }).success,
    })

    results.push({
        name: "accepts entity field relationships",
        passed: prdConfigSchema.safeParse(validPrd).success,
    })

    return results
}
