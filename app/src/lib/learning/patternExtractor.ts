/**
 * Pattern Extractor - Learning System
 * 
 * Phase 3: Intelligence Layer
 * 
 * Captures patterns from successful blueprints for cross-project learning.
 * 
 * This module:
 * - Extracts reusable patterns from approved blueprints
 * - Categorizes projects for similarity matching
 * - Identifies common behavior and integration patterns
 * - Enables learning from historical projects
 * 
 * @module learning/patternExtractor
 * @version 3.0.0
 */

import { logInfo, logDebug, logWarn, logError } from '../logger'
import {
    storePattern,
    storeKnowledge,
    BlueprintPattern,
    BehaviorPattern,
    ScopePattern,
    PMKnowledge,
} from '../rag/vectorStore'

// =============================================================================
// Types
// =============================================================================

export interface UBP {
    metadata?: {
        productName?: string
        version?: string
        status?: string
    }
    productVision?: {
        problem?: string
        targetActor?: string
        successSignal?: string
    }
    scope?: {
        inScope?: string[]
        outOfScope?: string[]
        deferred?: string[]
    }
    actors?: {
        primary?: string
        secondary?: string[]
        systems?: string[]
    }
    behaviors?: Array<{
        id?: string
        trigger?: string
        systemResponse?: string
        involvedActors?: string[]
        diagramCode?: string
    }>
    techStack?: {
        frontend?: string
        backend?: string
        database?: string
    }
    phases?: Array<{
        phase?: string
        goal?: string
        outputs?: string[]
    }>
    integrations?: Array<{
        service?: string
        purpose?: string
        dataFlow?: string
    }>
    constraintsRisks?: {
        constraints?: string[]
        assumptions?: string[]
        risks?: string[]
    }
    changeLog?: Array<{
        version?: string
        summary?: string
        reason?: string
        impactedSections?: string[]
    }>
}

export interface ExtractedPattern {
    pattern: BlueprintPattern
    extractedKnowledge: PMKnowledge[]
    qualityMetrics: QualityMetrics
}

export interface QualityMetrics {
    /** Overall quality score (0-1) */
    score: number
    /** Completeness of the blueprint */
    completeness: number
    /** Clarity of behaviors */
    behaviorClarity: number
    /** Scope definition quality */
    scopeQuality: number
    /** Tech stack consistency */
    techStackValid: boolean
    /** Issues found */
    issues: string[]
}

export interface ProjectCategory {
    name: string
    keywords: string[]
    commonIntegrations: string[]
    typicalBehaviors: string[]
}

// =============================================================================
// Project Categories
// =============================================================================

const PROJECT_CATEGORIES: ProjectCategory[] = [
    {
        name: 'saas',
        keywords: ['subscription', 'billing', 'dashboard', 'multi-tenant', 'saas', 'b2b'],
        commonIntegrations: ['stripe', 'intercom', 'analytics', 'email'],
        typicalBehaviors: ['signup', 'subscription', 'billing', 'dashboard', 'settings'],
    },
    {
        name: 'marketplace',
        keywords: ['marketplace', 'buyer', 'seller', 'listing', 'transaction', 'two-sided'],
        commonIntegrations: ['stripe-connect', 'search', 'messaging', 'reviews'],
        typicalBehaviors: ['browse', 'purchase', 'list-item', 'review', 'messaging'],
    },
    {
        name: 'mobile-app',
        keywords: ['mobile', 'app', 'ios', 'android', 'flutter', 'react-native', 'push'],
        commonIntegrations: ['push-notifications', 'analytics', 'crash-reporting'],
        typicalBehaviors: ['onboarding', 'offline', 'sync', 'push', 'deep-link'],
    },
    {
        name: 'e-commerce',
        keywords: ['shop', 'cart', 'checkout', 'product', 'inventory', 'order'],
        commonIntegrations: ['stripe', 'shipping', 'inventory', 'email'],
        typicalBehaviors: ['browse', 'add-to-cart', 'checkout', 'order-tracking'],
    },
    {
        name: 'content-platform',
        keywords: ['content', 'blog', 'cms', 'article', 'media', 'publish'],
        commonIntegrations: ['cdn', 'search', 'analytics', 'comments'],
        typicalBehaviors: ['create', 'publish', 'browse', 'comment', 'share'],
    },
    {
        name: 'productivity',
        keywords: ['task', 'project', 'team', 'collaboration', 'productivity', 'workflow'],
        commonIntegrations: ['calendar', 'notifications', 'file-storage', 'integrations'],
        typicalBehaviors: ['create-task', 'assign', 'track', 'collaborate', 'report'],
    },
    {
        name: 'social',
        keywords: ['social', 'profile', 'follow', 'feed', 'post', 'network'],
        commonIntegrations: ['media-upload', 'notifications', 'recommendations'],
        typicalBehaviors: ['post', 'follow', 'like', 'comment', 'share', 'feed'],
    },
    {
        name: 'fintech',
        keywords: ['finance', 'payment', 'banking', 'transfer', 'wallet', 'transaction'],
        commonIntegrations: ['plaid', 'stripe', 'kyc', 'fraud-detection'],
        typicalBehaviors: ['transfer', 'balance', 'transaction-history', 'verification'],
    },
]

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Learns from an approved blueprint by extracting patterns.
 * 
 * @example
 * // When a blueprint is approved, extract patterns for future learning
 * const result = await learnFromApprovedBlueprint(blueprint, userCategory)
 * console.log(`Extracted pattern with ${result.qualityMetrics.score} quality score`)
 */
export async function learnFromApprovedBlueprint(
    blueprint: UBP,
    userSpecifiedCategory?: string
): Promise<ExtractedPattern> {
    logInfo('pattern_extraction_start', {
        productName: blueprint.metadata?.productName,
        userCategory: userSpecifiedCategory,
    })

    // 1. Calculate quality metrics
    const qualityMetrics = calculateQualityMetrics(blueprint)

    // 2. Detect project category
    const category = userSpecifiedCategory || detectCategory(blueprint)

    // 3. Extract the pattern
    const pattern = extractPattern(blueprint, category, qualityMetrics.score)

    // 4. Extract knowledge from this blueprint
    const extractedKnowledge = extractKnowledge(blueprint, category)

    // 5. Store pattern if quality is sufficient
    if (qualityMetrics.score >= 0.6) {
        await storePattern(pattern)
        logInfo('pattern_stored', { id: pattern.id, quality: qualityMetrics.score })
    } else {
        logWarn('pattern_quality_low', {
            id: pattern.id,
            quality: qualityMetrics.score,
            issues: qualityMetrics.issues,
        })
    }

    // 6. Store extracted knowledge
    for (const knowledge of extractedKnowledge) {
        await storeKnowledge(knowledge)
    }

    logInfo('pattern_extraction_complete', {
        patternId: pattern.id,
        category,
        quality: qualityMetrics.score,
        knowledgeExtracted: extractedKnowledge.length,
    })

    return {
        pattern,
        extractedKnowledge,
        qualityMetrics,
    }
}

/**
 * Calculates quality metrics for a blueprint.
 */
export function calculateQualityMetrics(blueprint: UBP): QualityMetrics {
    const issues: string[] = []
    let totalScore = 0
    let maxScore = 0

    // 1. Completeness check (required sections)
    const requiredSections = ['metadata', 'productVision', 'scope', 'actors', 'behaviors', 'techStack']
    let completeness = 0

    for (const section of requiredSections) {
        maxScore += 1
        if (blueprint[section as keyof UBP]) {
            completeness++
            totalScore += 1
        } else {
            issues.push(`Missing section: ${section}`)
        }
    }
    completeness = completeness / requiredSections.length

    // 2. Behavior clarity
    let behaviorClarity = 0
    if (blueprint.behaviors && blueprint.behaviors.length > 0) {
        const behaviorCount = blueprint.behaviors.length
        const hasTriggers = blueprint.behaviors.filter(b => b.trigger && b.trigger.length > 10).length
        const hasResponses = blueprint.behaviors.filter(b => b.systemResponse && b.systemResponse.length > 10).length

        behaviorClarity = (hasTriggers + hasResponses) / (behaviorCount * 2)
        maxScore += 2
        totalScore += behaviorClarity * 2

        if (behaviorCount < 3) {
            issues.push('Fewer than 3 behaviors defined')
        }
    } else {
        issues.push('No behaviors defined')
    }

    // 3. Scope quality
    let scopeQuality = 0
    if (blueprint.scope) {
        const hasInScope = (blueprint.scope.inScope?.length || 0) > 0
        const hasOutOfScope = (blueprint.scope.outOfScope?.length || 0) > 0
        const hasDeferred = (blueprint.scope.deferred?.length || 0) > 0

        scopeQuality = (hasInScope ? 0.5 : 0) + (hasOutOfScope ? 0.25 : 0) + (hasDeferred ? 0.25 : 0)
        maxScore += 1
        totalScore += scopeQuality

        if (!hasInScope) {
            issues.push('No in-scope items defined')
        }
    }

    // 4. Tech stack validation
    const validFrontend = ['nextjs', 'react', 'flutter']
    const validBackend = ['nextjs_api', 'express', 'fastAPI']
    const validDatabase = ['firebase_firestore', 'supabase_postgres']

    let techStackValid = true
    if (blueprint.techStack) {
        if (blueprint.techStack.frontend && !validFrontend.includes(blueprint.techStack.frontend)) {
            techStackValid = false
            issues.push(`Invalid frontend: ${blueprint.techStack.frontend}`)
        }
        if (blueprint.techStack.backend && !validBackend.includes(blueprint.techStack.backend)) {
            techStackValid = false
            issues.push(`Invalid backend: ${blueprint.techStack.backend}`)
        }
        if (blueprint.techStack.database && !validDatabase.includes(blueprint.techStack.database)) {
            techStackValid = false
            issues.push(`Invalid database: ${blueprint.techStack.database}`)
        }
        maxScore += 1
        if (techStackValid) totalScore += 1
    }

    const score = maxScore > 0 ? totalScore / maxScore : 0

    return {
        score,
        completeness,
        behaviorClarity,
        scopeQuality,
        techStackValid,
        issues,
    }
}

/**
 * Detects the project category from blueprint content.
 */
export function detectCategory(blueprint: UBP): string {
    const searchText = [
        blueprint.metadata?.productName || '',
        blueprint.productVision?.problem || '',
        blueprint.productVision?.targetActor || '',
        ...(blueprint.scope?.inScope || []),
        ...(blueprint.behaviors?.map(b => b.trigger || '') || []),
        ...(blueprint.integrations?.map(i => i.service || '') || []),
    ].join(' ').toLowerCase()

    let bestMatch = 'other'
    let bestScore = 0

    for (const category of PROJECT_CATEGORIES) {
        let score = 0

        // Keyword matches
        for (const keyword of category.keywords) {
            if (searchText.includes(keyword)) score += 2
        }

        // Integration matches
        for (const integration of category.commonIntegrations) {
            if (searchText.includes(integration)) score += 1
        }

        // Behavior matches
        for (const behavior of category.typicalBehaviors) {
            if (searchText.includes(behavior)) score += 1
        }

        if (score > bestScore) {
            bestScore = score
            bestMatch = category.name
        }
    }

    logDebug('category_detected', { category: bestMatch, score: bestScore })
    return bestMatch
}

/**
 * Extracts a reusable pattern from a blueprint.
 */
export function extractPattern(
    blueprint: UBP,
    category: string,
    qualityScore: number
): BlueprintPattern {
    const productName = blueprint.metadata?.productName || 'Unknown'
    const id = `pattern-${productName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`

    // Build tech stack string
    const techStack = blueprint.techStack
        ? `${blueprint.techStack.frontend || 'unknown'}/${blueprint.techStack.backend || 'unknown'}/${blueprint.techStack.database || 'unknown'}`
        : 'unknown/unknown/unknown'

    // Extract behavior patterns
    const behaviors: BehaviorPattern[] = []
    if (blueprint.behaviors) {
        // Group behaviors by type
        const behaviorGroups = new Map<string, { triggers: string[]; responses: string[] }>()

        for (const b of blueprint.behaviors) {
            const triggerType = categorizeTrigger(b.trigger || '')
            if (!behaviorGroups.has(triggerType)) {
                behaviorGroups.set(triggerType, { triggers: [], responses: [] })
            }
            const group = behaviorGroups.get(triggerType)!
            if (b.trigger) group.triggers.push(b.trigger)
            if (b.systemResponse) group.responses.push(b.systemResponse)
        }

        for (const [triggerType, group] of behaviorGroups) {
            behaviors.push({
                triggerType,
                triggerPhrases: group.triggers,
                responsePatterns: group.responses,
            })
        }
    }

    // Extract integrations
    const integrations = blueprint.integrations?.map(i => i.service || '').filter(Boolean) || []

    // Build scope patterns
    const scopePatterns: ScopePattern = {
        typicalInScope: blueprint.scope?.inScope?.length || 0,
        typicalDeferred: blueprint.scope?.deferred?.length || 0,
        commonCategories: extractScopeCategories(blueprint.scope?.inScope || []),
    }

    return {
        id,
        category,
        techStack,
        behaviors,
        integrations,
        scopePatterns,
        createdAt: new Date(),
        sourceName: productName,
        qualityScore,
    }
}

/**
 * Extracts knowledge from a blueprint.
 */
export function extractKnowledge(blueprint: UBP, category: string): PMKnowledge[] {
    const knowledge: PMKnowledge[] = []
    const productName = blueprint.metadata?.productName || 'Unknown'

    // 1. Extract integration knowledge
    if (blueprint.integrations) {
        for (const integration of blueprint.integrations) {
            if (integration.service && integration.purpose) {
                knowledge.push({
                    id: `knowledge-${productName}-${integration.service}-${Date.now()}`,
                    topic: 'integrations',
                    content: `Integration pattern for ${category}: ${integration.service} - ${integration.purpose}. Data flow: ${integration.dataFlow || 'Not specified'}`,
                    source: 'approved-blueprint',
                    relatedTopics: [category, integration.service.toLowerCase()],
                    confidence: 0.8,
                    createdAt: new Date(),
                })
            }
        }
    }

    // 2. Extract behavior patterns as knowledge
    if (blueprint.behaviors && blueprint.behaviors.length >= 3) {
        const behaviorSummary = blueprint.behaviors
            .slice(0, 5)
            .map(b => `- ${b.trigger}: ${b.systemResponse?.substring(0, 100)}`)
            .join('\n')

        knowledge.push({
            id: `knowledge-${productName}-behaviors-${Date.now()}`,
            topic: category,
            content: `Common behavior patterns for ${category} projects:\n${behaviorSummary}`,
            source: 'approved-blueprint',
            relatedTopics: ['behaviors', 'features', category],
            confidence: 0.75,
            createdAt: new Date(),
        })
    }

    // 3. Extract risk/constraint patterns
    if (blueprint.constraintsRisks?.risks && blueprint.constraintsRisks.risks.length > 0) {
        knowledge.push({
            id: `knowledge-${productName}-risks-${Date.now()}`,
            topic: 'risks',
            content: `Risk patterns for ${category} projects: ${blueprint.constraintsRisks.risks.join('; ')}`,
            source: 'approved-blueprint',
            relatedTopics: ['constraints', category],
            confidence: 0.7,
            createdAt: new Date(),
        })
    }

    return knowledge
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Categorizes a trigger into a type.
 */
function categorizeTrigger(trigger: string): string {
    const lower = trigger.toLowerCase()

    if (lower.includes('user') || lower.includes('clicks') || lower.includes('submits')) {
        return 'user-action'
    }
    if (lower.includes('system') || lower.includes('automatically') || lower.includes('scheduled')) {
        return 'system-event'
    }
    if (lower.includes('webhook') || lower.includes('external') || lower.includes('api')) {
        return 'external-trigger'
    }
    if (lower.includes('error') || lower.includes('fails') || lower.includes('invalid')) {
        return 'error-handling'
    }

    return 'other'
}

/**
 * Extracts categories from scope items.
 */
function extractScopeCategories(scopeItems: string[]): string[] {
    const categories = new Set<string>()
    const categoryKeywords: Record<string, string[]> = {
        'auth': ['auth', 'login', 'signup', 'password'],
        'billing': ['payment', 'billing', 'subscription', 'price'],
        'users': ['user', 'profile', 'account', 'settings'],
        'admin': ['admin', 'manage', 'dashboard', 'analytics'],
        'notifications': ['notification', 'email', 'alert', 'message'],
        'content': ['content', 'post', 'article', 'media'],
        'integrations': ['integration', 'api', 'webhook', 'connect'],
    }

    for (const item of scopeItems) {
        const lower = item.toLowerCase()
        for (const [category, keywords] of Object.entries(categoryKeywords)) {
            if (keywords.some(kw => lower.includes(kw))) {
                categories.add(category)
            }
        }
    }

    return [...categories]
}

// =============================================================================
// Batch Learning
// =============================================================================

export interface BatchLearningResult {
    processed: number
    successful: number
    failed: number
    averageQuality: number
    categoryCounts: Record<string, number>
}

/**
 * Processes multiple blueprints for learning.
 */
export async function learnFromBlueprintBatch(
    blueprints: Array<{ blueprint: UBP; category?: string }>
): Promise<BatchLearningResult> {
    let successful = 0
    let failed = 0
    let totalQuality = 0
    const categoryCounts: Record<string, number> = {}

    for (const { blueprint, category } of blueprints) {
        try {
            const result = await learnFromApprovedBlueprint(blueprint, category)
            successful++
            totalQuality += result.qualityMetrics.score

            const cat = result.pattern.category
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
        } catch (error) {
            logError('batch_learning_error', { error })
            failed++
        }
    }

    return {
        processed: blueprints.length,
        successful,
        failed,
        averageQuality: successful > 0 ? totalQuality / successful : 0,
        categoryCounts,
    }
}

// =============================================================================
// Validation
// =============================================================================

export interface ValidationResult {
    test: string
    passed: boolean
    details: string
}

/**
 * Validates the pattern extractor with test cases.
 */
export function validatePatternExtractor(): ValidationResult[] {
    const results: ValidationResult[] = []

    // Test blueprint
    const testBlueprint: UBP = {
        metadata: {
            productName: 'TaskFlow Pro',
            version: '1.0',
            status: 'approved',
        },
        productVision: {
            problem: 'Teams struggle to track tasks across multiple projects',
            targetActor: 'Project managers and team leads',
            successSignal: 'Users complete 80% of assigned tasks on time',
        },
        scope: {
            inScope: ['Task creation', 'Task assignment', 'Due date tracking', 'Dashboard'],
            outOfScope: ['Time tracking', 'Invoicing'],
            deferred: ['Mobile app', 'API integrations'],
        },
        actors: {
            primary: 'Project Manager',
            secondary: ['Team Member', 'Admin'],
            systems: ['Email Service', 'Notification System'],
        },
        behaviors: [
            {
                id: 'B-01',
                trigger: 'User creates a new task',
                systemResponse: 'System creates task and notifies assignee',
                involvedActors: ['Project Manager', 'Team Member'],
            },
            {
                id: 'B-02',
                trigger: 'Task due date approaches',
                systemResponse: 'System sends reminder notification',
                involvedActors: ['Team Member', 'Notification System'],
            },
            {
                id: 'B-03',
                trigger: 'User marks task complete',
                systemResponse: 'System updates status and notifies manager',
                involvedActors: ['Team Member', 'Project Manager'],
            },
        ],
        techStack: {
            frontend: 'nextjs',
            backend: 'nextjs_api',
            database: 'supabase_postgres',
        },
        integrations: [
            { service: 'sendgrid', purpose: 'Email notifications', dataFlow: 'Outbound' },
            { service: 'slack', purpose: 'Team notifications', dataFlow: 'Outbound' },
        ],
        constraintsRisks: {
            constraints: ['Must work on mobile browsers'],
            assumptions: ['Users have email access'],
            risks: ['User adoption may be slow'],
        },
    }

    // Test 1: Quality metrics calculation
    const metrics = calculateQualityMetrics(testBlueprint)
    results.push({
        test: 'Quality metrics calculation',
        passed: metrics.score > 0.7,
        details: `Score: ${(metrics.score * 100).toFixed(1)}%, Issues: ${metrics.issues.length}`,
    })

    // Test 2: Category detection
    const category = detectCategory(testBlueprint)
    results.push({
        test: 'Category detection',
        passed: category === 'productivity',
        details: `Detected: ${category}`,
    })

    // Test 3: Pattern extraction
    const pattern = extractPattern(testBlueprint, category, metrics.score)
    results.push({
        test: 'Pattern extraction',
        passed: pattern.behaviors.length > 0 && pattern.techStack.includes('nextjs'),
        details: `Behaviors: ${pattern.behaviors.length}, Tech: ${pattern.techStack}`,
    })

    // Test 4: Knowledge extraction
    const knowledge = extractKnowledge(testBlueprint, category)
    results.push({
        test: 'Knowledge extraction',
        passed: knowledge.length > 0,
        details: `Extracted ${knowledge.length} knowledge items`,
    })

    // Test 5: Tech stack validation in metrics
    results.push({
        test: 'Tech stack validation',
        passed: metrics.techStackValid === true,
        details: `Valid: ${metrics.techStackValid}`,
    })

    // Test 6: Trigger categorization
    const triggerType = categorizeTrigger('User clicks the submit button')
    results.push({
        test: 'Trigger categorization',
        passed: triggerType === 'user-action',
        details: `Type: ${triggerType}`,
    })

    return results
}
