/**
 * Response Validation with Zod Schemas
 * 
 * Problem: LLM outputs are unpredictable, causing runtime errors.
 * Solution: Validate all responses before returning using Zod schemas.
 * 
 * Benefits:
 * - Type-safe responses
 * - Clear error messages for debugging
 * - Automatic fallback handling
 * 
 * @module responseValidator
 * @version 1.0.0
 */

import { z } from 'zod'
import { logError, logInfo, logWarn } from './logger'

// =============================================================================
// Base Schemas
// =============================================================================

/**
 * Metadata schema for UBP documents.
 */
export const MetadataSchema = z.object({
    productName: z.string().min(2).max(100),
    version: z.string().default('0.1'),
    status: z.enum(['draft', 'locked', 'approved']).default('draft'),
})

/**
 * Product vision schema.
 */
export const ProductVisionSchema = z.object({
    problem: z.string().min(10).max(1000),
    targetActor: z.string().min(3).max(200),
    successSignal: z.string().min(5).max(500),
})

/**
 * Scope schema with in/out/deferred items.
 */
export const ScopeSchema = z.object({
    inScope: z.array(z.string()).min(1),
    outOfScope: z.array(z.string()).default([]),
    deferred: z.array(z.string()).default([]),
})

/**
 * Actors schema.
 */
export const ActorsSchema = z.object({
    primary: z.string().min(2),
    secondary: z.array(z.string()).default([]),
    systems: z.array(z.string()).default([]),
})

/**
 * Single behavior schema.
 */
export const BehaviorSchema = z.object({
    id: z.string().regex(/^B-\d{2,}$/, 'Behavior ID must be like B-01'),
    trigger: z.string().min(5),
    systemResponse: z.string().min(5),
    involvedActors: z.array(z.string()).default([]),
    diagramCode: z.string().optional(),
})

/**
 * Tech stack schema with approved options only.
 */
export const TechStackSchema = z.object({
    frontend: z.enum(['nextjs', 'react', 'flutter']),
    backend: z.enum(['nextjs_api', 'express', 'fastAPI']),
    database: z.enum(['firebase_firestore', 'supabase_postgres']),
})

/**
 * Phase schema for project phases.
 */
export const PhaseSchema = z.object({
    phase: z.string().min(3),
    goal: z.string().min(5),
    outputs: z.array(z.string()).min(1),
})

/**
 * Integration schema.
 */
export const IntegrationSchema = z.object({
    service: z.string().min(2),
    purpose: z.string().min(5),
    dataFlow: z.string().optional(),
})

/**
 * Constraints and risks schema.
 */
export const ConstraintsRisksSchema = z.object({
    constraints: z.array(z.string()).default([]),
    assumptions: z.array(z.string()).default([]),
    risks: z.array(z.string()).default([]),
})

/**
 * Change log entry schema.
 */
export const ChangeLogEntrySchema = z.object({
    version: z.string(),
    summary: z.string(),
    reason: z.string().optional(),
    impactedSections: z.array(z.string()).default([]),
})

// =============================================================================
// Intent-Specific Schemas
// =============================================================================

/**
 * Full UBP response schema (for initial intent).
 */
export const UBPResponseSchema = z.object({
    intent: z.literal('initial'),
    message: z.string().min(10).max(2000),
    metadata: MetadataSchema.optional(),
    productVision: ProductVisionSchema.optional(),
    scope: ScopeSchema.optional(),
    actors: ActorsSchema.optional(),
    behaviors: z.array(BehaviorSchema).optional(),
    constraintsRisks: ConstraintsRisksSchema.optional(),
    techStack: TechStackSchema.optional(),
    phases: z.array(PhaseSchema).optional(),
    integrations: z.array(IntegrationSchema).optional(),
    changeLog: z.array(ChangeLogEntrySchema).optional(),
})

/**
 * Discussion response schema (for follow-up conversations).
 */
export const DiscussionResponseSchema = z.object({
    intent: z.literal('discussion'),
    message: z.string().min(10).max(2000),
})

/**
 * Proposed changes schema (for proposals).
 */
export const ProposedChangesSchema = z.object({
    action: z.enum(['add', 'update', 'remove']),
    summary: z.string().min(5).max(500),
    sections: z.array(z.string()).min(1),
    changes: z.record(z.string(), z.unknown()),
})

/**
 * Proposal response schema.
 */
export const ProposalResponseSchema = z.object({
    intent: z.literal('proposal'),
    message: z.string().min(10).max(1000),
    proposedChanges: ProposedChangesSchema,
})

/**
 * Union schema for any valid response.
 */
export const AnyResponseSchema = z.union([
    UBPResponseSchema,
    DiscussionResponseSchema,
    ProposalResponseSchema,
])

// =============================================================================
// Type Exports
// =============================================================================

export type Metadata = z.infer<typeof MetadataSchema>
export type ProductVision = z.infer<typeof ProductVisionSchema>
export type Scope = z.infer<typeof ScopeSchema>
export type Actors = z.infer<typeof ActorsSchema>
export type Behavior = z.infer<typeof BehaviorSchema>
export type TechStack = z.infer<typeof TechStackSchema>
export type Phase = z.infer<typeof PhaseSchema>
export type Integration = z.infer<typeof IntegrationSchema>
export type ConstraintsRisks = z.infer<typeof ConstraintsRisksSchema>
export type ChangeLogEntry = z.infer<typeof ChangeLogEntrySchema>
export type UBPResponse = z.infer<typeof UBPResponseSchema>
export type DiscussionResponse = z.infer<typeof DiscussionResponseSchema>
export type ProposalResponse = z.infer<typeof ProposalResponseSchema>
export type AnyResponse = z.infer<typeof AnyResponseSchema>

// =============================================================================
// Validation Functions
// =============================================================================

export interface ValidationResult<T> {
    success: boolean
    data?: T
    error?: string
    issues?: z.ZodIssue[]
}

/**
 * Validates a response based on expected intent.
 * Returns typed, validated data or detailed error information.
 * 
 * @example
 * const result = validateResponse(parsed, 'initial')
 * if (result.success) {
 *   console.log(result.data.productVision)
 * } else {
 *   console.error(result.error, result.issues)
 * }
 */
export function validateResponse(
    parsed: unknown,
    expectedIntent?: 'initial' | 'discussion' | 'proposal'
): ValidationResult<AnyResponse> {
    let schema: z.ZodSchema

    switch (expectedIntent) {
        case 'initial':
            schema = UBPResponseSchema
            break
        case 'discussion':
            schema = DiscussionResponseSchema
            break
        case 'proposal':
            schema = ProposalResponseSchema
            break
        default:
            schema = AnyResponseSchema
    }

    const result = schema.safeParse(parsed)

    if (result.success) {
        logInfo('response_validated', {
            intent: expectedIntent || 'any',
            success: true,
        })
        return { success: true, data: result.data as AnyResponse }
    }

    const issues = result.error.issues
    const errorSummary = issues
        .map(i => `${i.path.join('.')}: ${i.message}`)
        .join('; ')

    logWarn('response_validation_failed', {
        intent: expectedIntent || 'any',
        errorCount: issues.length,
        errors: errorSummary,
    })

    return {
        success: false,
        error: errorSummary,
        issues,
    }
}

/**
 * Validates just the UBP content (without intent/message).
 * Use for validating stored blueprints.
 */
export function validateUBPContent(content: unknown): ValidationResult<Omit<UBPResponse, 'intent' | 'message'>> {
    const UBPContentSchema = UBPResponseSchema.omit({ intent: true, message: true })
    const result = UBPContentSchema.safeParse(content)

    if (result.success) {
        return { success: true, data: result.data }
    }

    return {
        success: false,
        error: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '),
        issues: result.error.issues,
    }
}

/**
 * Validates tech stack and returns safe defaults if invalid.
 * This is a specialized validator for the critical tech stack field.
 */
export function validateAndFixTechStack(
    techStack: unknown
): { valid: boolean; data: TechStack; wasFixed: boolean } {
    const result = TechStackSchema.safeParse(techStack)

    if (result.success) {
        return { valid: true, data: result.data, wasFixed: false }
    }

    // Return safe defaults
    const safeDefaults: TechStack = {
        frontend: 'nextjs',
        backend: 'nextjs_api',
        database: 'firebase_firestore',
    }

    logWarn('tech_stack_fixed', {
        original: techStack,
        fixed: safeDefaults,
    })

    return { valid: false, data: safeDefaults, wasFixed: true }
}

/**
 * Attempts to repair common LLM response issues.
 * Use when validation fails but response is close to valid.
 */
export function attemptRepair(parsed: Record<string, unknown>): Record<string, unknown> {
    const repaired = { ...parsed }

    // Fix missing intent
    if (!repaired.intent) {
        if (repaired.productVision || repaired.behaviors) {
            repaired.intent = 'initial'
        } else if (repaired.proposedChanges) {
            repaired.intent = 'proposal'
        } else {
            repaired.intent = 'discussion'
        }
        logInfo('intent_repaired', { newIntent: repaired.intent })
    }

    // Fix missing message
    if (!repaired.message || typeof repaired.message !== 'string') {
        repaired.message = '🎯 Check your Blueprint for details!'
        logInfo('message_repaired', {})
    }

    // Fix behavior IDs if present but malformed
    if (Array.isArray(repaired.behaviors)) {
        repaired.behaviors = repaired.behaviors.map((b: unknown, i: number) => {
            if (typeof b === 'object' && b !== null) {
                const behavior = b as Record<string, unknown>
                if (!behavior.id || !/^B-\d{2,}$/.test(behavior.id as string)) {
                    behavior.id = `B-${String(i + 1).padStart(2, '0')}`
                }
                return behavior
            }
            return b
        })
    }

    // Fix tech stack
    if (repaired.techStack) {
        const { data } = validateAndFixTechStack(repaired.techStack)
        repaired.techStack = data
    }

    return repaired
}

/**
 * Full validation pipeline: validate → repair → re-validate.
 * Returns best-effort validated response.
 */
export function validateWithRepair(
    parsed: unknown,
    expectedIntent?: 'initial' | 'discussion' | 'proposal'
): ValidationResult<AnyResponse> {
    // First attempt
    const firstResult = validateResponse(parsed, expectedIntent)
    if (firstResult.success) {
        return firstResult
    }

    // Attempt repair if initial validation failed
    if (typeof parsed === 'object' && parsed !== null) {
        const repaired = attemptRepair(parsed as Record<string, unknown>)
        const secondResult = validateResponse(repaired, expectedIntent)

        if (secondResult.success) {
            logInfo('validation_repaired', {
                originalErrors: firstResult.issues?.length || 0,
            })
            return secondResult
        }

        // Return repaired data even if still invalid (best effort)
        logError('validation_repair_failed', {
            remainingErrors: secondResult.issues?.length || 0,
        })

        return {
            success: false,
            error: secondResult.error,
            issues: secondResult.issues,
            data: repaired as AnyResponse, // Best effort
        }
    }

    return firstResult
}

// =============================================================================
// TEST EXAMPLES (for documentation and validation)
// =============================================================================

export const TEST_EXAMPLES = {
    validInitial: {
        description: "Valid initial UBP response",
        input: {
            intent: 'initial',
            message: 'Here is your product blueprint for TaskFlow.',
            metadata: { productName: 'TaskFlow', version: '0.1', status: 'draft' },
            productVision: {
                problem: 'Teams struggle to track daily tasks effectively',
                targetActor: 'Small team managers',
                successSignal: '80% daily active usage',
            },
            techStack: { frontend: 'nextjs', backend: 'nextjs_api', database: 'firebase_firestore' },
        },
        expectedValid: true,
    },
    validDiscussion: {
        description: "Valid discussion response",
        input: {
            intent: 'discussion',
            message: 'Great question! There are two main approaches to authentication...',
        },
        expectedValid: true,
    },
    invalidTechStack: {
        description: "Invalid tech stack gets fixed",
        input: {
            intent: 'initial',
            message: 'Here is your blueprint.',
            techStack: { frontend: 'vue', backend: 'django', database: 'mongodb' },
        },
        expectedFixed: { frontend: 'nextjs', backend: 'nextjs_api', database: 'firebase_firestore' },
    },
    missingIntent: {
        description: "Missing intent gets repaired based on content",
        input: {
            message: 'Lets discuss the options.',
        },
        expectedRepairedIntent: 'discussion',
    },
    malformedBehaviorIds: {
        description: "Malformed behavior IDs get fixed",
        input: {
            intent: 'initial',
            message: 'Blueprint ready.',
            behaviors: [
                { id: 'behavior-1', trigger: 'User clicks', systemResponse: 'System responds' },
                { id: '2', trigger: 'User submits', systemResponse: 'System saves' },
            ],
        },
        expectedIds: ['B-01', 'B-02'],
    },
}

/**
 * Runs validation tests and returns results.
 */
export function runValidationTests(): Array<{ test: string; passed: boolean; details: string }> {
    const results: Array<{ test: string; passed: boolean; details: string }> = []

    // Test 1: Valid initial
    const initial = validateResponse(TEST_EXAMPLES.validInitial.input, 'initial')
    results.push({
        test: 'validInitial',
        passed: initial.success === TEST_EXAMPLES.validInitial.expectedValid,
        details: initial.success ? 'Validated successfully' : (initial.error || 'Failed'),
    })

    // Test 2: Valid discussion
    const discussion = validateResponse(TEST_EXAMPLES.validDiscussion.input, 'discussion')
    results.push({
        test: 'validDiscussion',
        passed: discussion.success === TEST_EXAMPLES.validDiscussion.expectedValid,
        details: discussion.success ? 'Validated successfully' : (discussion.error || 'Failed'),
    })

    // Test 3: Invalid tech stack gets fixed
    const techStackResult = validateAndFixTechStack(TEST_EXAMPLES.invalidTechStack.input.techStack)
    results.push({
        test: 'invalidTechStack',
        passed: techStackResult.wasFixed &&
            techStackResult.data.frontend === TEST_EXAMPLES.invalidTechStack.expectedFixed.frontend,
        details: `Fixed to: ${JSON.stringify(techStackResult.data)}`,
    })

    // Test 4: Missing intent repair
    const repaired = attemptRepair(TEST_EXAMPLES.missingIntent.input as Record<string, unknown>)
    results.push({
        test: 'missingIntent',
        passed: repaired.intent === TEST_EXAMPLES.missingIntent.expectedRepairedIntent,
        details: `Repaired intent: ${repaired.intent}`,
    })

    return results
}
