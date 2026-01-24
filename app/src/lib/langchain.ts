// LangChain LLM client for Flowro PM
// Uses OpenRouter via ChatOpenAI with structured outputs

import { ChatOpenAI } from "@langchain/openai"
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts"
import { z } from "zod"
import { HumanMessage, AIMessage, SystemMessage, BaseMessage } from "@langchain/core/messages"

// =============================================================================
// Zod Schemas for Structured Output
// =============================================================================

// UBP Section Schemas
const ProductVisionSchema = z.object({
    problem: z.string().describe("The core problem being solved"),
    targetActor: z.string().describe("Primary target user/audience"),
    successSignal: z.string().describe("Key metric or indicator of success"),
})

const ScopeSchema = z.object({
    inScope: z.array(z.string()).describe("Features explicitly included"),
    outOfScope: z.array(z.string()).describe("Features explicitly excluded"),
    deferred: z.array(z.string()).describe("Features for later phases"),
})

const ActorsSchema = z.object({
    primary: z.string().describe("Main user type"),
    secondary: z.array(z.string()).describe("Supporting user types"),
    systems: z.array(z.string()).describe("External systems involved"),
})

const BehaviorSchema = z.object({
    id: z.string().describe("Unique ID like B-01, B-02"),
    trigger: z.string().describe("What initiates this behavior"),
    systemResponse: z.string().describe("How the system responds"),
    involvedActors: z.array(z.string()).describe("Who participates"),
    diagramCode: z.string().describe("Mermaid diagram code"),
})

const ConstraintsRisksSchema = z.object({
    constraints: z.array(z.string()).describe("Technical or business constraints"),
    assumptions: z.array(z.string()).describe("Key assumptions made"),
    risks: z.array(z.string()).describe("Identified risks"),
})

const TechStackSchema = z.object({
    frontend: z.string().describe("Frontend technology"),
    backend: z.string().describe("Backend technology"),
    database: z.string().describe("Database technology"),
})

const PhaseSchema = z.object({
    phase: z.string().describe("Phase name like Phase 1"),
    goal: z.string().describe("Phase objective"),
    outputs: z.array(z.string()).describe("Deliverables"),
})

const IntegrationSchema = z.object({
    service: z.string().describe("External service name"),
    purpose: z.string().describe("Why it's needed"),
    dataFlow: z.string().describe("How data flows"),
})

const ChangeLogEntrySchema = z.object({
    version: z.string(),
    summary: z.string(),
    reason: z.string(),
    impactedSections: z.array(z.string()),
})

// Full UBP Schema (for initial generation)
export const UBPSchema = z.object({
    intent: z.literal("initial"),
    message: z.string().describe("Brief conversational message for the user (3-5 sentences)"),
    metadata: z.object({
        productName: z.string().describe("Creative product name - NEVER use 'Flowro'"),
        version: z.string().default("0.1"),
        status: z.string().default("draft"),
    }),
    productVision: ProductVisionSchema,
    scope: ScopeSchema,
    actors: ActorsSchema,
    behaviors: z.array(BehaviorSchema).min(5).max(8).describe("5-8 key behaviors"),
    constraintsRisks: ConstraintsRisksSchema,
    techStack: TechStackSchema,
    phases: z.array(PhaseSchema).min(2).max(4),
    integrations: z.array(IntegrationSchema),
    changeLog: z.array(ChangeLogEntrySchema),
})

// Discussion Schema (for follow-up conversations)
export const DiscussionSchema = z.object({
    intent: z.literal("discussion"),
    message: z.string().describe("PM conversation response - explore options, ask questions"),
})

// Proposal Schema (for blueprint changes)
export const ProposalSchema = z.object({
    intent: z.literal("proposal"),
    message: z.string().describe("Summary of changes and reasoning"),
    proposedChanges: z.object({
        action: z.enum(["add", "update", "remove"]),
        summary: z.string().describe("What's being changed"),
        sections: z.array(z.string()).describe("Which UBP sections are affected"),
        changes: z.record(z.string(), z.unknown()).describe("The actual changes to apply"),
    }),
})

// Launch Task Schema (for auto-generation)
export const LaunchTaskSchema = z.object({
    title: z.string().describe("Clear milestone title"),
    description: z.string().describe("Details and acceptance criteria"),
    priority: z.enum(["low", "medium", "high", "critical"]),
    phase: z.string().describe("Which phase this belongs to"),
    category: z.enum(["planning", "development", "marketing", "launch", "post-launch"]),
    estimatedDuration: z.string().optional().describe("Rough time estimate"),
})

export const LaunchPlanSchema = z.object({
    tasks: z.array(LaunchTaskSchema).describe("Launch milestones generated from UBP"),
    summary: z.string().describe("Brief overview of the launch plan"),
})

// =============================================================================
// LangChain Model Configuration
// =============================================================================

function createModel() {
    return new ChatOpenAI({
        modelName: process.env.OPENROUTER_MODEL || "deepseek/deepseek-v3.2",
        temperature: 0.7,
        maxTokens: 4000,
        configuration: {
            baseURL: "https://openrouter.ai/api/v1",
            defaultHeaders: {
                "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
                "X-Title": "Flowro-PM",
            },
        },
        apiKey: process.env.OPENROUTER_API_KEY,
    })
}

// =============================================================================
// System Prompts
// =============================================================================

const UBP_SYSTEM_PROMPT = `You are Flowro AI, a Lead Product Manager creating Unified Blueprints (UBPs).

## PM THINKING (Apply to EVERY response)
1. What user DIDN'T say but definitely needs (auth, error handling, notifications)
2. Edge cases: What happens if X fails? First-time users?
3. Hidden actors: Who else? (admins, support, external APIs)
4. Growth path: What will they need in 3 months?
5. Generate 5-7 behaviors: happy path, errors, onboarding, admin flows

## RULES
- Generate complete UBP immediately - never ask clarifying questions
- Infer using industry best practices
- Include assumptions in your message
- Use Mermaid diagrams (sequenceDiagram or graph TD, 4-8 steps)
- NEVER use "Flowro" as productName (that's our brand)
- Be specific, never say "I've processed your request"
- Keep message to 3-5 sentences`

const DISCUSSION_SYSTEM_PROMPT = `You are Flowro AI, a Lead Product Manager having a conversation.

The user wants to discuss something about their product, NOT generate a new blueprint.
- Explore trade-offs and options
- Ask clarifying questions
- Be a thoughtful PM collaborator
- Keep responses conversational (3-5 sentences)
- Don't propose changes unless explicitly asked`

const PROPOSAL_SYSTEM_PROMPT = `You are Flowro AI, a Lead Product Manager proposing blueprint changes.

The user has confirmed they want changes. Generate a proposal with:
- Clear summary of what's changing
- Which sections are affected
- The actual changes in the correct UBP format
- Keep message brief (2-3 sentences explaining the change)`

const LAUNCH_PLAN_SYSTEM_PROMPT = `You are Flowro AI generating a Product Launch Plan from a UBP.

Analyze the UBP and create a high-level Product Roadmap for the founder to track progress.
The goal is to prevent confusion by focusing on user-facing features and milestones, NOT technical implementation details.

DO NOT create technical tasks like "Setup database", "Configure API", or "Install dependencies".
CREATE feature-focused stories like "User Login Flow", "Credit Card Payments", "Dashboard Analytics View", "Email Notifications".

Create 8-12 actionable product milestones covering:
1. Core Features (MVP functionality)
2. User Experience (Onboarding, settings, flows)
3. Monetization (Billing, plans - if applicable)
4. Launch Activities (Beta access, public release)

Assign each task a priority and categorization.`

// =============================================================================
// Intent Detection
// =============================================================================

type Intent = "initial" | "discussion" | "proposal"

function detectIntent(message: string, hasBlueprint: boolean, chatHistory: BaseMessage[]): Intent {
    const lowerMsg = message.toLowerCase()

    // Keywords that suggest proposal (user confirming changes)
    const proposalKeywords = [
        "yes", "add that", "let's do", "sounds good", "go ahead",
        "make that change", "update it", "include that", "approved"
    ]

    // Keywords that suggest discussion
    const discussionKeywords = [
        "how should", "what about", "trade-off", "options",
        "thoughts on", "compare", "difference between", "pros and cons",
        "should we", "which is better", "what do you think"
    ]

    // Check for proposal intent (user confirming a prior suggestion)
    if (hasBlueprint && chatHistory.length > 0) {
        const lastAIMessage = [...chatHistory].reverse().find(m => m instanceof AIMessage)
        if (lastAIMessage) {
            // If AI just asked/suggested something and user confirms
            for (const keyword of proposalKeywords) {
                if (lowerMsg.includes(keyword)) {
                    return "proposal"
                }
            }
        }
    }

    // Check for discussion intent
    for (const keyword of discussionKeywords) {
        if (lowerMsg.includes(keyword)) {
            return "discussion"
        }
    }

    // No blueprint yet = initial
    if (!hasBlueprint) {
        return "initial"
    }

    // Default to discussion for follow-ups
    return "discussion"
}

// =============================================================================
// Main Generation Functions
// =============================================================================

export interface ChatMessage {
    role: "user" | "assistant"
    content: string
}

export interface GenerateInput {
    message: string
    context?: ChatMessage[]
    currentBlueprint?: unknown
}

export interface GenerateResult {
    intent: Intent
    message: string
    content: unknown
    proposedChanges?: {
        action: "add" | "update" | "remove"
        summary: string
        sections: string[]
        changes: Record<string, unknown>
    }
    rawContent: string
    productName?: string
}

/**
 * Convert chat history to LangChain messages
 */
function buildChatHistory(context?: ChatMessage[]): BaseMessage[] {
    if (!context || context.length === 0) return []

    return context.slice(-5).map(msg => {
        if (msg.role === "user") {
            return new HumanMessage(msg.content)
        }
        return new AIMessage(msg.content)
    })
}

/**
 * Generate UBP from initial user message
 */
async function generateInitialUBP(
    message: string,
    chatHistory: BaseMessage[]
): Promise<GenerateResult> {
    const model = createModel()
    const structuredModel = model.withStructuredOutput(UBPSchema)

    const prompt = ChatPromptTemplate.fromMessages([
        new SystemMessage(UBP_SYSTEM_PROMPT),
        new MessagesPlaceholder("history"),
        new HumanMessage("{input}"),
    ])

    const chain = prompt.pipe(structuredModel)

    const result = await chain.invoke({
        history: chatHistory,
        input: message,
    })

    // Extract content (everything except intent, message, metadata)
    const { intent, message: aiMessage, metadata, ...ubpContent } = result

    return {
        intent: "initial",
        message: aiMessage,
        content: { ...ubpContent, metadata },
        rawContent: JSON.stringify(result),
        productName: metadata?.productName,
    }
}

/**
 * Generate discussion response
 */
async function generateDiscussion(
    message: string,
    chatHistory: BaseMessage[],
    currentBlueprint?: unknown
): Promise<GenerateResult> {
    const model = createModel()
    const structuredModel = model.withStructuredOutput(DiscussionSchema)

    let systemContent = DISCUSSION_SYSTEM_PROMPT
    if (currentBlueprint) {
        systemContent += `\n\n### CURRENT BLUEPRINT\n${JSON.stringify(currentBlueprint)}`
    }

    const prompt = ChatPromptTemplate.fromMessages([
        new SystemMessage(systemContent),
        new MessagesPlaceholder("history"),
        new HumanMessage("{input}"),
    ])

    const chain = prompt.pipe(structuredModel)

    const result = await chain.invoke({
        history: chatHistory,
        input: message,
    })

    return {
        intent: "discussion",
        message: result.message,
        content: null,
        rawContent: JSON.stringify(result),
    }
}

/**
 * Generate proposal for blueprint changes
 */
async function generateProposal(
    message: string,
    chatHistory: BaseMessage[],
    currentBlueprint: unknown
): Promise<GenerateResult> {
    const model = createModel()
    const structuredModel = model.withStructuredOutput(ProposalSchema)

    const prompt = ChatPromptTemplate.fromMessages([
        new SystemMessage(PROPOSAL_SYSTEM_PROMPT + `\n\n### CURRENT BLUEPRINT\n${JSON.stringify(currentBlueprint)}`),
        new MessagesPlaceholder("history"),
        new HumanMessage("{input}"),
    ])

    const chain = prompt.pipe(structuredModel)

    const result = await chain.invoke({
        history: chatHistory,
        input: message,
    })

    return {
        intent: "proposal",
        message: result.message,
        content: null,
        proposedChanges: result.proposedChanges,
        rawContent: JSON.stringify(result),
    }
}

/**
 * Main generation function - detects intent and routes appropriately
 */
export async function generateFromMessage(input: GenerateInput): Promise<GenerateResult> {
    const { message, context, currentBlueprint } = input
    const chatHistory = buildChatHistory(context)
    const hasBlueprint = !!currentBlueprint

    // Detect intent
    const intent = detectIntent(message, hasBlueprint, chatHistory)

    console.log("=== LangChain Generation ===")
    console.log("Detected Intent:", intent)
    console.log("Has Blueprint:", hasBlueprint)
    console.log("Chat History Length:", chatHistory.length)

    try {
        switch (intent) {
            case "initial":
                return await generateInitialUBP(message, chatHistory)

            case "discussion":
                return await generateDiscussion(message, chatHistory, currentBlueprint)

            case "proposal":
                if (!currentBlueprint) {
                    // Fallback to discussion if no blueprint
                    return await generateDiscussion(message, chatHistory)
                }
                return await generateProposal(message, chatHistory, currentBlueprint)

            default:
                return await generateDiscussion(message, chatHistory, currentBlueprint)
        }
    } catch (error) {
        console.error("LangChain generation error:", error)
        throw error
    }
}

/**
 * Generate launch plan from UBP
 */
export async function generateLaunchPlan(ubp: unknown): Promise<z.infer<typeof LaunchPlanSchema>> {
    const model = createModel()
    const structuredModel = model.withStructuredOutput(LaunchPlanSchema)

    const prompt = ChatPromptTemplate.fromMessages([
        new SystemMessage(LAUNCH_PLAN_SYSTEM_PROMPT),
        new HumanMessage("Generate a launch plan for this product:\n\n{ubp}"),
    ])

    const chain = prompt.pipe(structuredModel)

    const result = await chain.invoke({
        ubp: JSON.stringify(ubp, null, 2),
    })

    console.log("=== Launch Plan Generated ===")
    console.log("Tasks count:", result.tasks.length)

    return result
}
