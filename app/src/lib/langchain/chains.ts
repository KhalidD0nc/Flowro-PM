/**
 * Intent-Specific LangChain Chains
 * 
 * Phase 2: LangChain Integration
 * 
 * Specialized chains per intent using:
 * - ChatPromptTemplate for structured prompts
 * - Structured output for guaranteed schema compliance
 * - Intent-based model configuration
 * - Proper message history handling
 * 
 * @module langchain/chains
 * @version 2.0.0
 */

import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts"
import { HumanMessage, AIMessage, SystemMessage, BaseMessage } from "@langchain/core/messages"
import { z } from "zod"
import { createStructuredModelForIntent, createModelForIntent, Intent } from "./client"
import {
    INITIAL_SYSTEM_PROMPT,
    DISCUSSION_SYSTEM_PROMPT,
    PROPOSAL_SYSTEM_PROMPT,
    buildSystemPrompt
} from "./prompts"
import {
    UBPResponseSchema,
    DiscussionResponseSchema,
    ProposalResponseSchema,
} from "../responseValidator"
import { logInfo, logError, logDebug } from "../logger"

// =============================================================================
// Types
// =============================================================================

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system'
    content: string
}

export interface ChainInput {
    input: string                  // Current user message
    history?: ChatMessage[]        // Previous messages
    blueprintContext?: string      // Relevant blueprint sections
    topicSummary?: string          // Summary of older conversation
}

export interface ChainResult<T> {
    success: boolean
    data?: T
    error?: string
    intent: Intent
    tokensUsed?: number
}

// =============================================================================
// Zod Schemas for Chains
// =============================================================================

/**
 * Schema for initial UBP generation.
 * Note: Using a slightly relaxed schema that the model can reliably fill.
 */
export const InitialOutputSchema = z.object({
    intent: z.literal('initial'),
    message: z.string().describe("Brief conversational message (3-5 sentences)"),
    metadata: z.object({
        productName: z.string().describe("Creative product name - NEVER use Flowro"),
        version: z.string().default("0.1"),
        status: z.string().default("draft"),
    }),
    productVision: z.object({
        problem: z.string().describe("The core problem being solved"),
        targetActor: z.string().describe("Primary target user"),
        successSignal: z.string().describe("Key success metric"),
    }),
    scope: z.object({
        inScope: z.array(z.string()).describe("Features in MVP"),
        outOfScope: z.array(z.string()).describe("Explicitly excluded"),
        deferred: z.array(z.string()).describe("For later phases"),
    }),
    actors: z.array(z.object({
        name: z.string().describe("Actor name"),
        description: z.string().describe("Actor description"),
        type: z.enum(['primary', 'secondary', 'system']).describe("Actor type"),
    })).describe("List of actors"),
    behaviors: z.array(z.object({
        id: z.string().describe("ID like B-01"),
        title: z.string().describe("Behavior title"),
        given: z.string().describe("Precondition").default(""),
        when: z.string().describe("Trigger action"),
        then: z.string().describe("Expected outcome"),
        diagram: z.string().describe("Mermaid diagram code").default(""),
        priority: z.enum(['high', 'medium', 'low']).default('medium'),
    })).min(5).max(8).describe("5-8 key behaviors"),
    constraints: z.array(z.object({
        type: z.enum(['warning', 'risk', 'constraint']),
        title: z.string(),
        description: z.string(),
    })).describe("Constraints, risks, and warnings"),
    techDecisions: z.array(z.object({
        category: z.string().describe("Frontend, Backend, or Database"),
        choice: z.string().describe("The chosen technology"),
        rationale: z.string().describe("Reason for the choice"),
    })).describe("Technology decisions"),
    phases: z.array(z.object({
        name: z.string(),
        description: z.string(),
        goals: z.array(z.string()),
        status: z.enum(['completed', 'current', 'upcoming']).default('upcoming'),
    })).min(2).max(4),
    integrations: z.array(z.object({
        system: z.string(),
        method: z.string(),
        purpose: z.string(),
    })),
    changelog: z.array(z.object({
        version: z.string(),
        title: z.string(),
        description: z.string(),
        timestamp: z.string().optional(),
    })),
})

/**
 * Relaxed schema for initial UBP when full schema fails.
 * Contains only essential fields for a minimal viable blueprint.
 */
export const RelaxedInitialOutputSchema = z.object({
    intent: z.literal('initial'),
    message: z.string().describe("Brief conversational message"),
    metadata: z.object({
        productName: z.string().describe("Product name"),
        version: z.string().default("0.1"),
        status: z.string().default("draft"),
    }),
    productVision: z.object({
        problem: z.string().describe("The core problem being solved"),
        targetActor: z.string().describe("Primary target user"),
        successSignal: z.string().describe("Key success metric"),
    }),
    scope: z.object({
        inScope: z.array(z.string()).describe("Features in MVP"),
        outOfScope: z.array(z.string()).default([]),
        deferred: z.array(z.string()).default([]),
    }),
    // Optional fields for relaxed validation
    actors: z.array(z.object({
        name: z.string(),
        description: z.string().default(""),
        type: z.enum(['primary', 'secondary', 'system']).default('primary'),
    })).optional(),
    behaviors: z.array(z.object({
        id: z.string(),
        title: z.string(),
        given: z.string().default(""),
        when: z.string(),
        then: z.string(),
        diagram: z.string().default(""),
        priority: z.string().default('medium'),
    })).optional(),
    techDecisions: z.array(z.object({
        category: z.string(),
        choice: z.string(),
        rationale: z.string().default(""),
    })).optional(),
    phases: z.array(z.object({
        name: z.string(),
        description: z.string(),
        goals: z.array(z.string()).default([]),
        status: z.string().default('upcoming'),
    })).optional(),
    integrations: z.array(z.object({
        system: z.string(),
        method: z.string().default(""),
        purpose: z.string(),
    })).optional(),
    constraints: z.array(z.object({
        type: z.enum(['warning', 'risk', 'constraint']),
        title: z.string(),
        description: z.string().default(""),
    })).optional(),
    changelog: z.array(z.object({
        version: z.string(),
        title: z.string(),
        description: z.string().default(""),
        timestamp: z.string().optional(),
    })).optional(),
})

export type RelaxedInitialOutput = z.infer<typeof RelaxedInitialOutputSchema>

/**
 * Schema for discussion responses.
 */
export const DiscussionOutputSchema = z.object({
    intent: z.literal('discussion'),
    message: z.string().min(10).describe("PM conversation response"),
})

/**
 * Schema for proposal responses.
 */
export const ProposalOutputSchema = z.object({
    intent: z.literal('proposal'),
    message: z.string().min(10).describe("Brief summary of changes"),
    proposedChanges: z.object({
        action: z.enum(['add', 'update', 'remove']),
        summary: z.string().describe("What's being changed"),
        sections: z.array(z.string()).describe("Affected UBP sections"),
        changes: z.record(z.string(), z.unknown()).describe("The actual changes"),
    }),
})

// Type exports
export type InitialOutput = z.infer<typeof InitialOutputSchema>
export type DiscussionOutput = z.infer<typeof DiscussionOutputSchema>
export type ProposalOutput = z.infer<typeof ProposalOutputSchema>

// =============================================================================
// Message Conversion
// =============================================================================

/**
 * Converts chat messages to LangChain message format.
 */
function toLangChainMessages(messages: ChatMessage[]): BaseMessage[] {
    return messages.map(msg => {
        switch (msg.role) {
            case 'user':
                return new HumanMessage(msg.content)
            case 'assistant':
                return new AIMessage(msg.content)
            case 'system':
                return new SystemMessage(msg.content)
            default:
                return new HumanMessage(msg.content)
        }
    })
}

// =============================================================================
// Chain Factories
// =============================================================================

/**
 * Creates the prompt template for initial UBP generation.
 * Note: blueprintContext is conditionally added in runInitialChain.
 */
function createInitialPrompt(includeContext: boolean = false) {
    const messages: Array<[string, string] | MessagesPlaceholder> = [
        ["system", INITIAL_SYSTEM_PROMPT],
    ]
    
    if (includeContext) {
        messages.push(["system", "### EXISTING CONTEXT\n{blueprintContext}"])
    }
    
    messages.push(new MessagesPlaceholder("history"))
    messages.push(["human", "{input}"])
    
    return ChatPromptTemplate.fromMessages(messages)
}

/**
 * Creates the prompt template for discussions.
 * Context is added dynamically via buildSystemPrompt in runDiscussionChain.
 */
function createDiscussionPrompt(options: { hasTopicSummary?: boolean; hasBlueprint?: boolean } = {}) {
    const messages: Array<[string, string] | MessagesPlaceholder> = [
        ["system", DISCUSSION_SYSTEM_PROMPT],
    ]
    
    if (options.hasTopicSummary) {
        messages.push(["system", "### CONVERSATION CONTEXT\n{topicSummary}"])
    }
    
    if (options.hasBlueprint) {
        messages.push(["system", "### CURRENT BLUEPRINT\n{blueprintContext}"])
    }
    
    messages.push(new MessagesPlaceholder("history"))
    messages.push(["human", "{input}"])
    
    return ChatPromptTemplate.fromMessages(messages)
}

/**
 * Creates the prompt template for proposals.
 */
function createProposalPrompt() {
    return ChatPromptTemplate.fromMessages([
        ["system", PROPOSAL_SYSTEM_PROMPT],
        ["system", "### CURRENT BLUEPRINT\n{blueprintContext}"],
        new MessagesPlaceholder("history"),
        ["human", "{input}"],
    ])
}

// =============================================================================
// Chain Execution Functions
// =============================================================================

/**
 * Runs the initial UBP generation chain.
 * 
 * @example
 * const result = await runInitialChain({
 *   input: "Build me a habit tracking app",
 *   history: []
 * })
 * 
 * if (result.success) {
 *   console.log(result.data.productVision)
 * }
 */
export async function runInitialChain(
    chainInput: ChainInput
): Promise<ChainResult<InitialOutput>> {
    try {
        logInfo('chain_start', { intent: 'initial', inputLength: chainInput.input.length })

        const model = createStructuredModelForIntent(InitialOutputSchema, 'initial')

        // Include blueprintContext if provided (for "restart with context" scenarios)
        const hasContext = chainInput.blueprintContext && chainInput.blueprintContext.trim().length > 0
        const contextPrompt = hasContext
            ? `\n\n### EXISTING CONTEXT (use as reference if relevant)\n{blueprintContext}`
            : ''

        const prompt = ChatPromptTemplate.fromMessages([
            ["system", INITIAL_SYSTEM_PROMPT + contextPrompt],
            new MessagesPlaceholder("history"),
            ["human", "{input}"],
        ])

        const chain = prompt.pipe(model)

        const history = chainInput.history
            ? toLangChainMessages(chainInput.history)
            : []

        const response = await chain.invoke({
            input: chainInput.input,
            history,
            blueprintContext: chainInput.blueprintContext || '',
        })

        // Type assertion since LangChain's structured output returns the validated type
        const typedResponse = response as InitialOutput

        logInfo('chain_success', {
            intent: 'initial',
            hasProductName: !!typedResponse.metadata?.productName,
            behaviorCount: typedResponse.behaviors?.length || 0,
        })

        return {
            success: true,
            data: typedResponse,
            intent: 'initial',
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        logError('chain_failed', { intent: 'initial', error: errorMessage })

        return {
            success: false,
            error: errorMessage,
            intent: 'initial',
        }
    }
}

/**
 * Runs the discussion chain for exploratory conversations.
 * 
 * @example
 * const result = await runDiscussionChain({
 *   input: "What about using Firebase?",
 *   blueprintContext: "Current: Supabase",
 *   history: previousMessages
 * })
 */
export async function runDiscussionChain(
    chainInput: ChainInput
): Promise<ChainResult<DiscussionOutput>> {
    try {
        logInfo('chain_start', { intent: 'discussion', inputLength: chainInput.input.length })

        const model = createStructuredModelForIntent(DiscussionOutputSchema, 'discussion')

        // Build system prompt with context
        const systemPrompt = buildSystemPrompt(
            'discussion',
            chainInput.blueprintContext,
            chainInput.topicSummary
        )

        const prompt = ChatPromptTemplate.fromMessages([
            ["system", systemPrompt],
            new MessagesPlaceholder("history"),
            ["human", "{input}"],
        ])

        const chain = prompt.pipe(model)

        const history = chainInput.history
            ? toLangChainMessages(chainInput.history)
            : []

        const response = await chain.invoke({
            input: chainInput.input,
            history,
        })

        // Type assertion since LangChain's structured output returns the validated type
        const typedResponse = response as DiscussionOutput

        logInfo('chain_success', {
            intent: 'discussion',
            messageLength: typedResponse.message.length,
        })

        return {
            success: true,
            data: typedResponse,
            intent: 'discussion',
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        logError('chain_failed', { intent: 'discussion', error: errorMessage })

        return {
            success: false,
            error: errorMessage,
            intent: 'discussion',
        }
    }
}

/**
 * Runs the proposal chain for blueprint changes.
 * 
 * @example
 * const result = await runProposalChain({
 *   input: "Yes, add payment processing",
 *   blueprintContext: JSON.stringify(currentBlueprint),
 *   history: previousMessages
 * })
 */
export async function runProposalChain(
    chainInput: ChainInput
): Promise<ChainResult<ProposalOutput>> {
    try {
        logInfo('chain_start', { intent: 'proposal', inputLength: chainInput.input.length })

        const model = createStructuredModelForIntent(ProposalOutputSchema, 'proposal')

        const prompt = ChatPromptTemplate.fromMessages([
            ["system", PROPOSAL_SYSTEM_PROMPT],
            ["system", "### CURRENT BLUEPRINT\n{blueprintContext}"],
            new MessagesPlaceholder("history"),
            ["human", "{input}"],
        ])

        const chain = prompt.pipe(model)

        const history = chainInput.history
            ? toLangChainMessages(chainInput.history)
            : []

        const response = await chain.invoke({
            input: chainInput.input,
            history,
            blueprintContext: chainInput.blueprintContext || '{}',
        })

        // Type assertion since LangChain's structured output returns the validated type
        const typedResponse = response as ProposalOutput

        logInfo('chain_success', {
            intent: 'proposal',
            action: typedResponse.proposedChanges.action,
            affectedSections: typedResponse.proposedChanges.sections.length,
        })

        return {
            success: true,
            data: typedResponse,
            intent: 'proposal',
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        logError('chain_failed', { intent: 'proposal', error: errorMessage })

        return {
            success: false,
            error: errorMessage,
            intent: 'proposal',
        }
    }
}

/**
 * Runs the appropriate chain based on detected intent.
 * This is the main entry point for the chain system.
 * 
 * @example
 * const result = await runChainForIntent('discussion', {
 *   input: "What are the trade-offs?",
 *   blueprintContext: "...",
 * })
 */
export async function runChainForIntent(
    intent: Intent,
    chainInput: ChainInput
): Promise<ChainResult<InitialOutput | DiscussionOutput | ProposalOutput>> {
    switch (intent) {
        case 'initial':
            return runInitialChain(chainInput)
        case 'clarification':
        case 'discussion':
            return runDiscussionChain(chainInput)
        case 'proposal':
            return runProposalChain(chainInput)
    }
}

// =============================================================================
// Fallback Chain (No Structured Output)
// =============================================================================

/**
 * Fallback chain without structured output.
 * Used when structured output fails or for non-critical responses.
 */
export async function runFallbackChain(
    chainInput: ChainInput,
    intent: Intent = 'discussion'
): Promise<{ success: boolean; message: string; error?: string }> {
    try {
        const effectiveIntent = intent === 'clarification' ? 'discussion' : intent
        const model = createModelForIntent(effectiveIntent)
        const systemPrompt = buildSystemPrompt(
            effectiveIntent,
            chainInput.blueprintContext,
            chainInput.topicSummary
        )

        const messages: BaseMessage[] = [
            new SystemMessage(systemPrompt),
            ...(chainInput.history ? toLangChainMessages(chainInput.history) : []),
            new HumanMessage(chainInput.input),
        ]

        const response = await model.invoke(messages)
        const content = typeof response.content === 'string'
            ? response.content
            : JSON.stringify(response.content)

        return {
            success: true,
            message: content,
        }
    } catch (error) {
        return {
            success: false,
            message: '',
            error: error instanceof Error ? error.message : 'Unknown error',
        }
    }
}

/**
 * Relaxed initial chain with fewer required fields.
 * Used as fallback when full InitialOutputSchema validation fails.
 * Returns a partial UBP instead of falling back to discussion-only.
 */
export async function runRelaxedInitialChain(
    chainInput: ChainInput
): Promise<ChainResult<RelaxedInitialOutput>> {
    try {
        logInfo('chain_start', { intent: 'initial', mode: 'relaxed', inputLength: chainInput.input.length })

        const model = createStructuredModelForIntent(RelaxedInitialOutputSchema, 'initial')

        const hasContext = chainInput.blueprintContext && chainInput.blueprintContext.trim().length > 0
        const contextPrompt = hasContext
            ? `\n\n### EXISTING CONTEXT (use as reference if relevant)\n{blueprintContext}`
            : ''

        const relaxedInstructions = `\n\nIMPORTANT: Focus on generating the core blueprint fields (productVision, scope, metadata). 
Other fields like behaviors, techStack, and phases are optional - include them if you can, but don't fail if you cannot fully populate them.`

        const prompt = ChatPromptTemplate.fromMessages([
            ["system", INITIAL_SYSTEM_PROMPT + contextPrompt + relaxedInstructions],
            new MessagesPlaceholder("history"),
            ["human", "{input}"],
        ])

        const chain = prompt.pipe(model)

        const history = chainInput.history
            ? toLangChainMessages(chainInput.history)
            : []

        const response = await chain.invoke({
            input: chainInput.input,
            history,
            blueprintContext: chainInput.blueprintContext || '',
        })

        const typedResponse = response as RelaxedInitialOutput

        logInfo('chain_success', {
            intent: 'initial',
            mode: 'relaxed',
            hasProductName: !!typedResponse.metadata?.productName,
            hasBehaviors: !!typedResponse.behaviors?.length,
        })

        return {
            success: true,
            data: typedResponse,
            intent: 'initial',
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        logError('chain_failed', { intent: 'initial', mode: 'relaxed', error: errorMessage })

        return {
            success: false,
            error: errorMessage,
            intent: 'initial',
        }
    }
}

// =============================================================================
// Test Examples
// =============================================================================

export const TEST_EXAMPLES = {
    initialChain: {
        description: "Generates complete UBP from idea",
        input: {
            input: "Build a habit tracking app for busy professionals",
            history: [],
        },
        expectedOutput: {
            hasIntent: true,
            intentValue: "initial",
            hasProductName: true,
            hasBehaviors: true,
            minBehaviors: 5,
        },
    },
    discussionChain: {
        description: "Explores options without making changes",
        input: {
            input: "What are the pros and cons of Firebase vs Supabase?",
            blueprintContext: "techDecisions: [{ category: 'Database', choice: 'firebase_firestore' }]",
            history: [],
        },
        expectedOutput: {
            hasIntent: true,
            intentValue: "discussion",
            hasMessage: true,
            noProposedChanges: true,
        },
    },
    proposalChain: {
        description: "Generates specific blueprint changes",
        input: {
            input: "Yes, switch to Supabase",
            blueprintContext: JSON.stringify({
                techDecisions: [
                    { category: 'Frontend', choice: 'nextjs', rationale: '' },
                    { category: 'Backend', choice: 'nextjs_api', rationale: '' },
                    { category: 'Database', choice: 'firebase_firestore', rationale: '' }
                ]
            }),
            history: [
                { role: 'assistant' as const, content: 'Should we switch to Supabase for PostgreSQL support?' }
            ],
        },
        expectedOutput: {
            hasIntent: true,
            intentValue: "proposal",
            hasProposedChanges: true,
            changeAction: "update",
        },
    },
    chainRouting: {
        description: "Routes to correct chain based on intent",
        testCases: [
            { intent: 'initial', expectsChain: 'runInitialChain' },
            { intent: 'discussion', expectsChain: 'runDiscussionChain' },
            { intent: 'proposal', expectsChain: 'runProposalChain' },
        ],
    },
}

/**
 * Validates chain schemas are properly defined.
 */
export function validateChainSchemas(): Array<{ schema: string; valid: boolean; details: string }> {
    const results: Array<{ schema: string; valid: boolean; details: string }> = []

    // Test InitialOutputSchema
    try {
        InitialOutputSchema.parse({
            intent: 'initial',
            message: 'Test message',
            metadata: { productName: 'Test', version: '0.1', status: 'draft' },
            productVision: { problem: 'Test problem', targetActor: 'Test user', successSignal: 'Test signal' },
            scope: { inScope: ['Feature 1'], outOfScope: [], deferred: [] },
            actors: [{ name: 'User', description: 'Primary user', type: 'primary' }],
            behaviors: [
                { id: 'B-01', title: 'Test Behavior 1', given: '', when: 'Test', then: 'Response', diagram: 'graph TD', priority: 'medium' },
                { id: 'B-02', title: 'Test Behavior 2', given: '', when: 'Test', then: 'Response', diagram: 'graph TD', priority: 'medium' },
                { id: 'B-03', title: 'Test Behavior 3', given: '', when: 'Test', then: 'Response', diagram: 'graph TD', priority: 'medium' },
                { id: 'B-04', title: 'Test Behavior 4', given: '', when: 'Test', then: 'Response', diagram: 'graph TD', priority: 'medium' },
                { id: 'B-05', title: 'Test Behavior 5', given: '', when: 'Test', then: 'Response', diagram: 'graph TD', priority: 'medium' },
            ],
            constraints: [{ type: 'constraint', title: 'Test constraint', description: '' }],
            techDecisions: [
                { category: 'Frontend', choice: 'nextjs', rationale: 'Best for SEO' },
                { category: 'Backend', choice: 'nextjs_api', rationale: 'Unified codebase' },
                { category: 'Database', choice: 'firebase_firestore', rationale: 'Real-time sync' },
            ],
            phases: [
                { name: 'Phase 1', description: 'MVP', goals: ['App'], status: 'upcoming' },
                { name: 'Phase 2', description: 'Growth', goals: ['Features'], status: 'upcoming' },
            ],
            integrations: [],
            changelog: [{ version: '0.1', title: 'Initial', description: 'Initial draft' }],
        })
        results.push({ schema: 'InitialOutputSchema', valid: true, details: 'Parses valid input' })
    } catch (e) {
        results.push({ schema: 'InitialOutputSchema', valid: false, details: String(e) })
    }

    // Test DiscussionOutputSchema
    try {
        DiscussionOutputSchema.parse({
            intent: 'discussion',
            message: 'This is a discussion response with options to consider.',
        })
        results.push({ schema: 'DiscussionOutputSchema', valid: true, details: 'Parses valid input' })
    } catch (e) {
        results.push({ schema: 'DiscussionOutputSchema', valid: false, details: String(e) })
    }

    // Test ProposalOutputSchema
    try {
        ProposalOutputSchema.parse({
            intent: 'proposal',
            message: 'Updating the tech decisions.',
            proposedChanges: {
                action: 'update',
                summary: 'Switch to Supabase',
                sections: ['techDecisions'],
                changes: { techDecisions: [{ category: 'Database', choice: 'supabase_postgres', rationale: 'Better SQL support' }] },
            },
        })
        results.push({ schema: 'ProposalOutputSchema', valid: true, details: 'Parses valid input' })
    } catch (e) {
        results.push({ schema: 'ProposalOutputSchema', valid: false, details: String(e) })
    }

    return results
}
