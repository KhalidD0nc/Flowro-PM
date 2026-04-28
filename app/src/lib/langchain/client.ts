/**
 * LangChain Client Module
 * 
 * Phase 2: LangChain Integration
 * 
 * Uses LangChain with OpenRouter for:
 * - Structured output guarantees with `withStructuredOutput()`
 * - Prompt templates with variables
 * - Built-in retry and fallback chains
 * - Foundation for RAG in Phase 3
 * 
 * @module langchain/client
 * @version 2.0.0
 */

import { ChatOpenAI } from "@langchain/openai"
import { z } from "zod"
import { logInfo, logError, logDebug } from "../logger"

// =============================================================================
// Types
// =============================================================================

export interface ModelConfig {
    temperature?: number
    maxTokens?: number
    model?: string
}

export type Intent = 'initial' | 'clarification' | 'discussion' | 'proposal'
export type ModelStage = 'promptEnhancer' | Intent

function getModelForStage(stage: ModelStage): string {
    switch (stage) {
        case 'promptEnhancer':
            return process.env.OPENROUTER_MODEL_PROMPT_ENHANCER || process.env.OPENROUTER_MODEL_CLARIFICATION || "google/gemini-3-flash-preview"
        case 'clarification':
        case 'discussion':
            return process.env.OPENROUTER_MODEL_CLARIFICATION || "google/gemini-3-flash-preview"
        case 'initial':
            return process.env.OPENROUTER_MODEL_PRD || "openai/gpt-5.4-mini"
        case 'proposal':
            return process.env.OPENROUTER_MODEL_PRD || "openai/gpt-5.4-mini"
    }
}

// Model configuration per intent for cost optimization
export const MODEL_CONFIG: Record<Intent, ModelConfig> = {
    initial: {
        temperature: 0.4,
        maxTokens: 4000,
        model: getModelForStage('initial'),
    },
    clarification: {
        temperature: 0.3,
        maxTokens: 1200,
        model: getModelForStage('clarification'),
    },
    discussion: {
        temperature: 0.4,
        maxTokens: 700,
        model: getModelForStage('discussion'),
    },
    proposal: {
        temperature: 0.5, // More deterministic for proposals
        maxTokens: 1800,
        model: getModelForStage('proposal'),
    },
}

export const STAGE_MODEL_CONFIG: Record<ModelStage, ModelConfig> = {
    promptEnhancer: {
        temperature: 0.2,
        maxTokens: 900,
        model: getModelForStage('promptEnhancer'),
    },
    initial: MODEL_CONFIG.initial,
    clarification: MODEL_CONFIG.clarification,
    discussion: MODEL_CONFIG.discussion,
    proposal: MODEL_CONFIG.proposal,
}

// =============================================================================
// Model Factory
// =============================================================================

/**
 * Creates a ChatOpenAI model configured for OpenRouter.
 * Uses your existing OpenRouter setup with intent-based configuration.
 * 
 * @example
 * const model = createModel({ temperature: 0.5, maxTokens: 2000 })
 * const response = await model.invoke(messages)
 */
export function createModel(options?: ModelConfig): ChatOpenAI {
    const config = {
        temperature: options?.temperature ?? 0.7,
        maxTokens: options?.maxTokens ?? 4000,
        modelName: options?.model ?? process.env.OPENROUTER_MODEL_PRD ?? process.env.OPENROUTER_MODEL ?? "openai/gpt-5.4-mini",
    }

    logDebug('langchain_model_created', {
        model: config.modelName,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
    })

    return new ChatOpenAI({
        modelName: config.modelName,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
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

/**
 * Creates a model for a specific intent with optimized configuration.
 * 
 * @example
 * const model = createModelForIntent('discussion')
 * // Uses lighter config: maxTokens=500, temperature=0.7
 */
export function createModelForIntent(intent: Intent): ChatOpenAI {
    const config = MODEL_CONFIG[intent]
    
    logInfo('langchain_intent_model', {
        intent,
        model: config.model,
        maxTokens: config.maxTokens,
    })

    return createModel(config)
}

export function getModelConfigForStage(stage: ModelStage): ModelConfig {
    return STAGE_MODEL_CONFIG[stage]
}

export function createModelForStage(stage: ModelStage): ChatOpenAI {
    const config = STAGE_MODEL_CONFIG[stage]

    logInfo('langchain_stage_model', {
        stage,
        model: config.model,
        maxTokens: config.maxTokens,
    })

    return createModel(config)
}

/**
 * Creates a structured model that guarantees output conformity to a Zod schema.
 * This is the key LangChain feature for reliable AI outputs.
 * 
 * @example
 * const DiscussionSchema = z.object({
 *   intent: z.literal('discussion'),
 *   message: z.string().min(10)
 * })
 * 
 * const model = createStructuredModel(DiscussionSchema)
 * const response = await model.invoke(messages)
 * // response is guaranteed to match DiscussionSchema
 */
export function createStructuredModel<T extends z.ZodType>(
    schema: T,
    options?: ModelConfig
) {
    const model = createModel(options)
    
    logDebug('structured_model_created', {
        schemaName: schema.description || 'unnamed',
        temperature: options?.temperature,
    })

    return model.withStructuredOutput(schema)
}

/**
 * Creates a structured model optimized for a specific intent.
 * Combines intent-based configuration with schema enforcement.
 * 
 * @example
 * const model = createStructuredModelForIntent(ProposalSchema, 'proposal')
 * // Uses proposal config: maxTokens=1500, temperature=0.5
 */
export function createStructuredModelForIntent<T extends z.ZodType>(
    schema: T,
    intent: Intent
) {
    const config = MODEL_CONFIG[intent]

    logInfo('structured_intent_model', {
        intent,
        model: config.model,
        maxTokens: config.maxTokens,
    })

    return createStructuredModel(schema, config)
}

export function createStructuredModelForStage<T extends z.ZodType>(
    schema: T,
    stage: ModelStage
) {
    const config = STAGE_MODEL_CONFIG[stage]

    logInfo('structured_stage_model', {
        stage,
        model: config.model,
        maxTokens: config.maxTokens,
    })

    return createStructuredModel(schema, config)
}

// =============================================================================
// Token Budgeting
// =============================================================================

/**
 * Get max tokens for an intent (for cost optimization).
 * 
 * Cost savings:
 * - initial: Full 4000 tokens for complete UBP generation
 * - discussion: Only 500 tokens for short conversational responses
 * - proposal: 1500 tokens for medium complexity changes
 */
export function getMaxTokensForIntent(intent: Intent): number {
    return MODEL_CONFIG[intent].maxTokens ?? 4000
}

/**
 * Estimate cost for a request based on intent and input tokens.
 * Uses approximate OpenRouter pricing for DeepSeek.
 * 
 * @returns Estimated cost in USD
 */
export function estimateCost(intent: Intent, inputTokens: number): number {
    const outputTokens = getMaxTokensForIntent(intent)
    
    let inputRate = 0.5
    let outputRate = 3

    if (intent === 'initial' || intent === 'proposal') {
        inputRate = 0.75
        outputRate = 4.5
    }

    const inputCost = (inputTokens / 1000) * inputRate / 1000
    const outputCost = (outputTokens / 1000) * outputRate / 1000
    
    return inputCost + outputCost
}

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Test the LangChain client configuration.
 * Use this to verify OpenRouter connection is working.
 */
export async function testConnection(): Promise<{
    success: boolean
    model: string
    error?: string
}> {
    try {
        const model = createModel({ maxTokens: 10 })
        const response = await model.invoke([
            { role: 'user', content: 'Respond with just "OK"' }
        ])
        
        return {
            success: true,
            model: process.env.OPENROUTER_MODEL_PRD || process.env.OPENROUTER_MODEL || "openai/gpt-5.4-mini",
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        logError('langchain_connection_failed', { error: errorMessage })
        
        return {
            success: false,
            model: process.env.OPENROUTER_MODEL_PRD || process.env.OPENROUTER_MODEL || "openai/gpt-5.4-mini",
            error: errorMessage,
        }
    }
}

// =============================================================================
// Exports
// =============================================================================

export const TEST_EXAMPLES = {
    modelCreation: {
        description: "Creates a model with default configuration",
        code: `const model = createModel()`,
        expectedBehavior: "Returns ChatOpenAI instance configured for OpenRouter",
    },
    intentBasedModel: {
        description: "Creates model optimized for discussion intent",
        code: `const model = createModelForIntent('discussion')`,
        expectedBehavior: "Returns model with maxTokens=500 for cost efficiency",
    },
    structuredOutput: {
        description: "Creates model with guaranteed schema output",
        code: `
const schema = z.object({ message: z.string() })
const model = createStructuredModel(schema)
const response = await model.invoke(messages)
        `,
        expectedBehavior: "Response always matches schema, no parsing needed",
    },
    costEstimation: {
        description: "Estimates cost before making request",
        input: { intent: 'discussion', inputTokens: 1000 },
        expectedOutput: {
            discussion: "$0.002", // Much cheaper than initial
            initial: "$0.012",   // Full cost
        },
    },
}
