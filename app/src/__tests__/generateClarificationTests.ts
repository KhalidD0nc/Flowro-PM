import {
    anyGenerateResponseSchema,
    clarificationResponseSchema,
    getLatestClarificationResponse,
    parseClarificationResponseContent,
} from "../lib/prd/schema"
import {
    createClarificationResponse,
    enforceWebOnlyPrdConfig,
    getBlockingMissingInfoTags,
    getClarificationQuestionBudget,
    hasPriorClarificationTurn,
    shouldAskPrePrdClarification,
} from "../app/api/generate/service"
import type { PRDConfig } from "../lib/prd/schema"
import { estimateRequestCost, previewIntent } from "../app/api/generate/langchainService"

interface TestResult {
    name: string
    passed: boolean
    details: string
}

function runGenerateClarificationTests(): TestResult[] {
    const results: TestResult[] = []

    const firstTurnContext = [
        { role: "user" as const, content: "Build a B2B onboarding portal for IT teams." },
    ]
    const followUpContext = [
        ...firstTurnContext,
        {
            role: "assistant" as const,
            content: "I need a few details before I generate the PRD.\n\n1. Who is the main user?\n2. What is the core workflow?\n3. What must be in MVP?",
            intent: "clarification" as const,
        },
        { role: "user" as const, content: "IT admins upload employee lists and trigger app setup." },
    ]
    const nonBlockingTags = ["integrations", "tech_preferences", "success_metrics", "admin_ops"] as const

    results.push({
        name: "Clarification schema accepts public response payloads",
        passed: clarificationResponseSchema.safeParse({
            intent: "clarification",
            message: "I need a few details before I generate the PRD.",
            questions: [
                {
                    id: "q-primary-user",
                    prompt: "Who is the primary user?",
                    selectionMode: "single",
                    options: [
                        { id: "host", label: "Host / front desk", kind: "preset" },
                        { id: "manager", label: "Restaurant manager", kind: "preset" },
                    ],
                },
                {
                    id: "q-core-workflow",
                    prompt: "Which workflow matters most in MVP?",
                    selectionMode: "single",
                    options: [
                        { id: "reservations", label: "Reservations", kind: "preset" },
                        { id: "waitlist", label: "Waitlist", kind: "preset" },
                    ],
                },
                {
                    id: "q-guest-comms",
                    prompt: "Which guest communication channels should MVP include?",
                    selectionMode: "multiple",
                    options: [
                        { id: "sms", label: "SMS", kind: "preset" },
                        { id: "email", label: "Email", kind: "preset" },
                    ],
                },
            ],
            remainingRequired: 3,
            stage: "clarify",
        }).success,
        details: "The public generate contract accepts clarification responses.",
    })

    const normalizedClarification = createClarificationResponse({
        message: "I need a few details before I generate the PRD.",
        questions: [
            {
                id: "q-primary-user",
                prompt: "Who is the primary user?",
                selectionMode: "single",
                options: [
                    { id: "host", label: "Host / front desk", kind: "preset" },
                    { id: "manager", label: "Restaurant manager", kind: "preset" },
                ],
            },
            {
                id: "q-core-workflow",
                prompt: "What is the core workflow?",
                selectionMode: "single",
                options: [
                    { id: "reservations", label: "Reservations", kind: "preset" },
                    { id: "waitlist", label: "Waitlist", kind: "preset" },
                ],
            },
            {
                id: "q-mvp",
                prompt: "What absolutely must be in the MVP?",
                selectionMode: "multiple",
                options: [
                    { id: "table-assignments", label: "Table assignments", kind: "preset" },
                    { id: "guest-messages", label: "Guest messages", kind: "preset" },
                ],
            },
        ],
        remainingRequired: 3,
    })
    results.push({
        name: "Clarification response is normalized in application code",
        passed: normalizedClarification.intent === "clarification" && normalizedClarification.stage === "clarify",
        details: "The app stamps literal intent and stage fields instead of asking the model to produce them.",
    })

    results.push({
        name: "Generate response union accepts clarification responses",
        passed: anyGenerateResponseSchema.safeParse({
            intent: "clarification",
            message: "I need a few details before I generate the PRD.",
            questions: [
                {
                    id: "q-primary-user",
                    prompt: "Who is the primary user?",
                    selectionMode: "single",
                    options: [
                        { id: "host", label: "Host / front desk", kind: "preset" },
                        { id: "manager", label: "Restaurant manager", kind: "preset" },
                    ],
                },
                {
                    id: "q-core-workflow",
                    prompt: "What is the core workflow?",
                    selectionMode: "single",
                    options: [
                        { id: "reservations", label: "Reservations", kind: "preset" },
                        { id: "waitlist", label: "Waitlist", kind: "preset" },
                    ],
                },
                {
                    id: "q-mvp",
                    prompt: "What absolutely must be in the MVP?",
                    selectionMode: "multiple",
                    options: [
                        { id: "table-assignments", label: "Table assignments", kind: "preset" },
                        { id: "guest-messages", label: "Guest messages", kind: "preset" },
                    ],
                },
            ],
            remainingRequired: 3,
            stage: "clarify",
        }).success,
        details: "Generate route schemas now allow the pre-PRD clarification state.",
    })

    const serializedClarification = JSON.stringify(normalizedClarification)
    const fencedSerializedClarification = ["```json", serializedClarification, "```"].join("\n")
    results.push({
        name: "Clarification parser accepts persisted JSON strings",
        passed:
            parseClarificationResponseContent(serializedClarification)?.questions.length === normalizedClarification.questions.length,
        details: "Persisted assistant clarification content hydrates back into structured questions.",
    })

    results.push({
        name: "Clarification parser accepts fenced JSON strings",
        passed:
            parseClarificationResponseContent(fencedSerializedClarification)?.questions[0]?.id ===
            normalizedClarification.questions[0]?.id,
        details: "Transcript-safe fenced JSON still parses into clarification questions.",
    })

    results.push({
        name: "Latest clarification helper finds persisted assistant payloads",
        passed:
            getLatestClarificationResponse([
                {
                    role: "assistant" as const,
                    intent: "discussion" as const,
                    content: "Let me know what you'd like to explore.",
                },
                {
                    role: "assistant" as const,
                    intent: "clarification" as const,
                    content: serializedClarification,
                },
            ])?.questions[0]?.id === normalizedClarification.questions[0]?.id,
        details: "Workspace hydration resolves the latest clarification question set from chat history.",
    })

    results.push({
        name: "First no-PRD turn asks 3 clarification questions",
        passed: shouldAskPrePrdClarification(firstTurnContext) && getClarificationQuestionBudget() === 3,
        details: "Brand-new projects should start with three required questions.",
    })

    results.push({
        name: "Prior clarification turn disables any follow-up clarification round",
        passed: hasPriorClarificationTurn(followUpContext) && !shouldAskPrePrdClarification(followUpContext),
        details: "Once a clarification batch exists, the next no-PRD turn should go straight to PRD generation.",
    })

    results.push({
        name: "Non-blocking discovery tags do not keep the flow in clarification mode",
        passed: getBlockingMissingInfoTags([...nonBlockingTags]).length === 0,
        details: "Integrations, tech preferences, admin ops, and success metrics should not block the first PRD.",
    })

    results.push({
        name: "Clarification response preserves single and multi-select questions",
        passed:
            normalizedClarification.questions[0]?.selectionMode === "single" &&
            normalizedClarification.questions[2]?.selectionMode === "multiple",
        details: "Assistant clarification payloads keep the MCQ selection rules needed by the UI.",
    })

    const preview = previewIntent("Build me a CRM for recruiters", false)
    results.push({
        name: "Preview intent routes no-PRD requests to clarification",
        passed: preview.intent === "clarification",
        details: `Preview intent: ${preview.intent}`,
    })

    const costEstimate = estimateRequestCost("Build me a CRM for recruiters", false, 0)
    results.push({
        name: "Cost estimator uses clarification budget before PRD exists",
        passed: costEstimate.intent === "clarification" && costEstimate.tokenBudget === 1200,
        details: `Intent: ${costEstimate.intent}, token budget: ${costEstimate.tokenBudget}`,
    })

    const multiPlatformPrd: PRDConfig = {
        metadata: {
            productName: "Coach Atlas",
            platforms: ["web", "ios", "android"],
            targetAudience: "Fitness coaches running online bookings",
            designVibe: "Calm and structured",
        },
        entities: [],
        flows: [
            {
                id: "flow-booking",
                name: "Book session",
                steps: [
                    {
                        id: "step-1",
                        screen: "Landing",
                        action: "Choose coach",
                    },
                ],
            },
        ],
        features: [
            {
                id: "feature-booking",
                title: "Booking flow",
                description: "Lets customers book a coach.",
                priority: "must",
                scope: "mvp",
                acceptanceCriteria: ["Users can book a session."],
            },
        ],
    }
    const webOnlyPrd = enforceWebOnlyPrdConfig(multiPlatformPrd)
    results.push({
        name: "Generated PRDs are forced to web-only output",
        passed: webOnlyPrd.metadata.platforms.length === 1 && webOnlyPrd.metadata.platforms[0] === "web",
        details: "Generation should collapse any multi-platform output to a single web platform.",
    })

    return results
}

if (require.main === module) {
    const results = runGenerateClarificationTests()
    const passed = results.filter((result) => result.passed).length

    console.log("\nGenerate Clarification Tests\n")
    results.forEach((result) => {
        console.log(`${result.passed ? "PASS" : "FAIL"}  ${result.name}`)
        console.log(`  ${result.details}`)
    })
    console.log(`\nSummary: ${passed}/${results.length} passed`)

    if (passed !== results.length) {
        process.exit(1)
    }
}

export { runGenerateClarificationTests }
