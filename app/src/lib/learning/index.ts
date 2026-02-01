/**
 * Learning Module Index
 * 
 * Phase 3: Intelligence Layer - Pattern Extraction & Learning
 * 
 * @module learning
 * @version 3.0.0
 */

export {
    // Types
    type UBP,
    type ExtractedPattern,
    type QualityMetrics,
    type ProjectCategory,
    type BatchLearningResult,

    // Core Functions
    learnFromApprovedBlueprint,
    calculateQualityMetrics,
    detectCategory,
    extractPattern,
    extractKnowledge,
    learnFromBlueprintBatch,

    // Validation
    validatePatternExtractor,
    type ValidationResult,
} from './patternExtractor'
