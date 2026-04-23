import {
    canApplyProposal,
    getProposalDraftState,
    hashPrdConfig,
    normalizePrdConfig,
} from "@/lib/prd/editor"
import { parseProposedPrdChanges, proposalResponseSchema, type PRDConfig } from "@/lib/prd/schema"
import { classifyEnhancementIntent } from "@/app/api/enhance-prd/service"

interface TestResult {
    name: string
    passed: boolean
    details: string
}

const basePrd: PRDConfig = {
    metadata: {
        productName: "Task Orbit",
        platforms: ["web"],
        targetAudience: "Product teams coordinating roadmap work",
        designVibe: "Focused and operational",
    },
    entities: [
        {
            name: "Workspace",
            description: "Shared planning workspace.",
            fields: [
                { name: "id", type: "string", required: true },
                { name: "name", type: "string", required: true },
            ],
        },
    ],
    flows: [
        {
            id: "flow-onboarding",
            name: "Create workspace",
            steps: [
                {
                    id: "step-1",
                    screen: "Landing",
                    action: "Start a workspace",
                    outcome: "Workspace draft created",
                },
            ],
        },
    ],
    features: [
        {
            id: "feature-roadmap",
            title: "Roadmap board",
            description: "Lets PMs create and order roadmap items.",
            priority: "must",
            scope: "mvp",
            acceptanceCriteria: [
                "Users can create a roadmap item.",
            ],
        },
    ],
}

const nextPrd: PRDConfig = {
    ...basePrd,
    features: [
        ...basePrd.features,
        {
            id: "feature-reporting",
            title: "Admin reporting dashboard",
            description: "Lets admins review delivery health and roadmap velocity.",
            priority: "should",
            scope: "later",
            acceptanceCriteria: [
                "Admins can open a reporting dashboard.",
                "The dashboard shows roadmap health metrics.",
            ],
        },
    ],
}

function runAutopilotTests(): TestResult[] {
    const baseHash = hashPrdConfig(basePrd)
    const parsedProposal = parseProposedPrdChanges({
        action: "add",
        summary: "Add an admin reporting dashboard.",
        sections: ["features"],
        changes: {
            features: ["Admin reporting dashboard"],
        },
        basePrdHash: baseHash,
        nextPrdConfig: nextPrd,
    })

    const results: TestResult[] = []

    results.push({
        name: "Proposal parser accepts autopilot payloads",
        passed: !!parsedProposal,
        details: "Expected the structured proposal payload to validate successfully.",
    })

    results.push({
        name: "Prompt classifier detects proposal requests",
        passed: classifyEnhancementIntent("Add an admin reporting dashboard") === "proposal",
        details: "Mutating prompts should route to proposal mode.",
    })

    results.push({
        name: "Prompt classifier preserves discussion prompts",
        passed: classifyEnhancementIntent("What trade-offs come with adding admin analytics?") === "discussion",
        details: "Informational prompts should stay in discussion mode.",
    })

    results.push({
        name: "Prompt classifier treats polite edit questions as proposals",
        passed:
            classifyEnhancementIntent("Can you add SSO?") === "proposal" &&
            classifyEnhancementIntent("Could you update the onboarding flow?") === "proposal",
        details: "Polite requests to mutate the PRD should still enter proposal mode.",
    })

    results.push({
        name: "Prompt classifier keeps advisory mutation questions as discussion",
        passed: classifyEnhancementIntent("Should we add admin analytics?") === "discussion",
        details: "Advice-seeking questions should not trigger proposal generation.",
    })

    if (parsedProposal) {
        results.push({
            name: "Proposal state is ready when draft hash matches base hash",
            passed: getProposalDraftState(parsedProposal, basePrd) === "ready" && canApplyProposal(parsedProposal, basePrd),
            details: "Fresh proposals should remain actionable against the matching draft.",
        })

        results.push({
            name: "Proposal state becomes applied when candidate matches current draft",
            passed: getProposalDraftState(parsedProposal, nextPrd) === "applied",
            details: "Applied proposals should be detected from the current draft hash.",
        })

        const stalePrd = normalizePrdConfig({
            ...basePrd,
            metadata: {
                ...basePrd.metadata,
                designVibe: "Premium and cinematic",
            },
        })

        results.push({
            name: "Proposal state becomes stale after unrelated draft edits",
            passed: getProposalDraftState(parsedProposal, stalePrd) === "stale" && !canApplyProposal(parsedProposal, stalePrd),
            details: "Any draft change after proposal generation should block application.",
        })

        results.push({
            name: "Proposal response schema accepts persisted assistant payloads",
            passed: proposalResponseSchema.safeParse({
                intent: "proposal",
                message: "I prepared the reporting dashboard update.",
                proposedChanges: parsedProposal,
            }).success,
            details: "Proposal responses should validate before persistence or rendering.",
        })
    }

    return results
}

if (require.main === module) {
    const results = runAutopilotTests()
    const passed = results.filter((result) => result.passed).length

    console.log("\nPRD Autopilot Tests\n")
    results.forEach((result) => {
        console.log(`${result.passed ? "PASS" : "FAIL"}  ${result.name}`)
        console.log(`  ${result.details}`)
    })
    console.log(`\nSummary: ${passed}/${results.length} passed`)

    if (passed !== results.length) {
        process.exit(1)
    }
}

export { runAutopilotTests }
