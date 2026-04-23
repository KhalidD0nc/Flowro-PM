import { AIMessage, HumanMessage, type BaseMessage } from "@langchain/core/messages"
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts"
import { createStructuredModelForIntent } from "@/lib/langchain/client"
import {
    discussionResponseSchema,
    proposalResponseSchema,
    prdConfigSchema,
    type PRDConfig,
    type ProposedPrdChanges,
} from "@/lib/prd/schema"
import { hashPrdConfig, normalizePrdConfig } from "@/lib/prd/editor"

interface ChatMessage {
    role: "user" | "assistant"
    content: string
    timestamp?: string
}

export type EnhanceIntent = "discussion" | "proposal"

export interface EnhanceInput {
    prompt: string
    currentPrd: PRDConfig
    context?: ChatMessage[]
}

export interface EnhanceResult {
    intent: EnhanceIntent
    message: string
    proposedChanges?: ProposedPrdChanges
    rawContent: string
}

const proposalDraftSchema = proposalResponseSchema.omit({
    proposedChanges: true,
}).extend({
    proposedChanges: proposalResponseSchema.shape.proposedChanges.omit({
        basePrdHash: true,
    }),
})

function toHistoryMessages(context?: ChatMessage[]): BaseMessage[] {
    if (!context) {
        return []
    }

    const messages: BaseMessage[] = []
    context.slice(-6).forEach((message) => {
        if (message.role === "assistant") {
            messages.push(new AIMessage(message.content))
        }

        if (message.role === "user") {
            messages.push(new HumanMessage(message.content))
        }
    })

    return messages
}

export function classifyEnhancementIntent(prompt: string): EnhanceIntent {
    const normalized = prompt.trim().toLowerCase()
    if (!normalized) {
        return "discussion"
    }

    const proposalPatterns = [
        /\badd\b/,
        /\bremove\b/,
        /\bdelete\b/,
        /\bchange\b/,
        /\bupdate\b/,
        /\brefine\b/,
        /\bedit\b/,
        /\brewrite\b/,
        /\binclud(e|ing)\b/,
        /\bmodify\b/,
        /\bexpand\b/,
        /\brename\b/,
        /\breplace\b/,
        /\bmake\b.+\b(flow|feature|screen|entity|journey|platform|criteria)\b/,
    ]

    const containsProposalVerb = proposalPatterns.some((pattern) => pattern.test(normalized))
    if (!containsProposalVerb) {
        return "discussion"
    }

    const isPoliteEditRequest = /^(?:please\s+)?(?:can|could|would|will)\s+(?:you|we)\b/.test(normalized)
    if (isPoliteEditRequest) {
        return "proposal"
    }

    const isAdvisoryQuestion =
        /^(?:how|what|why|when|where|who|is|are|should|do|does|did)\b/.test(normalized) ||
        normalized.endsWith("?")

    return isAdvisoryQuestion ? "discussion" : "proposal"
}

const discussionPrompt = ChatPromptTemplate.fromMessages([
    [
        "system",
        `You are Flowro AI helping a PM reason about an existing PRD.

Respond conversationally in 2-5 sentences.
- Do not propose or apply PRD updates.
- Do not return JSON patches.
- Ground the answer in the provided PRD when relevant.`,
    ],
    ["system", "### CURRENT PRD\n{currentPrd}"],
    new MessagesPlaceholder("history"),
    ["human", "{input}"],
])

const proposalPrompt = ChatPromptTemplate.fromMessages([
    [
        "system",
        `You are Flowro AI updating a deterministic PRD configuration.

Return structured data only.

Your job:
- Read the current PRD and the user's change request.
- Produce the FULL next PRD config after applying the request.
- Preserve all unrelated fields and sections.
- Keep the update realistic, implementation-relevant, and internally consistent.

Rules:
- The message must briefly summarize the change in 1-2 sentences.
- proposedChanges.sections must reference PRD areas like metadata, features, entities, flows.
- proposedChanges.changes must be a compact summary object, not the full PRD.
- proposedChanges.nextPrdConfig must be the complete updated PRD.
- nextPrdConfig.metadata.platforms must include at least one of: web, ios, android.
- nextPrdConfig.features must remain concrete and include acceptance criteria.
- nextPrdConfig.flows must remain valid step-by-step product flows.
- nextPrdConfig.entities should only contain necessary data models.
- Never rename the product to Flowro unless the current PRD already uses that name.`,
    ],
    ["system", "### CURRENT PRD\n{currentPrd}"],
    new MessagesPlaceholder("history"),
    ["human", "{input}"],
])

export async function enhancePrdFromMessage(input: EnhanceInput): Promise<EnhanceResult> {
    const normalizedPrd = normalizePrdConfig(input.currentPrd)
    const currentPrdJson = JSON.stringify(normalizedPrd, null, 2)
    const history = toHistoryMessages(input.context)
    const intent = classifyEnhancementIntent(input.prompt)

    if (intent === "discussion") {
        const model = createStructuredModelForIntent(discussionResponseSchema, "discussion")
        const chain = discussionPrompt.pipe(model)
        const response = await chain.invoke({
            input: input.prompt,
            history,
            currentPrd: currentPrdJson,
        })

        const parsed = discussionResponseSchema.parse(response)
        return {
            intent: parsed.intent,
            message: parsed.message,
            rawContent: JSON.stringify(parsed),
        }
    }

    const model = createStructuredModelForIntent(proposalDraftSchema, "proposal")
    const chain = proposalPrompt.pipe(model)
    const response = await chain.invoke({
        input: input.prompt,
        history,
        currentPrd: currentPrdJson,
    })

    const parsed = proposalDraftSchema.parse(response)
    const nextPrdConfig = prdConfigSchema.parse(normalizePrdConfig(parsed.proposedChanges.nextPrdConfig))
    const proposedChanges = proposalResponseSchema.shape.proposedChanges.parse({
        ...parsed.proposedChanges,
        basePrdHash: hashPrdConfig(normalizedPrd),
        nextPrdConfig,
    })

    return {
        intent: parsed.intent,
        message: parsed.message,
        proposedChanges,
        rawContent: JSON.stringify({
            intent: parsed.intent,
            message: parsed.message,
            proposedChanges,
        }),
    }
}
