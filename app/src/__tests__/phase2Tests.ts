/**
 * Phase 2: LangChain Integration - Test Suite
 * 
 * This file contains comprehensive test examples showing:
 * - What behavior was BEFORE Phase 2
 * - What behavior is AFTER Phase 2
 * - How to validate each component
 * 
 * Run these tests to verify the implementation:
 * ```
 * npx ts-node src/__tests__/phase2Tests.ts
 * ```
 * 
 * @module __tests__/phase2Tests
 * @version 2.0.0
 */

// =============================================================================
// Imports
// =============================================================================

import {
    detectIntent,
    validateIntentDetector,
    type IntentContext,
} from '../lib/langchain/intentDetector'

import {
    validatePrompts,
    INITIAL_SYSTEM_PROMPT,
    DISCUSSION_SYSTEM_PROMPT,
    PROPOSAL_SYSTEM_PROMPT,
} from '../lib/langchain/prompts'

import {
    validateChainSchemas,
    InitialOutputSchema,
    DiscussionOutputSchema,
    ProposalOutputSchema,
} from '../lib/langchain/chains'

import {
    createModel,
    createModelForIntent,
    getMaxTokensForIntent,
    estimateCost,
    MODEL_CONFIG,
} from '../lib/langchain/client'

import {
    previewIntent,
    validateServiceRouting,
    estimateRequestCost,
} from '../app/api/generate/langchainService'

// =============================================================================
// Test Runner
// =============================================================================

interface TestResult {
    name: string
    passed: boolean
    details: string
    before?: string
    after?: string
}

async function runAllTests(): Promise<TestResult[]> {
    const results: TestResult[] = []

    console.log('\n🧪 Phase 2: LangChain Integration Test Suite\n')
    console.log('=' .repeat(60))

    // 1. Intent Detection Tests
    console.log('\n📍 1. Intent Detection Tests\n')

    const intentTests = validateIntentDetector()
    for (const test of intentTests) {
        results.push({
            name: `Intent: ${test.test}`,
            passed: test.passed,
            details: test.details,
            before: 'Single prompt handled all intents, no confidence scoring',
            after: 'Keyword-based detection with confidence scores and context awareness',
        })
        console.log(`  ${test.passed ? '✅' : '❌'} ${test.test}: ${test.details}`)
    }

    // 2. Prompt Validation Tests
    console.log('\n📝 2. Prompt Validation Tests\n')

    const promptTests = validatePrompts()
    for (const test of promptTests) {
        results.push({
            name: `Prompt: ${test.test}`,
            passed: test.passed,
            details: test.details,
            before: 'Single monolithic system prompt for all intents',
            after: 'Specialized prompts per intent with focused instructions',
        })
        console.log(`  ${test.passed ? '✅' : '❌'} ${test.test}: ${test.details}`)
    }

    // 3. Schema Validation Tests
    console.log('\n📋 3. Chain Schema Tests\n')

    const schemaTests = validateChainSchemas()
    for (const test of schemaTests) {
        results.push({
            name: `Schema: ${test.schema}`,
            passed: test.valid,
            details: test.details,
            before: 'No schema enforcement, runtime parsing errors possible',
            after: 'Zod schemas guarantee output structure',
        })
        console.log(`  ${test.valid ? '✅' : '❌'} ${test.schema}: ${test.details}`)
    }

    // 4. Service Routing Tests
    console.log('\n🔀 4. Service Routing Tests\n')

    const routingTests = validateServiceRouting()
    for (const test of routingTests) {
        results.push({
            name: `Routing: ${test.test}`,
            passed: test.passed,
            details: test.details,
            before: 'All requests processed identically',
            after: 'Intent-based routing to specialized chains',
        })
        console.log(`  ${test.passed ? '✅' : '❌'} ${test.test}: ${test.details}`)
    }

    // 5. Cost Optimization Tests
    console.log('\n💰 5. Cost Optimization Tests\n')

    const costTests = runCostOptimizationTests()
    for (const test of costTests) {
        results.push(test)
        console.log(`  ${test.passed ? '✅' : '❌'} ${test.name}: ${test.details}`)
    }

    // Summary
    console.log('\n' + '=' .repeat(60))
    const passed = results.filter(r => r.passed).length
    const total = results.length
    console.log(`\n📊 Summary: ${passed}/${total} tests passed (${Math.round(passed/total*100)}%)\n`)

    return results
}

// =============================================================================
// Cost Optimization Tests
// =============================================================================

function runCostOptimizationTests(): TestResult[] {
    const results: TestResult[] = []

    // Test 1: Token budgets differ by intent
    const initialTokens = getMaxTokensForIntent('initial')
    const discussionTokens = getMaxTokensForIntent('discussion')
    const proposalTokens = getMaxTokensForIntent('proposal')

    results.push({
        name: 'Token Budget: Discussion < Initial',
        passed: discussionTokens < initialTokens,
        details: `Discussion: ${discussionTokens}, Initial: ${initialTokens}`,
        before: 'All intents used 4000 tokens',
        after: 'Discussion uses 500 tokens (87.5% reduction)',
    })

    results.push({
        name: 'Token Budget: Proposal < Initial',
        passed: proposalTokens < initialTokens,
        details: `Proposal: ${proposalTokens}, Initial: ${initialTokens}`,
        before: 'All intents used 4000 tokens',
        after: 'Proposal uses 1500 tokens (62.5% reduction)',
    })

    // Test 2: Cost estimation accuracy
    const costEstimate = estimateRequestCost(
        'What are the pros and cons of Firebase?',
        true,
        5
    )

    results.push({
        name: 'Cost Estimation: Returns valid estimate',
        passed: costEstimate.estimatedCost > 0 && costEstimate.estimatedCost < 0.05,
        details: `Estimated: $${costEstimate.estimatedCost.toFixed(4)}`,
        before: 'No cost estimation available',
        after: 'Per-request cost estimation based on intent',
    })

    // Test 3: Intent affects cost
    const initialCost = estimateRequestCost('Build me an app', false, 0)
    const discussionCost = estimateRequestCost('What about Firebase?', true, 5)

    results.push({
        name: 'Cost: Discussion cheaper than Initial',
        passed: discussionCost.estimatedCost < initialCost.estimatedCost,
        details: `Discussion: $${discussionCost.estimatedCost.toFixed(4)}, Initial: $${initialCost.estimatedCost.toFixed(4)}`,
        before: 'Same cost regardless of intent',
        after: 'Intent-based cost optimization',
    })

    return results
}

// =============================================================================
// Example Scenarios (Before vs After)
// =============================================================================

export const EXAMPLE_SCENARIOS = {
    scenario1_newProject: {
        title: 'New Project Request',
        userMessage: 'Build me a habit tracking app for busy professionals',
        context: { hasBlueprint: false, chatHistory: [] },

        before: {
            behavior: `
                1. Message sent to single generateFromMessage()
                2. Same system prompt used regardless of intent
                3. 4000 max_tokens allocated
                4. No intent classification
                5. JSON parsing with try/catch fallbacks
            `,
            issues: [
                'No specialized handling for new projects',
                'Same token budget as follow-up questions',
                'No confidence scoring',
            ],
            cost: '$0.012 per request',
        },

        after: {
            behavior: `
                1. Intent detected: 'initial' (confidence: 0.9)
                2. INITIAL_SYSTEM_PROMPT used with PM thinking framework
                3. 4000 max_tokens (appropriate for full UBP)
                4. InitialOutputSchema guarantees response structure
                5. Structured output via withStructuredOutput()
            `,
            improvements: [
                'Intent-specific prompts with PM thinking',
                'Guaranteed schema compliance',
                'Confidence scoring for UI feedback',
            ],
            cost: '$0.012 per request (same for initial)',
        },
    },

    scenario2_discussion: {
        title: 'Follow-up Question',
        userMessage: 'What are the pros and cons of using Firebase vs Supabase?',
        context: { hasBlueprint: true, chatHistory: [{ role: 'assistant', content: '...' }] },

        before: {
            behavior: `
                1. Same generateFromMessage() as new project
                2. Full system prompt with UBP instructions
                3. 4000 max_tokens (wasteful for a question)
                4. May accidentally generate full UBP
                5. Inconsistent response format
            `,
            issues: [
                'Wasteful token allocation',
                'Wrong prompt for discussions',
                'May confuse user with unexpected UBP',
            ],
            cost: '$0.012 per request',
        },

        after: {
            behavior: `
                1. Intent detected: 'discussion' (confidence: 0.85)
                2. DISCUSSION_SYSTEM_PROMPT used (conversational)
                3. 500 max_tokens (sufficient for discussion)
                4. DiscussionOutputSchema ensures { intent, message }
                5. Never generates UBP accidentally
            `,
            improvements: [
                '70% token reduction',
                'Conversational prompt style',
                'No accidental UBP generation',
            ],
            cost: '$0.002 per request (83% savings)',
        },
    },

    scenario3_proposal: {
        title: 'User Confirms a Change',
        userMessage: 'Yes, switch to Supabase',
        context: {
            hasBlueprint: true,
            lastAssistantMessage: 'Should we switch to Supabase for PostgreSQL support?',
        },

        before: {
            behavior: `
                1. Treated as generic message
                2. May regenerate entire UBP
                3. proposedChanges field might be missing
                4. No structured change format
                5. Hard to apply changes programmatically
            `,
            issues: [
                'No proposal detection',
                'Unpredictable response format',
                'Changes hard to parse',
            ],
            cost: '$0.012 per request',
        },

        after: {
            behavior: `
                1. Intent detected: 'proposal' (confidence: 0.9)
                2. PROPOSAL_SYSTEM_PROMPT used (action-oriented)
                3. 1500 max_tokens (medium complexity)
                4. ProposalOutputSchema guarantees proposedChanges
                5. Changes are structured and actionable
            `,
            improvements: [
                'Reliable proposal detection',
                'Guaranteed proposedChanges structure',
                'Easy to apply changes programmatically',
            ],
            cost: '$0.005 per request (58% savings)',
        },
    },

    scenario4_ambiguous: {
        title: 'Ambiguous Short Message',
        userMessage: 'yes',
        context: {
            hasBlueprint: true,
            lastAssistantMessage: 'Should I add payment processing to the scope?',
        },

        before: {
            behavior: `
                1. "yes" is too short for context
                2. May fail or produce generic response
                3. No awareness of previous assistant message
                4. User has to rephrase
            `,
            issues: [
                'Short messages fail',
                'No context from previous messages',
                'Poor user experience',
            ],
        },

        after: {
            behavior: `
                1. Intent detected: 'proposal' via lastAssistantMessage context
                2. Recognizes as confirmation of prior suggestion
                3. Generates proper proposedChanges for payments
                4. Works seamlessly
            `,
            improvements: [
                'Context-aware intent detection',
                'Short confirmations work correctly',
                'Smooth conversation flow',
            ],
        },
    },
}

// =============================================================================
// Validation Functions for External Use
// =============================================================================

/**
 * Quick health check for the LangChain integration.
 */
export function quickHealthCheck(): {
    intentDetector: boolean
    prompts: boolean
    schemas: boolean
    routing: boolean
} {
    const intentTests = validateIntentDetector()
    const promptTests = validatePrompts()
    const schemaTests = validateChainSchemas()
    const routingTests = validateServiceRouting()

    return {
        intentDetector: intentTests.every(t => t.passed),
        prompts: promptTests.every(t => t.passed),
        schemas: schemaTests.every(t => t.valid),
        routing: routingTests.every(t => t.passed),
    }
}

/**
 * Demonstrates intent detection with examples.
 */
export function demonstrateIntentDetection(): void {
    console.log('\n📍 Intent Detection Examples\n')

    const examples = [
        { msg: 'Build me a habit tracking app', hasBlueprint: false },
        { msg: 'What about using Firebase?', hasBlueprint: true },
        { msg: 'Yes, add that feature', hasBlueprint: true, lastMsg: 'Should I add auth?' },
        { msg: 'Help me understand the trade-offs', hasBlueprint: true },
        { msg: 'perfect', hasBlueprint: true, lastMsg: 'Updated the scope' },
    ]

    for (const ex of examples) {
        const result = detectIntent(ex.msg, {
            hasBlueprint: ex.hasBlueprint,
            lastAssistantMessage: ex.lastMsg,
            messageCount: ex.lastMsg ? 2 : 1,
        })

        console.log(`  "${ex.msg}"`)
        console.log(`    → Intent: ${result.intent} (${Math.round(result.confidence * 100)}%)`)
        console.log(`    → Reason: ${result.reason}\n`)
    }
}

/**
 * Demonstrates cost savings.
 */
export function demonstrateCostSavings(): void {
    console.log('\n💰 Cost Savings Demonstration\n')

    const scenarios = [
        { msg: 'Build me an app', hasBlueprint: false, history: 0 },
        { msg: 'What about Firebase?', hasBlueprint: true, history: 5 },
        { msg: 'Yes, add payments', hasBlueprint: true, history: 8 },
    ]

    let beforeTotal = 0
    let afterTotal = 0

    for (const s of scenarios) {
        const cost = estimateRequestCost(s.msg, s.hasBlueprint, s.history)
        const beforeCost = 0.012 // Old fixed cost

        beforeTotal += beforeCost
        afterTotal += cost.estimatedCost

        console.log(`  "${s.msg.substring(0, 30)}..."`)
        console.log(`    Intent: ${cost.intent}`)
        console.log(`    Before: $${beforeCost.toFixed(4)} | After: $${cost.estimatedCost.toFixed(4)}`)
        console.log(`    Tokens: ${cost.tokenBudget}\n`)
    }

    const savings = ((beforeTotal - afterTotal) / beforeTotal * 100).toFixed(1)
    console.log(`  📊 Total Savings: ${savings}% ($${beforeTotal.toFixed(4)} → $${afterTotal.toFixed(4)})`)
}

// =============================================================================
// Run Tests if Executed Directly
// =============================================================================

// Export for use in other tests
export { runAllTests }

// For direct execution
if (typeof require !== 'undefined' && require.main === module) {
    runAllTests()
        .then(results => {
            const allPassed = results.every(r => r.passed)
            process.exit(allPassed ? 0 : 1)
        })
        .catch(error => {
            console.error('Test suite failed:', error)
            process.exit(1)
        })
}
