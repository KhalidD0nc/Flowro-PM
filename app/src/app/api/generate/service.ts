import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts"
import { AIMessage, HumanMessage, type BaseMessage } from "@langchain/core/messages"
import { createStructuredModelForIntent } from "@/lib/langchain/client"
import {
    discussionResponseSchema,
    generatePrdResponseSchema,
    type PRDConfig,
} from "@/lib/prd/schema"

interface ChatMessage {
    role: string
    content: string
    timestamp?: string
}

export type Intent = "initial" | "discussion"

export interface GenerateInput {
    message: string
    context?: ChatMessage[]
    currentPrd?: PRDConfig | null
}

export interface GenerateResult {
    intent: Intent
    message: string
    prdConfig?: PRDConfig
    rawContent: string
    productName?: string
}

export function normalizeUBPFields(): void {
    // Retained only for compatibility with legacy imports during the cutover.
}

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

const initialPrompt = ChatPromptTemplate.fromMessages([
    [
        "system",
        `You are Flowro AI. Convert the user's idea into a deterministic PRD configuration.

Return structured data only.

Use this exact shape:
- metadata: productName, platforms, targetAudience, designVibe
- entities: concrete data models and fields
- flows: user-facing navigation flows with explicit step IDs and nextStepId links when the flow continues
- features: core requirements with priority, scope, and acceptance criteria

Rules:
- Infer reasonable defaults instead of asking follow-up questions.
- metadata.platforms must include at least one of: web, ios, android.
- features must be concrete and implementation-relevant.
- flows must be realistic product flows, not abstract statements.
- entities should be only the data models needed for the product.
- Never use "Flowro" as the product name.`,
    ],
    new MessagesPlaceholder("history"),
    ["human", "{input}"],
])

const discussionPrompt = ChatPromptTemplate.fromMessages([
    [
        "system",
        `You are Flowro AI helping a PM think through a product.

Respond conversationally in 2-5 sentences.
- Do not propose patches.
- Do not return PRD JSON.
- If current PRD context is provided, use it to ground the answer.`,
    ],
    ["system", "### CURRENT PRD\n{currentPrd}"],
    new MessagesPlaceholder("history"),
    ["human", "{input}"],
])

export async function generateFromMessage(input: GenerateInput): Promise<GenerateResult> {
    const history = toHistoryMessages(input.context)

    if (!input.currentPrd) {
        const model = createStructuredModelForIntent(generatePrdResponseSchema, "initial")
        const chain = initialPrompt.pipe(model)
        const response = await chain.invoke({
            input: input.message,
            history,
        })

        const parsed = generatePrdResponseSchema.parse(response)

        return {
            intent: parsed.intent,
            message: parsed.message,
            prdConfig: parsed.prdConfig,
            rawContent: JSON.stringify(parsed),
            productName: parsed.prdConfig.metadata.productName,
        }
    }

    const model = createStructuredModelForIntent(discussionResponseSchema, "discussion")
    const chain = discussionPrompt.pipe(model)
    const response = await chain.invoke({
        input: input.message,
        history,
        currentPrd: JSON.stringify(input.currentPrd, null, 2),
    })

    const parsed = discussionResponseSchema.parse(response)

    return {
        intent: parsed.intent,
        message: parsed.message,
        rawContent: JSON.stringify(parsed),
    }
}
