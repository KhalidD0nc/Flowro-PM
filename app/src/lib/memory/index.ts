/**
 * Memory Module Index
 * 
 * Phase 3: Intelligence Layer - Memory Compression System
 * 
 * @module memory
 * @version 3.0.0
 */

export {
    // Types
    type ChatMessage,
    type CompressedMemory,
    type EntityMention,
    type CompressionConfig,
    type CompressionResult,

    // Core Functions
    compressConversation,
    extractDecisions,
    extractOpenQuestions,
    extractTopics,
    extractEntities,
    generateSummary,

    // Serialization
    memoryToContext,
    parseStoredMemory,

    // Validation
    validateMemoryCompressor,
    type ValidationResult,
} from './compressor'
