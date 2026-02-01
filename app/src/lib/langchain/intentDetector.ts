/**
 * Intent Detection System
 * 
 * Phase 2: LangChain Integration
 * 
 * Hybrid intent detection with:
 * - Fast keyword-based classification (primary)
 * - LLM fallback for low-confidence cases
 * - Context awareness (has blueprint, last message)
 * - Confidence scoring
 * 
 * @module langchain/intentDetector
 * @version 2.1.0
 */

import { ChatOpenAI } from "@langchain/openai"
import { logInfo, logDebug, logError } from "../logger"

// =============================================================================
// Types
// =============================================================================

export type Intent = 'initial' | 'discussion' | 'proposal'

export interface IntentResult {
    intent: Intent
    confidence: number  // 0-1
    reason: string
    matchedKeywords: string[]
    usedLLM?: boolean
}

export interface IntentContext {
    hasBlueprint: boolean
    lastAssistantMessage?: string
    messageCount: number
}

// =============================================================================
// Keyword Definitions
// =============================================================================

/**
 * Keywords that strongly indicate a proposal intent.
 * These suggest the user is confirming a previous suggestion.
 */
export const PROPOSAL_KEYWORDS = [
    // Strong confirmations
    'yes', "let's do", 'sounds good', 'go ahead', 'approved',
    'do it', 'perfect', 'exactly', 'that works', 'make it so',
    // Specific actions
    'add that', 'include that', 'add this', 'include this',
    'make that change', 'update it', 'update the',
    'remove that', 'remove this', 'delete that',
    // Agreement phrases
    'i agree', 'i like that', 'works for me', 'ship it',
    'proceed', 'confirm', 'go with', 'use that',
]

/**
 * Keywords that indicate a discussion intent.
 * These suggest exploration, not action.
 */
export const DISCUSSION_KEYWORDS = [
    // Questions
    'how should', 'what about', 'what if', 'what do you think',
    'should we', 'should i', 'can we', 'would it',
    'which is better', 'which should', 'which one',
    // Exploration
    'trade-off', 'tradeoff', 'trade off',
    'options', 'alternatives', 'compare', 'comparison',
    'difference between', 'pros and cons', 'advantages',
    'thoughts on', 'opinion on', 'advice on',
    'help me', 'help with', 'explain', 'clarify',
    // Consideration
    'considering', 'thinking about', 'wondering',
    'not sure', 'unsure', 'maybe', 'perhaps',
]

/**
 * Keywords that suggest a new project/blueprint (initial intent).
 */
export const INITIAL_KEYWORDS = [
    // New project
    'build', 'create', 'make', 'develop', 'design',
    'new app', 'new project', 'new product', 'new idea',
    'i want to', 'i need a', "i'm building", "i'm creating",
    // Product descriptions
    'app that', 'platform that', 'tool that', 'system that',
    'for users', 'for customers', 'marketplace', 'saas',
    // Starting fresh
    'from scratch', 'start fresh', 'new blueprint',
]

// =============================================================================
// Intent Detection Functions
// =============================================================================

/**
 * Detects the intent from a user message with context awareness.
 * 
 * Algorithm:
 * 1. If no blueprint exists → initial (unless discussion keywords strong)
 * 2. Check for proposal keywords first (user confirming)
 * 3. Check for discussion keywords
 * 4. Default based on context
 * 
 * @example
 * // User confirming a suggestion
 * detectIntent("Yes, add that feature", { hasBlueprint: true })
 * // Returns: { intent: 'proposal', confidence: 0.9, ... }
 * 
 * @example
 * // User asking for options
 * detectIntent("What about using Firebase instead?", { hasBlueprint: true })
 * // Returns: { intent: 'discussion', confidence: 0.85, ... }
 */
export function detectIntent(
    message: string,
    context: IntentContext
): IntentResult {
    const lowerMsg = message.toLowerCase().trim()
    const matchedKeywords: string[] = []

    // Track keyword matches for each intent
    let proposalScore = 0
    let discussionScore = 0
    let initialScore = 0

    // Check proposal keywords
    for (const keyword of PROPOSAL_KEYWORDS) {
        if (lowerMsg.includes(keyword)) {
            proposalScore += keyword.length > 5 ? 2 : 1 // Longer phrases = stronger signal
            matchedKeywords.push(`proposal:${keyword}`)
        }
    }

    // Check discussion keywords
    for (const keyword of DISCUSSION_KEYWORDS) {
        if (lowerMsg.includes(keyword)) {
            discussionScore += keyword.length > 5 ? 2 : 1
            matchedKeywords.push(`discussion:${keyword}`)
        }
    }

    // Check initial keywords
    for (const keyword of INITIAL_KEYWORDS) {
        if (lowerMsg.includes(keyword)) {
            initialScore += keyword.length > 5 ? 2 : 1
            matchedKeywords.push(`initial:${keyword}`)
        }
    }

    logDebug('intent_keywords', {
        message: lowerMsg.substring(0, 50),
        proposalScore,
        discussionScore,
        initialScore,
    })

    // Decision logic
    let intent: Intent
    let confidence: number
    let reason: string

    // Rule 1: No blueprint = likely initial (unless strong discussion signal)
    if (!context.hasBlueprint) {
        if (discussionScore > 3 && discussionScore > initialScore) {
            intent = 'discussion'
            confidence = 0.7
            reason = 'No blueprint but discussion keywords detected'
        } else {
            intent = 'initial'
            confidence = initialScore > 0 ? 0.9 : 0.8
            reason = 'No blueprint exists - generating new one'
        }
    }
    // Rule 2: Has blueprint and proposal keywords detected
    else if (proposalScore > 0 && proposalScore >= discussionScore) {
        // Check if there was a prior AI message (context for confirmation)
        if (context.lastAssistantMessage) {
            intent = 'proposal'
            confidence = Math.min(0.95, 0.7 + (proposalScore * 0.05))
            reason = 'User confirming previous suggestion'
        } else {
            // Proposal keywords but no prior AI message - might be discussion
            intent = proposalScore > 3 ? 'proposal' : 'discussion'
            confidence = 0.65
            reason = 'Proposal keywords without clear prior context'
        }
    }
    // Rule 3: Discussion keywords dominate
    else if (discussionScore > 0) {
        intent = 'discussion'
        confidence = Math.min(0.95, 0.7 + (discussionScore * 0.05))
        reason = 'Discussion/exploration keywords detected'
    }
    // Rule 4: Initial keywords detected with existing blueprint
    else if (initialScore > 2) {
        intent = 'initial'
        confidence = 0.75
        reason = 'New project keywords detected - may want to start fresh'
    }
    // Rule 5: Default to discussion for follow-up messages
    else {
        intent = 'discussion'
        confidence = 0.6
        reason = 'Default for follow-up (no strong intent signals)'
    }

    const result: IntentResult = {
        intent,
        confidence,
        reason,
        matchedKeywords,
    }

    logInfo('intent_detected', {
        intent,
        confidence,
        reason,
        messageLength: message.length,
        hasBlueprint: context.hasBlueprint,
    })

    return result
}

/**
 * Simple intent detection for backwards compatibility.
 * Returns just the intent string.
 */
export function detectIntentSimple(
    message: string,
    hasBlueprint: boolean,
    lastAssistantMessage?: string
): Intent {
    const result = detectIntent(message, {
        hasBlueprint,
        lastAssistantMessage,
        messageCount: lastAssistantMessage ? 2 : 1,
    })
    return result.intent
}

/**
 * Check if a message is likely asking for clarification about intent.
 * This helps handle ambiguous messages.
 */
export function isAmbiguous(message: string): boolean {
    const lowerMsg = message.toLowerCase()

    // Very short messages are often ambiguous
    if (message.length < 10) return true

    // Multiple question marks or "or" suggest uncertainty
    if ((message.match(/\?/g) || []).length > 1) return true
    if (lowerMsg.includes(' or ') && lowerMsg.includes('?')) return true

    return false
}

// =============================================================================
// LLM-Based Intent Detection
// =============================================================================

/** Confidence threshold below which we use LLM */
const LLM_FALLBACK_THRESHOLD = 0.55

/** Configuration for the LLM classifier */
const CLASSIFIER_CONFIG = {
    timeoutMs: 5000,              // 5 second timeout
    maxRetries: 1,                // Single retry
    retryDelayMs: 500,
    circuitBreakerThreshold: 3,   // Open after 3 consecutive failures
    circuitBreakerResetMs: 60000, // Reset after 1 minute
}

// Circuit breaker state
let classifierFailures = 0
let circuitOpenUntil = 0

/**
 * Check if the LLM-based intent detection is enabled via feature flag.
 */
export function isIntentLLMEnabled(): boolean {
    return process.env.INTENT_LLM_ENABLED !== 'false'
}

/**
 * Get current classifier metrics for monitoring.
 */
export function getClassifierMetrics(): {
    consecutiveFailures: number
    circuitOpen: boolean
    circuitResetMs: number
} {
    const now = Date.now()
    const circuitOpen = circuitOpenUntil > now
    return {
        consecutiveFailures: classifierFailures,
        circuitOpen,
        circuitResetMs: circuitOpen ? circuitOpenUntil - now : 0,
    }
}

/**
 * Reset the circuit breaker manually (for testing or recovery).
 */
export function resetClassifierCircuit(): void {
    classifierFailures = 0
    circuitOpenUntil = 0
    logInfo('intent_circuit_reset', { manual: true })
}

/**
 * Creates a lightweight model for intent classification.
 * Uses minimal tokens for fast, cheap classification.
 */
function createIntentClassifierModel(): ChatOpenAI {
    return new ChatOpenAI({
        modelName: process.env.OPENROUTER_MODEL || "deepseek/deepseek-chat",
        temperature: 0.1, // Very deterministic
        maxTokens: 50,    // Only need one word
        configuration: {
            baseURL: "https://openrouter.ai/api/v1",
            defaultHeaders: {
                "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
                "X-Title": "Flowro-PM-IntentDetector",
            },
        },
        apiKey: process.env.OPENROUTER_API_KEY,
    })
}

/**
 * LLM-based intent detection for ambiguous messages.
 * Only called when keyword detection has low confidence.
 */
async function detectIntentWithLLM(
    message: string,
    context: IntentContext
): Promise<IntentResult> {
    try {
        logDebug('intent_llm_start', { messageLength: message.length })

        const model = createIntentClassifierModel()

        const systemPrompt = `You are an intent classifier for a product management AI assistant. 
Classify user messages into exactly one of these intents:

- "initial": User wants to start a NEW project or generate a NEW blueprint. They're describing an app/product idea.
- "discussion": User is asking questions, exploring options, or wants information. NOT making changes.
- "proposal": User is CONFIRMING a previous suggestion or explicitly asking to ADD/UPDATE/REMOVE something.

Context:
- Has existing blueprint: ${context.hasBlueprint}
- Previous messages: ${context.messageCount}
${context.lastAssistantMessage ? `- Last AI message: "${context.lastAssistantMessage.substring(0, 100)}..."` : ''}

Reply with ONLY one word: initial, discussion, or proposal`

        const response = await model.invoke([
            { role: "system", content: systemPrompt },
            { role: "user", content: message }
        ])

        const responseText = typeof response.content === 'string' 
            ? response.content.toLowerCase().trim()
            : ''

        // Parse the response
        let intent: Intent = 'discussion' // Default
        if (responseText.includes('initial')) {
            intent = 'initial'
        } else if (responseText.includes('proposal')) {
            intent = 'proposal'
        } else if (responseText.includes('discussion')) {
            intent = 'discussion'
        }

        logInfo('intent_llm_success', {
            intent,
            rawResponse: responseText.substring(0, 50),
            messageLength: message.length,
        })

        return {
            intent,
            confidence: 0.9, // High confidence from LLM
            reason: `LLM classified as ${intent}`,
            matchedKeywords: [],
            usedLLM: true,
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        logError('intent_llm_failed', { error: errorMessage })
        throw error // Re-throw for safe wrapper to handle
    }
}

/**
 * Safe wrapper for LLM-based intent detection with timeout, retry, and circuit breaker.
 * Returns the keyword-based fallback on failure (NOT discussion default).
 *
 * @param message - User message to classify
 * @param context - Intent context
 * @param keywordFallback - The keyword-based result to return on failure
 */
async function detectIntentWithLLMSafe(
    message: string,
    context: IntentContext,
    keywordFallback: IntentResult
): Promise<IntentResult> {
    // Check circuit breaker
    const now = Date.now()
    if (circuitOpenUntil > now) {
        logDebug('intent_circuit_open', {
            resetIn: circuitOpenUntil - now,
            fallbackIntent: keywordFallback.intent,
        })
        return {
            ...keywordFallback,
            reason: keywordFallback.reason + ' (LLM circuit open)',
        }
    }

    // Retry loop
    for (let attempt = 0; attempt <= CLASSIFIER_CONFIG.maxRetries; attempt++) {
        try {
            // Create timeout promise
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), CLASSIFIER_CONFIG.timeoutMs)

            // Race between LLM call and timeout
            const result = await Promise.race([
                detectIntentWithLLM(message, context),
                new Promise<never>((_, reject) => {
                    controller.signal.addEventListener('abort', () => {
                        reject(new Error('Intent LLM timeout'))
                    })
                }),
            ])

            clearTimeout(timeoutId)

            // Success - reset circuit breaker
            if (classifierFailures > 0) {
                logInfo('intent_circuit_recovered', { previousFailures: classifierFailures })
            }
            classifierFailures = 0

            logInfo('intent_llm_success', {
                intent: result.intent,
                attempt: attempt + 1,
            })

            return result

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            logError('intent_llm_attempt_failed', {
                error: errorMessage,
                attempt: attempt + 1,
                maxRetries: CLASSIFIER_CONFIG.maxRetries,
            })

            // Wait before retry (if not last attempt)
            if (attempt < CLASSIFIER_CONFIG.maxRetries) {
                await new Promise(resolve => setTimeout(resolve, CLASSIFIER_CONFIG.retryDelayMs))
            }
        }
    }

    // All attempts failed - update circuit breaker
    classifierFailures++

    if (classifierFailures >= CLASSIFIER_CONFIG.circuitBreakerThreshold) {
        circuitOpenUntil = Date.now() + CLASSIFIER_CONFIG.circuitBreakerResetMs
        logError('intent_circuit_opened', {
            failures: classifierFailures,
            resetAt: new Date(circuitOpenUntil).toISOString(),
        })
    }

    // CRITICAL: Return keyword fallback, NOT discussion default
    logInfo('intent_llm_fallback_to_keyword', {
        fallbackIntent: keywordFallback.intent,
        fallbackConfidence: keywordFallback.confidence,
        consecutiveFailures: classifierFailures,
    })

    return {
        ...keywordFallback,
        reason: keywordFallback.reason + ' (LLM fallback)',
    }
}

/**
 * Hybrid intent detection: keywords first, LLM for low-confidence ambiguous cases.
 * This is the recommended entry point for intent detection.
 *
 * LLM is only called when:
 * - Feature flag is enabled (INTENT_LLM_ENABLED !== 'false')
 * - Keyword confidence < 0.55
 * - Message is ambiguous (short, multiple questions, etc.)
 * - Circuit breaker is closed
 *
 * @example
 * const result = await detectIntentHybrid("redesign it with modern styling", context)
 * // Keywords: low confidence + ambiguous → calls LLM → returns "initial" with 0.9 confidence
 */
export async function detectIntentHybrid(
    message: string,
    context: IntentContext
): Promise<IntentResult> {
    // Step 1: Try keyword-based detection (instant, free)
    const keywordResult = detectIntent(message, context)

    // Step 2: If high confidence, return immediately
    if (keywordResult.confidence >= LLM_FALLBACK_THRESHOLD) {
        logDebug('intent_hybrid_keyword_sufficient', {
            intent: keywordResult.intent,
            confidence: keywordResult.confidence,
        })
        return keywordResult
    }

    // Step 3: Check if LLM should be used
    const llmEnabled = isIntentLLMEnabled()
    const messageIsAmbiguous = isAmbiguous(message)

    if (!llmEnabled) {
        logDebug('intent_hybrid_llm_disabled', {
            keywordIntent: keywordResult.intent,
            keywordConfidence: keywordResult.confidence,
        })
        return keywordResult
    }

    if (!messageIsAmbiguous) {
        logDebug('intent_hybrid_not_ambiguous', {
            keywordIntent: keywordResult.intent,
            keywordConfidence: keywordResult.confidence,
            messageLength: message.length,
        })
        return keywordResult
    }

    // Step 4: Low confidence + ambiguous - use LLM with safe wrapper
    logDebug('intent_hybrid_using_llm', {
        keywordIntent: keywordResult.intent,
        keywordConfidence: keywordResult.confidence,
        reason: 'Below threshold and ambiguous, using LLM',
    })

    const llmResult = await detectIntentWithLLMSafe(message, context, keywordResult)
    return llmResult
}

// =============================================================================
// Test Examples
// =============================================================================

export const TEST_EXAMPLES = {
    proposalDetection: {
        description: "Detects proposal intent when user confirms",
        testCases: [
            {
                input: "Yes, add that feature",
                context: { hasBlueprint: true, lastAssistantMessage: "Should I add payments?", messageCount: 4 },
                expectedIntent: "proposal",
                expectedConfidenceMin: 0.8,
            },
            {
                input: "Sounds good, let's do it",
                context: { hasBlueprint: true, lastAssistantMessage: "We could use Stripe", messageCount: 3 },
                expectedIntent: "proposal",
                expectedConfidenceMin: 0.8,
            },
            {
                input: "Perfect, ship it",
                context: { hasBlueprint: true, lastAssistantMessage: "Updated the scope", messageCount: 5 },
                expectedIntent: "proposal",
                expectedConfidenceMin: 0.7,
            },
        ],
    },
    discussionDetection: {
        description: "Detects discussion intent for exploratory questions",
        testCases: [
            {
                input: "What about using Firebase instead of Supabase?",
                context: { hasBlueprint: true, messageCount: 2 },
                expectedIntent: "discussion",
                expectedConfidenceMin: 0.7,
            },
            {
                input: "What are the pros and cons of each approach?",
                context: { hasBlueprint: true, messageCount: 3 },
                expectedIntent: "discussion",
                expectedConfidenceMin: 0.75,
            },
            {
                input: "Help me understand the trade-offs",
                context: { hasBlueprint: true, messageCount: 2 },
                expectedIntent: "discussion",
                expectedConfidenceMin: 0.7,
            },
        ],
    },
    initialDetection: {
        description: "Detects initial intent for new project requests",
        testCases: [
            {
                input: "I want to build a habit tracking app",
                context: { hasBlueprint: false, messageCount: 1 },
                expectedIntent: "initial",
                expectedConfidenceMin: 0.85,
            },
            {
                input: "Create a marketplace for freelancers",
                context: { hasBlueprint: false, messageCount: 1 },
                expectedIntent: "initial",
                expectedConfidenceMin: 0.85,
            },
            {
                input: "New project: SaaS for project management",
                context: { hasBlueprint: false, messageCount: 1 },
                expectedIntent: "initial",
                expectedConfidenceMin: 0.8,
            },
        ],
    },
    edgeCases: {
        description: "Handles edge cases correctly",
        testCases: [
            {
                input: "yes",
                context: { hasBlueprint: true, lastAssistantMessage: "Add payments?", messageCount: 2 },
                expectedIntent: "proposal",
                note: "Short confirmation with prior context → proposal",
            },
            {
                input: "hmm",
                context: { hasBlueprint: true, messageCount: 2 },
                expectedIntent: "discussion",
                note: "Ambiguous response → discussion (safe default)",
            },
            {
                input: "Build me a new app from scratch",
                context: { hasBlueprint: true, messageCount: 5 },
                expectedIntent: "initial",
                note: "Fresh start even with existing blueprint",
            },
        ],
    },
}

/**
 * Validates intent detection against test examples.
 */
export function validateIntentDetector(): Array<{
    test: string
    passed: boolean
    details: string
    failures?: string[]
}> {
    const results: Array<{ test: string; passed: boolean; details: string; failures?: string[] }> = []

    for (const [testName, testGroup] of Object.entries(TEST_EXAMPLES)) {
        const failures: string[] = []

        for (const testCase of testGroup.testCases) {
            const result = detectIntent(testCase.input, testCase.context)

            if (result.intent !== testCase.expectedIntent) {
                failures.push(`"${testCase.input}" → expected ${testCase.expectedIntent}, got ${result.intent}`)
            }

            // Check confidence if the test case has expectedConfidenceMin
            const expectedMin = (testCase as { expectedConfidenceMin?: number }).expectedConfidenceMin
            if (expectedMin && result.confidence < expectedMin) {
                failures.push(`"${testCase.input}" → confidence ${result.confidence} < ${expectedMin}`)
            }
        }

        results.push({
            test: testName,
            passed: failures.length === 0,
            details: `${testGroup.testCases.length - failures.length}/${testGroup.testCases.length} cases passed`,
            failures: failures.length > 0 ? failures : undefined,
        })
    }

    return results
}
