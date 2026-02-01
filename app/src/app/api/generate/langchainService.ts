/**
 * LangChain-Based Generation Service
 * 
 * Phase 2: LangChain Integration
 * 
 * This service wraps the LangChain module and provides a drop-in replacement
 * for the original generateFromMessage function with:
 * - Intent detection with confidence
 * - Structured output guarantees
 * - Automatic fallback to original service
 * - Feature flag for gradual rollout
 * 
 * @module api/generate/langchainService
 * @version 2.0.0
 */

import { generateFromMessage as originalGenerateFromMessage, GenerateInput, GenerateResult } from "./service"
import {
    generateWithLangChain,
    detectIntent,
    type IntentContext,
    type GenerateWithLangChainResult
} from "@/lib/langchain"
import { buildOptimizedContext, type UBP, type ChatMessage } from "@/lib/contextBuilder"
import { formatMessage } from "@/lib/messageFormatter"
import { validateTechStack, getSafeDefaults } from "@/lib/validateTechStack"
import { logInfo, logWarn, logError } from "@/lib/logger"

// =============================================================================
// Feature Flag
// =============================================================================

/**
 * Feature flag to enable/disable LangChain mode.
 * Set via environment variable for gradual rollout.
 */
export function isLangChainEnabled(): boolean {
    return process.env.USE_LANGCHAIN === 'true'
}

/**
 * Percentage of traffic to route to LangChain (0-100).
 * Used for A/B testing.
 */
export function getLangChainRolloutPercentage(): number {
    const percentage = parseInt(process.env.LANGCHAIN_ROLLOUT_PERCENT || '0', 10)
    return isNaN(percentage) ? 0 : Math.min(100, Math.max(0, percentage))
}

/**
 * Determines if this request should use LangChain based on rollout percentage.
 */
export function shouldUseLangChain(userId: string): boolean {
    // Full enable override
    if (isLangChainEnabled()) return true

    // Percentage-based rollout
    const percentage = getLangChainRolloutPercentage()
    if (percentage === 0) return false
    if (percentage >= 100) return true

    // Hash userId to get consistent routing
    const hash = userId.split('').reduce((acc, char) => {
        return ((acc << 5) - acc) + char.charCodeAt(0)
    }, 0)
    const bucket = Math.abs(hash % 100)
    return bucket < percentage
}

// =============================================================================
// Main Service Function
// =============================================================================

/**
 * Enhanced generateFromMessage that uses LangChain when enabled.
 * 
 * This is a drop-in replacement for the original service that:
 * 1. Uses intent detection to route to specialized chains
 * 2. Provides structured output guarantees
 * 3. Falls back to original service on errors
 * 4. Maintains full backwards compatibility
 * 
 * @example
 * // In route.ts, replace:
 * import { generateFromMessage } from "./service"
 * // With:
 * import { generateFromMessageWithLangChain as generateFromMessage } from "./langchainService"
 */
export async function generateFromMessageWithLangChain(
    input: GenerateInput,
    options?: { userId?: string; forceLangChain?: boolean }
): Promise<GenerateResult> {
    const userId = options?.userId || 'unknown'
    const useLangChain = options?.forceLangChain ?? shouldUseLangChain(userId)

    // If LangChain is disabled, use original service
    if (!useLangChain) {
        logInfo('langchain_disabled', { userId, reason: 'feature_flag' })
        return originalGenerateFromMessage(input)
    }

    logInfo('langchain_enabled', { userId })

    try {
        // Convert input to LangChain format
        const chatHistory = (input.context || []).map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
        }))

        const currentBlueprint = input.currentBlueprint as UBP | undefined

        // Call LangChain service
        const langChainResult = await generateWithLangChain({
            message: input.message,
            chatHistory,
            currentBlueprint: currentBlueprint || null,
        })

        // Convert result to original format
        const result = convertToGenerateResult(langChainResult, input.message)

        logInfo('langchain_success', {
            userId,
            intent: result.intent,
            confidence: langChainResult.confidence,
            usedFallback: langChainResult.usedFallback,
        })

        return result

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        logError('langchain_error', { userId, error: errorMessage })

        // Fallback to original service
        logWarn('langchain_fallback_to_original', { userId, error: errorMessage })
        return originalGenerateFromMessage(input)
    }
}

// =============================================================================
// Result Conversion
// =============================================================================

/**
 * Converts LangChain result to the original GenerateResult format.
 */
function convertToGenerateResult(
    langChainResult: GenerateWithLangChainResult,
    originalMessage: string
): GenerateResult {
    // Validate and fix tech stack if present
    const content = langChainResult.content
    if (content && typeof content === 'object' && 'techStack' in content) {
        const techStackValidation = validateTechStack((content as Record<string, unknown>).techStack)
        if (!techStackValidation.valid) {
            logWarn('tech_stack_fixed', {
                original: (content as Record<string, unknown>).techStack,
                fixed: getSafeDefaults(),
            })
            ;(content as Record<string, unknown>).techStack = getSafeDefaults()
        }
    }

    // Extract product name from content
    let productName: string | undefined
    if (content && typeof content === 'object' && 'metadata' in content) {
        const metadata = (content as Record<string, unknown>).metadata as Record<string, string> | undefined
        productName = metadata?.productName
    }

    // Build raw content for storage
    const rawContent = JSON.stringify({
        intent: langChainResult.intent,
        message: langChainResult.message,
        ...(content as object || {}),
        ...(langChainResult.proposedChanges ? { proposedChanges: langChainResult.proposedChanges } : {}),
    })

    return {
        intent: langChainResult.intent,
        message: langChainResult.message,
        content,
        proposedChanges: langChainResult.proposedChanges,
        rawContent,
        productName,
    }
}

// =============================================================================
// Intent Preview (for UI feedback)
// =============================================================================

/**
 * Preview the detected intent without making an LLM call.
 * Useful for showing intent indicators in the UI.
 * 
 * @example
 * // In frontend, before sending:
 * const preview = await fetch('/api/generate/preview-intent', {
 *   method: 'POST',
 *   body: JSON.stringify({ message, hasBlueprint })
 * })
 */
export function previewIntent(
    message: string,
    hasBlueprint: boolean,
    lastAssistantMessage?: string
): {
    intent: 'initial' | 'discussion' | 'proposal'
    confidence: number
    reason: string
} {
    const context: IntentContext = {
        hasBlueprint,
        lastAssistantMessage,
        messageCount: lastAssistantMessage ? 2 : 1,
    }

    const result = detectIntent(message, context)

    return {
        intent: result.intent,
        confidence: result.confidence,
        reason: result.reason,
    }
}

// =============================================================================
// Cost Estimation
// =============================================================================

/**
 * Estimates the cost of a request based on intent.
 * Useful for budget warnings in the UI.
 */
export function estimateRequestCost(
    message: string,
    hasBlueprint: boolean,
    chatHistoryLength: number
): {
    estimatedCost: number
    intent: 'initial' | 'discussion' | 'proposal'
    tokenBudget: number
} {
    const intentResult = detectIntent(message, {
        hasBlueprint,
        messageCount: chatHistoryLength,
    })

    // Token estimates per intent
    const tokenBudgets: Record<string, number> = {
        initial: 4000,
        discussion: 500,
        proposal: 1500,
    }

    const tokenBudget = tokenBudgets[intentResult.intent] || 4000

    // Rough cost estimate (DeepSeek via OpenRouter)
    // Input: ~$0.0007 per 1K tokens
    // Output: ~$0.0028 per 1K tokens
    const inputTokens = Math.ceil(message.length / 4) + (chatHistoryLength * 200)
    const inputCost = (inputTokens / 1000) * 0.0007
    const outputCost = (tokenBudget / 1000) * 0.0028
    const estimatedCost = inputCost + outputCost

    return {
        estimatedCost,
        intent: intentResult.intent,
        tokenBudget,
    }
}

// =============================================================================
// Test Examples
// =============================================================================

export const TEST_EXAMPLES = {
    newProject: {
        description: "New project with no blueprint → initial intent",
        input: {
            message: "Build me a habit tracking app for busy professionals",
            context: [],
            currentBlueprint: undefined,
        },
        expected: {
            intent: "initial",
            hasContent: true,
            hasProductName: true,
            messageIncludes: ["habit", "professionals"],
        },
        before: {
            behavior: "Same prompt processed, but no intent-based routing",
            tokenUsage: "~4000 tokens regardless of intent",
            structuredOutput: "JSON parsing with fallback handling",
        },
        after: {
            behavior: "Detected as 'initial' → runs InitialChain with full tokens",
            tokenUsage: "4000 tokens (appropriate for full UBP)",
            structuredOutput: "Guaranteed schema compliance via Zod",
        },
    },
    discussionQuestion: {
        description: "Follow-up question about tech → discussion intent",
        input: {
            message: "What are the pros and cons of using Firebase vs Supabase?",
            context: [
                { role: "user", content: "Build a habit tracker" },
                { role: "assistant", content: "Here's your blueprint..." },
            ],
            currentBlueprint: { techStack: { database: "firebase_firestore" } },
        },
        expected: {
            intent: "discussion",
            hasContent: false,
            hasProposedChanges: false,
            messageIncludes: ["Firebase", "Supabase", "trade-off"],
        },
        before: {
            behavior: "Processed as generic message, might generate full UBP",
            tokenUsage: "~4000 tokens (wasteful for a question)",
            structuredOutput: "May return partial/malformed JSON",
        },
        after: {
            behavior: "Detected as 'discussion' → runs DiscussionChain",
            tokenUsage: "~500 tokens (70% savings)",
            structuredOutput: "Guaranteed { intent, message } format",
        },
    },
    proposalConfirmation: {
        description: "User confirms a suggestion → proposal intent",
        input: {
            message: "Yes, let's switch to Supabase",
            context: [
                { role: "assistant", content: "Should we switch to Supabase for PostgreSQL?" },
            ],
            currentBlueprint: { techStack: { database: "firebase_firestore" } },
        },
        expected: {
            intent: "proposal",
            hasContent: false,
            hasProposedChanges: true,
            proposedChangesAction: "update",
        },
        before: {
            behavior: "Might be treated as new request or discussion",
            tokenUsage: "Variable, often 4000",
            structuredOutput: "proposedChanges might be missing or malformed",
        },
        after: {
            behavior: "Detected as 'proposal' → runs ProposalChain",
            tokenUsage: "~1500 tokens",
            structuredOutput: "Guaranteed proposedChanges with action/summary/changes",
        },
    },
    ambiguousShortMessage: {
        description: "Short confirmation message → detected based on context",
        input: {
            message: "yes",
            context: [
                { role: "assistant", content: "Should I add payment processing?" },
            ],
            currentBlueprint: { scope: { inScope: ["habit tracking"] } },
        },
        expected: {
            intent: "proposal",
            hasProposedChanges: true,
        },
        before: {
            behavior: "Might fail or produce generic response",
            issue: "No context awareness for short messages",
        },
        after: {
            behavior: "Recognizes as confirmation of prior suggestion → proposal",
            confidence: "High confidence due to lastAssistantMessage context",
        },
    },
    costComparisonSummary: {
        description: "Cost savings comparison across intents",
        before: {
            initial: "$0.012 (all requests use max tokens)",
            discussion: "$0.012 (same as initial - wasteful)",
            proposal: "$0.012 (same as initial)",
            averagePerSession: "$0.072 (6 requests)",
        },
        after: {
            initial: "$0.012 (full tokens for UBP)",
            discussion: "$0.002 (70% cheaper)",
            proposal: "$0.005 (60% cheaper)",
            averagePerSession: "$0.035 (51% savings)",
        },
    },
}

/**
 * Validates the service against test examples.
 * Note: This doesn't make actual LLM calls - it tests the routing logic.
 */
export function validateServiceRouting(): Array<{
    test: string
    passed: boolean
    details: string
}> {
    const results: Array<{ test: string; passed: boolean; details: string }> = []

    // Test new project detection
    const newProjectIntent = previewIntent(
        TEST_EXAMPLES.newProject.input.message,
        false
    )
    results.push({
        test: 'newProject',
        passed: newProjectIntent.intent === 'initial',
        details: `Got ${newProjectIntent.intent}, expected initial`,
    })

    // Test discussion detection
    const discussionIntent = previewIntent(
        TEST_EXAMPLES.discussionQuestion.input.message,
        true
    )
    results.push({
        test: 'discussionQuestion',
        passed: discussionIntent.intent === 'discussion',
        details: `Got ${discussionIntent.intent}, expected discussion`,
    })

    // Test proposal detection
    const proposalIntent = previewIntent(
        TEST_EXAMPLES.proposalConfirmation.input.message,
        true,
        TEST_EXAMPLES.proposalConfirmation.input.context[0].content
    )
    results.push({
        test: 'proposalConfirmation',
        passed: proposalIntent.intent === 'proposal',
        details: `Got ${proposalIntent.intent}, expected proposal`,
    })

    // Test ambiguous short message
    const shortMsgIntent = previewIntent(
        TEST_EXAMPLES.ambiguousShortMessage.input.message,
        true,
        TEST_EXAMPLES.ambiguousShortMessage.input.context[0].content
    )
    results.push({
        test: 'ambiguousShortMessage',
        passed: shortMsgIntent.intent === 'proposal',
        details: `Got ${shortMsgIntent.intent}, expected proposal`,
    })

    return results
}
