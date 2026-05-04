import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts"
import { AIMessage, HumanMessage, type BaseMessage } from "@langchain/core/messages"
import { z } from "zod"
import { createStructuredModel, createStructuredModelForIntent, getModelConfigForStage } from "@/lib/langchain/client"
import {
    clarificationQuestionSchema,
    clarificationResponseSchema,
    discussionResponseSchema,
} from "@/lib/prd/schema"
import { projectPlanGenerateResponseSchema, type ProjectPlan } from "@/lib/project-plan/schema"

const FALLBACK_PRD_MODEL = "anthropic/claude-haiku-4.5"
const CLARIFICATION_QUESTION_BUDGET = 3
const PRE_PRD_BLOCKING_TAGS = new Set<MissingInfoTag>([
    "target_user",
    "problem",
    "core_workflow",
    "mvp_scope",
    "constraints",
])

const missingInfoTagSchema = z.enum([
    "target_user",
    "problem",
    "core_workflow",
    "mvp_scope",
    "constraints",
    "success_metrics",
    "admin_ops",
    "integrations",
    "tech_preferences",
])

const enhancedSeedSchema = z.object({
    productIdea: z.string().min(1),
    targetUser: z.string().min(1),
    problem: z.string().min(1),
    likelyScope: z.array(z.string().min(1)).min(1),
    constraints: z.array(z.string().min(1)).default([]),
    assumptions: z.array(z.string().min(1)).default([]),
    knownContextSummary: z.string().min(1),
    missingInfoTags: z.array(missingInfoTagSchema).max(5),
    readyForPrd: z.boolean(),
})

const clarificationDraftSchema = z.object({
    message: z.string().min(1),
    questions: z.array(clarificationQuestionSchema).min(1).max(3),
    remainingRequired: z.number().int().min(0).max(3),
})

type MissingInfoTag = z.infer<typeof missingInfoTagSchema>
type EnhancedSeed = z.infer<typeof enhancedSeedSchema>

interface ChatMessage {
    role: "user" | "assistant" | string
    content: string
    timestamp?: string
    intent?: "initial" | "clarification" | "discussion" | "proposal"
}

export type Intent = "initial" | "clarification" | "discussion"

export interface GenerateInput {
    message: string
    context?: ChatMessage[]
    currentPlan?: ProjectPlan | null
}

export interface GenerateResult {
    intent: Intent
    message: string
    projectPlan?: ProjectPlan
    rawContent: string
    productName?: string
    questions?: z.infer<typeof clarificationQuestionSchema>[]
    remainingRequired?: number
    stage?: "clarify"
    modelUsed?: string
}

export function normalizeUBPFields(): void {
    // Retained only for compatibility with legacy imports during the cutover.
}

function toHistoryMessages(context?: ChatMessage[]): BaseMessage[] {
    if (!context) {
        return []
    }

    const messages: BaseMessage[] = []

    context.slice(-8).forEach((message) => {
        if (message.role === "assistant") {
            messages.push(new AIMessage(message.content))
        }

        if (message.role === "user") {
            messages.push(new HumanMessage(message.content))
        }
    })

    return messages
}

export function hasPriorClarificationTurn(context?: ChatMessage[]): boolean {
    return (context || []).some((message) => message.role === "assistant" && message.intent === "clarification")
}

export function shouldAskPrePrdClarification(context?: ChatMessage[]): boolean {
    return !hasPriorClarificationTurn(context)
}

export function getClarificationQuestionBudget(): number {
    return CLARIFICATION_QUESTION_BUDGET
}

export function getBlockingMissingInfoTags(tags: MissingInfoTag[]): MissingInfoTag[] {
    return tags.filter((tag) => PRE_PRD_BLOCKING_TAGS.has(tag))
}

function withWebOnlyAssumption(enhanced: EnhancedSeed): EnhancedSeed {
    const missingInfoTags = getBlockingMissingInfoTags(enhanced.missingInfoTags)
    const constraints = Array.from(new Set([
        ...enhanced.constraints,
        "Initial project plan scope is a web application only.",
    ]))
    const assumptions = Array.from(new Set([
        ...enhanced.assumptions,
        "Generate the first project plan for a single web experience.",
        "Do not ask about mobile platforms or native apps before the first project plan.",
    ]))

    return {
        ...enhanced,
        constraints,
        assumptions,
        missingInfoTags,
    }
}

export function createClarificationResponse(payload: z.infer<typeof clarificationDraftSchema>) {
    return clarificationResponseSchema.parse({
        intent: "clarification",
        message: payload.message.trim(),
        questions: payload.questions,
        remainingRequired: payload.remainingRequired,
        stage: "clarify",
    })
}

const enhanceSeedPrompt = ChatPromptTemplate.fromMessages([
    [
        "system",
        `You are Flowro AI preparing internal context before project plan generation.

Return structured data only.

Summarize the user's product direction into a normalized brief:
- productIdea
- targetUser
- problem
- likelyScope
- constraints
- assumptions
- knownContextSummary
- missingInfoTags
- readyForPrd

Rules:
- Use the full conversation history plus the latest message.
- Assume the first project plan is for a web-only experience.
- Capture what is explicitly known; infer lightly only when the inference is obvious.
- readyForPrd should be true only when the core product shape is clear enough to generate a solid first project plan.
- missingInfoTags should contain only the unresolved high-impact gaps.
- Never mention that this is an internal step.`,
    ],
    new MessagesPlaceholder("history"),
    ["human", "{input}"],
])

const clarificationPrompt = ChatPromptTemplate.fromMessages([
    [
        "system",
        `You are Flowro AI collecting the minimum information needed before generating a project plan.

Return structured data only.

Rules:
- Ask exactly {questionBudget} concise questions.
- Ask only one clarification batch before project plan generation.
- Questions must target product-shaping gaps from the enhanced brief.
- Each question must be multiple-choice with 2-5 options.
- Include one final option with label "Other" and kind "other" when a custom answer would be useful.
- Use selectionMode "single" when only one answer should be chosen.
- Use selectionMode "multiple" when multiple answers are valid.
- All non-custom options must use kind "preset".
- Ask at most 3 questions total.
- Focus on only these areas: primary user, problem, core workflow, MVP scope, and critical constraints.
- Never ask about platform selection, mobile apps, iOS, Android, responsive/mobile support, or native clients.
- Never ask the user to choose vendors, SDKs, hosting providers, or other implementation details before the first project plan.
- Keep the message short and direct.
- Do not generate the project plan yet.
- Do not show or mention any internal rewritten prompt.`,
    ],
    ["system", "### ENHANCED BRIEF\n{enhancedBrief}"],
    new MessagesPlaceholder("history"),
    ["human", "{input}"],
])

const initialPrompt = ChatPromptTemplate.fromMessages([
    [
        "system",
        `You are Flowro AI. Convert the clarified product brief into a deterministic ProjectPlan for an app builder.

Return structured data only.

Use this exact shape:
- metadata: productName, version, status
- templateId: must be "vite-react-app"
- appSummary, targetUser, problem
- successCriteria
- routes: path, name, purpose, primaryActions
- dataModels: name, purpose, fields
- auth: required, notes
- integrations: name, purpose, requiredForV1
- uiRequirements
- buildTasks: id, title, description, status
- acceptanceChecks
- risks

Rules:
- Use the enhanced brief as the source of truth and use the chat history only to resolve detail.
- templateId must equal exactly "vite-react-app".
- Routes must describe real screens/pages the generated app should implement.
- Build tasks must be concrete and implementation-relevant.
- UI requirements must be specific enough for the build contract to guide generated landing and product screens.
- UI requirements must include a visual thesis, landing page direction, product app direction, and motion/accessibility expectations.
- The generated app should open with a polished landing page first, then move users into the usable product app.
- The landing page should make the product name the strongest first-viewport signal with one memorable visual idea and a clear CTA into the app.
- The product app should be dense, useful, and workflow-oriented rather than a marketing page.
- Data models should only contain necessary product data.
- Never use "Flowro" as the product name.`,
    ],
    ["system", "### ENHANCED BRIEF\n{enhancedBrief}"],
    new MessagesPlaceholder("history"),
    ["human", "{input}"],
])

const discussionPrompt = ChatPromptTemplate.fromMessages([
    [
        "system",
        `You are Flowro AI helping a PM think through a product.

Respond conversationally in 2-5 sentences.
- Do not propose patches.
- Do not return ProjectPlan JSON.
- If current ProjectPlan context is provided, use it to ground the answer.`,
    ],
    ["system", "### CURRENT PROJECT PLAN\n{currentPrd}"],
    new MessagesPlaceholder("history"),
    ["human", "{input}"],
])

async function invokeStructuredInitialWithFallback(
    enhancedBriefJson: string,
    input: string,
    history: BaseMessage[]
): Promise<{
    parsed: z.infer<typeof projectPlanGenerateResponseSchema>
    modelUsed: string
}> {
    const primaryConfig = getModelConfigForStage("initial")
    const fallbackConfig = {
        ...primaryConfig,
        model: FALLBACK_PRD_MODEL,
    }

    try {
        const primaryModel = createStructuredModel(projectPlanGenerateResponseSchema, primaryConfig)
        const primaryChain = initialPrompt.pipe(primaryModel)
        const primaryResponse = await primaryChain.invoke({
            input,
            history,
            enhancedBrief: enhancedBriefJson,
        })

        return {
            parsed: projectPlanGenerateResponseSchema.parse(primaryResponse),
            modelUsed: primaryConfig.model || "openai/gpt-5.4-mini",
        }
    } catch {
        const fallbackModel = createStructuredModel(projectPlanGenerateResponseSchema, fallbackConfig)
        const fallbackChain = initialPrompt.pipe(fallbackModel)
        const fallbackResponse = await fallbackChain.invoke({
            input,
            history,
            enhancedBrief: enhancedBriefJson,
        })

        return {
            parsed: projectPlanGenerateResponseSchema.parse(fallbackResponse),
            modelUsed: fallbackConfig.model || FALLBACK_PRD_MODEL,
        }
    }
}

export async function generateFromMessage(input: GenerateInput): Promise<GenerateResult> {
    const history = toHistoryMessages(input.context)

    if (!input.currentPlan) {
        const enhancementModel = createStructuredModel(enhancedSeedSchema, {
            ...getModelConfigForStage("promptEnhancer"),
        })
        const enhancementChain = enhanceSeedPrompt.pipe(enhancementModel)
        const enhancedResponse = await enhancementChain.invoke({
            input: input.message,
            history,
        })
        const enhanced = withWebOnlyAssumption(enhancedSeedSchema.parse(enhancedResponse))
        const enhancedBriefJson = JSON.stringify(enhanced, null, 2)

        if (shouldAskPrePrdClarification(input.context)) {
            const questionBudget = getClarificationQuestionBudget()
            const clarificationModel = createStructuredModel(clarificationDraftSchema, {
                ...getModelConfigForStage("clarification"),
                maxTokens: 700,
            })
            const clarificationChain = clarificationPrompt.pipe(clarificationModel)
            const clarificationResponse = await clarificationChain.invoke({
                input: input.message,
                history,
                enhancedBrief: enhancedBriefJson,
                questionBudget,
            })

            const parsedDraft = clarificationDraftSchema.parse(clarificationResponse)
            const parsed = createClarificationResponse({
                ...parsedDraft,
                questions: parsedDraft.questions.slice(0, questionBudget),
                remainingRequired: Math.min(parsedDraft.remainingRequired, questionBudget),
            })

            return {
                intent: parsed.intent,
                message: parsed.message,
                questions: parsed.questions,
                remainingRequired: parsed.remainingRequired,
                stage: parsed.stage,
                rawContent: JSON.stringify(parsed),
                modelUsed: getModelConfigForStage("clarification").model || "google/gemini-3-flash-preview",
            }
        }

        const { parsed, modelUsed } = await invokeStructuredInitialWithFallback(
            enhancedBriefJson,
            input.message,
            history
        )

        return {
            intent: parsed.intent,
            message: parsed.message,
            projectPlan: parsed.projectPlan,
            rawContent: JSON.stringify(parsed),
            productName: parsed.projectPlan.metadata.productName,
            modelUsed,
        }
    }

    const model = createStructuredModelForIntent(discussionResponseSchema, "discussion")
    const chain = discussionPrompt.pipe(model)
    const response = await chain.invoke({
        input: input.message,
        history,
        currentPrd: JSON.stringify(input.currentPlan, null, 2),
    })

    const parsed = discussionResponseSchema.parse(response)

    return {
        intent: parsed.intent,
        message: parsed.message,
        rawContent: JSON.stringify(parsed),
        modelUsed: getModelConfigForStage("discussion").model || "google/gemini-3-flash-preview",
    }
}
