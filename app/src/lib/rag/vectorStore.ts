/**
 * RAG Foundation - Vector Store Module
 * 
 * Phase 3: Intelligence Layer
 * 
 * Purpose: Enable cross-project learning and PM knowledge retrieval.
 * 
 * This module provides:
 * - Blueprint pattern storage and retrieval
 * - PM knowledge base management
 * - Semantic similarity search
 * - Pattern matching for new projects
 * 
 * Note: This is a foundation module. In production, you would integrate
 * with Supabase pgvector or another vector database. This implementation
 * provides an in-memory fallback for development and testing.
 * 
 * @module rag/vectorStore
 * @version 3.0.0
 */

import { logInfo, logDebug, logWarn, logError } from '../logger'

// =============================================================================
// Types
// =============================================================================

export interface BlueprintPattern {
    /** Unique pattern identifier */
    id: string
    /** Project category (saas, marketplace, mobile-app, etc.) */
    category: string
    /** Combined tech stack string */
    techStack: string
    /** Common behavior patterns */
    behaviors: BehaviorPattern[]
    /** Common integrations */
    integrations: string[]
    /** Scope patterns */
    scopePatterns: ScopePattern
    /** Vector embedding (optional - for vector DB) */
    embedding?: number[]
    /** When pattern was created */
    createdAt: Date
    /** Source project name */
    sourceName: string
    /** Quality score (0-1) */
    qualityScore: number
}

export interface BehaviorPattern {
    /** Trigger type (user action, system event, etc.) */
    triggerType: string
    /** Common trigger phrases */
    triggerPhrases: string[]
    /** Common response patterns */
    responsePatterns: string[]
}

export interface ScopePattern {
    /** Typical in-scope items count */
    typicalInScope: number
    /** Typical deferred items count */
    typicalDeferred: number
    /** Common scope categories */
    commonCategories: string[]
}

export interface PMKnowledge {
    /** Unique knowledge identifier */
    id: string
    /** Topic (authentication, payments, onboarding, etc.) */
    topic: string
    /** Knowledge content */
    content: string
    /** Source of knowledge */
    source: 'internal' | 'docs' | 'approved-blueprint' | 'best-practice'
    /** Related topics */
    relatedTopics: string[]
    /** Vector embedding (optional) */
    embedding?: number[]
    /** Quality/confidence score */
    confidence: number
    /** When knowledge was added */
    createdAt: Date
}

export interface SearchResult<T> {
    item: T
    score: number
    matchReason: string
}

export interface VectorStoreConfig {
    /** Use vector embeddings (requires API) */
    useEmbeddings: boolean
    /** Embedding model to use */
    embeddingModel: string
    /** Maximum patterns to store */
    maxPatterns: number
    /** Maximum knowledge entries */
    maxKnowledge: number
    /** Similarity threshold (0-1) */
    similarityThreshold: number
}

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_CONFIG: VectorStoreConfig = {
    useEmbeddings: false, // Start with keyword-based for cost savings
    embeddingModel: 'text-embedding-3-small',
    maxPatterns: 1000,
    maxKnowledge: 5000,
    similarityThreshold: 0.15, // Lower threshold for keyword-based matching (increase when using embeddings)
}

// =============================================================================
// In-Memory Store (Development/Testing)
// =============================================================================

/**
 * In-memory vector store for development and testing.
 * Replace with Supabase pgvector in production.
 */
class InMemoryVectorStore {
    private patterns: Map<string, BlueprintPattern> = new Map()
    private knowledge: Map<string, PMKnowledge> = new Map()
    private config: VectorStoreConfig

    constructor(config: Partial<VectorStoreConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config }
        this.initializeDefaultKnowledge()
    }

    // =========================================================================
    // Pattern Storage
    // =========================================================================

    /**
     * Stores a blueprint pattern for future retrieval.
     */
    async storePattern(pattern: BlueprintPattern): Promise<void> {
        if (this.patterns.size >= this.config.maxPatterns) {
            // Remove lowest quality pattern
            const sorted = [...this.patterns.values()].sort((a, b) => a.qualityScore - b.qualityScore)
            if (sorted.length > 0) {
                this.patterns.delete(sorted[0].id)
            }
        }

        this.patterns.set(pattern.id, pattern)
        logInfo('pattern_stored', { id: pattern.id, category: pattern.category })
    }

    /**
     * Searches for similar patterns based on query.
     */
    async searchPatterns(
        query: string,
        category?: string,
        limit: number = 3
    ): Promise<SearchResult<BlueprintPattern>[]> {
        const results: SearchResult<BlueprintPattern>[] = []
        const queryLower = query.toLowerCase()
        const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 2)

        for (const pattern of this.patterns.values()) {
            // Filter by category if specified
            if (category && pattern.category !== category) continue

            // Calculate similarity score
            const score = this.calculatePatternSimilarity(pattern, queryTerms, queryLower)

            if (score >= this.config.similarityThreshold) {
                results.push({
                    item: pattern,
                    score,
                    matchReason: this.getPatternMatchReason(pattern, queryTerms),
                })
            }
        }

        return results
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
    }

    /**
     * Gets patterns by category.
     */
    async getPatternsByCategory(category: string): Promise<BlueprintPattern[]> {
        return [...this.patterns.values()].filter(p => p.category === category)
    }

    // =========================================================================
    // Knowledge Storage
    // =========================================================================

    /**
     * Stores PM knowledge for retrieval.
     */
    async storeKnowledge(knowledge: PMKnowledge): Promise<void> {
        if (this.knowledge.size >= this.config.maxKnowledge) {
            // Remove oldest, lowest confidence knowledge
            const sorted = [...this.knowledge.values()]
                .sort((a, b) => a.confidence - b.confidence || a.createdAt.getTime() - b.createdAt.getTime())
            if (sorted.length > 0) {
                this.knowledge.delete(sorted[0].id)
            }
        }

        this.knowledge.set(knowledge.id, knowledge)
        logDebug('knowledge_stored', { id: knowledge.id, topic: knowledge.topic })
    }

    /**
     * Searches knowledge base by topic and query.
     */
    async searchKnowledge(
        query: string,
        topic?: string,
        limit: number = 5
    ): Promise<SearchResult<PMKnowledge>[]> {
        const results: SearchResult<PMKnowledge>[] = []
        const queryLower = query.toLowerCase()
        const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 2)

        for (const knowledge of this.knowledge.values()) {
            // Filter by topic if specified
            if (topic && knowledge.topic !== topic && !knowledge.relatedTopics.includes(topic)) {
                continue
            }

            // Calculate similarity score
            const score = this.calculateKnowledgeSimilarity(knowledge, queryTerms, queryLower)

            if (score >= this.config.similarityThreshold * 0.8) { // Slightly lower threshold for knowledge
                results.push({
                    item: knowledge,
                    score,
                    matchReason: this.getKnowledgeMatchReason(knowledge, queryTerms),
                })
            }
        }

        return results
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
    }

    /**
     * Gets all knowledge for a topic.
     */
    async getKnowledgeByTopic(topic: string): Promise<PMKnowledge[]> {
        return [...this.knowledge.values()].filter(
            k => k.topic === topic || k.relatedTopics.includes(topic)
        )
    }

    // =========================================================================
    // Enrichment Functions
    // =========================================================================

    /**
     * Enriches a query with relevant knowledge.
     * Returns formatted context string for LLM.
     */
    async enrichWithKnowledge(query: string, topic: string): Promise<string> {
        const results = await this.searchKnowledge(query, topic, 3)

        if (results.length === 0) {
            return ''
        }

        const parts = ['## Relevant PM Knowledge\n']

        for (const result of results) {
            parts.push(`### ${result.item.topic}`)
            parts.push(result.item.content)
            parts.push(`*Source: ${result.item.source}, Confidence: ${(result.item.confidence * 100).toFixed(0)}%*\n`)
        }

        return parts.join('\n')
    }

    /**
     * Enriches query with similar patterns.
     */
    async enrichWithPatterns(query: string, category?: string): Promise<string> {
        const results = await this.searchPatterns(query, category, 2)

        if (results.length === 0) {
            return ''
        }

        const parts = ['## Similar Project Patterns\n']

        for (const result of results) {
            parts.push(`### ${result.item.sourceName} (${result.item.category})`)
            parts.push(`- Tech Stack: ${result.item.techStack}`)
            parts.push(`- Common Behaviors: ${result.item.behaviors.length}`)
            parts.push(`- Quality Score: ${(result.item.qualityScore * 100).toFixed(0)}%`)
            parts.push(`- Match: ${result.matchReason}\n`)
        }

        return parts.join('\n')
    }

    // =========================================================================
    // Private Methods
    // =========================================================================

    private calculatePatternSimilarity(
        pattern: BlueprintPattern,
        queryTerms: string[],
        queryLower: string
    ): number {
        let score = 0
        const maxScore = queryTerms.length + 3 // terms + category + tech + behaviors

        // Match query terms in category
        if (queryLower.includes(pattern.category)) score += 1

        // Match tech stack
        const techLower = pattern.techStack.toLowerCase()
        for (const term of queryTerms) {
            if (techLower.includes(term)) score += 0.5
        }

        // Match behaviors
        for (const behavior of pattern.behaviors) {
            for (const phrase of behavior.triggerPhrases) {
                for (const term of queryTerms) {
                    if (phrase.toLowerCase().includes(term)) score += 0.3
                }
            }
        }

        // Match integrations
        for (const integration of pattern.integrations) {
            if (queryLower.includes(integration.toLowerCase())) score += 0.5
        }

        // Boost by quality score
        score *= (0.5 + pattern.qualityScore * 0.5)

        return Math.min(score / maxScore, 1)
    }

    private calculateKnowledgeSimilarity(
        knowledge: PMKnowledge,
        queryTerms: string[],
        queryLower: string
    ): number {
        let score = 0
        const maxScore = queryTerms.length + 2

        // Topic match
        if (queryLower.includes(knowledge.topic)) score += 1

        // Content matches
        const contentLower = knowledge.content.toLowerCase()
        for (const term of queryTerms) {
            if (contentLower.includes(term)) score += 0.5
        }

        // Related topics match
        for (const related of knowledge.relatedTopics) {
            if (queryLower.includes(related)) score += 0.3
        }

        // Boost by confidence
        score *= (0.5 + knowledge.confidence * 0.5)

        return Math.min(score / maxScore, 1)
    }

    private getPatternMatchReason(pattern: BlueprintPattern, queryTerms: string[]): string {
        const reasons: string[] = []

        if (queryTerms.some(t => pattern.category.includes(t))) {
            reasons.push(`Category: ${pattern.category}`)
        }
        if (queryTerms.some(t => pattern.techStack.toLowerCase().includes(t))) {
            reasons.push(`Tech: ${pattern.techStack}`)
        }
        if (pattern.integrations.some(i => queryTerms.some(t => i.toLowerCase().includes(t)))) {
            reasons.push(`Integration match`)
        }

        return reasons.join(', ') || 'Similar project type'
    }

    private getKnowledgeMatchReason(knowledge: PMKnowledge, queryTerms: string[]): string {
        const reasons: string[] = []

        if (queryTerms.some(t => knowledge.topic.includes(t))) {
            reasons.push(`Topic: ${knowledge.topic}`)
        }
        if (queryTerms.some(t => knowledge.content.toLowerCase().includes(t))) {
            reasons.push('Content match')
        }

        return reasons.join(', ') || 'Related knowledge'
    }

    /**
     * Initializes default PM knowledge base.
     */
    private initializeDefaultKnowledge(): void {
        const defaultKnowledge: Omit<PMKnowledge, 'id' | 'createdAt'>[] = [
            {
                topic: 'authentication',
                content: `Best practices for authentication:
- Use OAuth 2.0 / OpenID Connect for third-party auth
- Implement rate limiting on login endpoints
- Use secure session management (httpOnly cookies, short TTL)
- Consider passwordless options (magic links, passkeys)
- Always hash passwords with bcrypt/argon2
- Implement MFA for sensitive operations`,
                source: 'best-practice',
                relatedTopics: ['security', 'users', 'onboarding'],
                confidence: 0.95,
            },
            {
                topic: 'payments',
                content: `Payment integration best practices:
- Use established providers (Stripe, PayPal) for PCI compliance
- Never store raw card data
- Implement webhook handlers for payment events
- Handle failed payments gracefully with retry logic
- Consider subscription billing complexity early
- Plan for refunds, disputes, and chargebacks`,
                source: 'best-practice',
                relatedTopics: ['integrations', 'security', 'subscription'],
                confidence: 0.95,
            },
            {
                topic: 'onboarding',
                content: `User onboarding patterns:
- Progressive disclosure: don't overwhelm new users
- Clear value proposition on first screen
- Minimal required fields for signup
- Email verification can be deferred
- Consider guided tours for complex features
- Track onboarding completion rates`,
                source: 'best-practice',
                relatedTopics: ['users', 'analytics', 'ux'],
                confidence: 0.9,
            },
            {
                topic: 'database',
                content: `Database design considerations:
- Start with a schema that supports your MVP
- Plan for soft deletes on user-facing data
- Index frequently queried fields
- Consider read/write patterns for scaling
- Use transactions for multi-step operations
- Firebase: structure for query efficiency
- Postgres: normalize where sensible, denormalize for performance`,
                source: 'best-practice',
                relatedTopics: ['performance', 'scaling', 'architecture'],
                confidence: 0.9,
            },
            {
                topic: 'api',
                content: `API design best practices:
- RESTful conventions for predictability
- Consistent error response format
- Pagination for list endpoints
- Rate limiting per user/IP
- API versioning strategy (URL or header)
- Comprehensive input validation
- Clear documentation (OpenAPI/Swagger)`,
                source: 'best-practice',
                relatedTopics: ['backend', 'security', 'integrations'],
                confidence: 0.9,
            },
            {
                topic: 'notifications',
                content: `Notification system design:
- Support multiple channels (email, push, in-app)
- User preferences for notification types
- Batch similar notifications to avoid spam
- Implement unsubscribe mechanisms
- Template system for consistent messaging
- Consider timezone-aware scheduling`,
                source: 'best-practice',
                relatedTopics: ['users', 'integrations', 'ux'],
                confidence: 0.85,
            },
            {
                topic: 'error-handling',
                content: `Error handling patterns:
- Structured error responses with codes
- User-friendly error messages (hide technical details)
- Detailed logging for debugging
- Error tracking service (Sentry, etc.)
- Graceful degradation for non-critical features
- Retry logic for transient failures`,
                source: 'best-practice',
                relatedTopics: ['api', 'ux', 'debugging'],
                confidence: 0.9,
            },
            {
                topic: 'security',
                content: `Security fundamentals:
- HTTPS everywhere
- CORS configuration for APIs
- Input sanitization and validation
- SQL injection / XSS prevention
- CSRF tokens for forms
- Rate limiting and abuse prevention
- Regular dependency updates
- Principle of least privilege`,
                source: 'best-practice',
                relatedTopics: ['api', 'authentication', 'backend'],
                confidence: 0.95,
            },
        ]

        for (let i = 0; i < defaultKnowledge.length; i++) {
            const k = defaultKnowledge[i]
            this.knowledge.set(`default-${i}`, {
                ...k,
                id: `default-${i}`,
                createdAt: new Date(),
            })
        }

        logDebug('default_knowledge_initialized', { count: defaultKnowledge.length })
    }

    // =========================================================================
    // Statistics
    // =========================================================================

    getStats(): { patterns: number; knowledge: number } {
        return {
            patterns: this.patterns.size,
            knowledge: this.knowledge.size,
        }
    }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let vectorStoreInstance: InMemoryVectorStore | null = null

/**
 * Gets or creates the vector store instance.
 */
export function getVectorStore(config?: Partial<VectorStoreConfig>): InMemoryVectorStore {
    if (!vectorStoreInstance) {
        vectorStoreInstance = new InMemoryVectorStore(config)
        logInfo('vector_store_initialized', vectorStoreInstance.getStats())
    }
    return vectorStoreInstance
}

/**
 * Resets the vector store (for testing).
 */
export function resetVectorStore(): void {
    vectorStoreInstance = null
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Searches for similar blueprint patterns.
 */
export async function searchSimilarPatterns(
    query: string,
    category?: string
): Promise<SearchResult<BlueprintPattern>[]> {
    return getVectorStore().searchPatterns(query, category)
}

/**
 * Enriches query with relevant PM knowledge.
 */
export async function enrichWithKnowledge(
    query: string,
    topic: string
): Promise<string> {
    return getVectorStore().enrichWithKnowledge(query, topic)
}

/**
 * Stores a blueprint pattern for learning.
 */
export async function storePattern(pattern: BlueprintPattern): Promise<void> {
    return getVectorStore().storePattern(pattern)
}

/**
 * Stores PM knowledge.
 */
export async function storeKnowledge(knowledge: PMKnowledge): Promise<void> {
    return getVectorStore().storeKnowledge(knowledge)
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
 * Validates the vector store with test cases.
 */
export async function validateVectorStore(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = []

    // Reset for clean test
    resetVectorStore()
    const store = getVectorStore()

    // Test 1: Default knowledge exists
    const stats = store.getStats()
    results.push({
        test: 'Default knowledge initialized',
        passed: stats.knowledge > 0,
        details: `${stats.knowledge} knowledge entries`,
    })

    // Test 2: Store and retrieve pattern
    const testPattern: BlueprintPattern = {
        id: 'test-1',
        category: 'saas',
        techStack: 'nextjs/express/postgres',
        behaviors: [
            {
                triggerType: 'user-action',
                triggerPhrases: ['user signs up', 'user registers'],
                responsePatterns: ['create account', 'send verification'],
            },
        ],
        integrations: ['stripe', 'sendgrid'],
        scopePatterns: {
            typicalInScope: 8,
            typicalDeferred: 3,
            commonCategories: ['auth', 'billing', 'notifications'],
        },
        embedding: undefined,
        createdAt: new Date(),
        sourceName: 'Test SaaS App',
        qualityScore: 0.85,
    }

    await store.storePattern(testPattern)
    const patternResults = await store.searchPatterns('saas with stripe')

    results.push({
        test: 'Pattern storage and retrieval',
        passed: patternResults.length > 0 && patternResults[0].item.id === 'test-1',
        details: `Found ${patternResults.length} patterns`,
    })

    // Test 3: Knowledge search
    const knowledgeResults = await store.searchKnowledge('how to implement login')

    results.push({
        test: 'Knowledge search',
        passed: knowledgeResults.length > 0,
        details: `Found ${knowledgeResults.length} knowledge items, top: ${knowledgeResults[0]?.item.topic || 'none'}`,
    })

    // Test 4: Enrichment
    const enrichment = await store.enrichWithKnowledge('setting up user auth', 'authentication')

    results.push({
        test: 'Knowledge enrichment',
        passed: enrichment.length > 0 && enrichment.includes('authentication'),
        details: `Enrichment length: ${enrichment.length} chars`,
    })

    // Test 5: Pattern enrichment
    const patternEnrichment = await store.enrichWithPatterns('building a saas app')

    results.push({
        test: 'Pattern enrichment',
        passed: patternEnrichment.length > 0,
        details: `Pattern enrichment: ${patternEnrichment.length} chars`,
    })

    return results
}
