/**
 * RAG Module Index
 * 
 * Phase 3: Intelligence Layer - Vector Store Foundation
 * 
 * @module rag
 * @version 3.0.0
 */

export {
    // Types
    type BlueprintPattern,
    type BehaviorPattern,
    type ScopePattern,
    type PMKnowledge,
    type SearchResult,
    type VectorStoreConfig,

    // Core Functions
    getVectorStore,
    resetVectorStore,
    searchSimilarPatterns,
    enrichWithKnowledge,
    storePattern,
    storeKnowledge,

    // Validation
    validateVectorStore,
    type ValidationResult,
} from './vectorStore'
