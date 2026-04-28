/**
 * Unified View Types
 * 
 * Single source of truth for all frontend data types.
 * These are "view" types — what the frontend works with after API responses
 * are transformed from Firestore documents.
 * 
 * Backend types live in lib/firebase/schema.ts
 * Frontend types live HERE.
 */

import type { ClarificationQuestion, ClarificationResponse, PRDConfig, ProposedPrdChanges } from "@/lib/prd/schema"
import type { BuildRun, DesignArtifact, ProjectPlan, ProjectStage } from "@/lib/project-plan/schema"

// =============================================================================
// Intent Types
// =============================================================================

/**
 * Intent types for conversational PM flow
 * - initial: First blueprint generation
 * - discussion: General conversation
 * - proposal: Suggested changes to blueprint
 */
export type Intent = "initial" | "clarification" | "discussion" | "proposal"

// =============================================================================
// Message Types
// =============================================================================

export type ProposedChanges = ProposedPrdChanges

/**
 * Frontend view of a chat message (after API transformation).
 * Corresponds to MessageDocument in schema.ts but with ISO timestamps
 * and without Firestore-specific fields.
 */
export interface MessageView {
    id?: string
    role: "user" | "assistant"
    content: string
    timestamp: string
    intent?: Intent
    proposedChanges?: ProposedChanges
}

// Backward-compatible alias
export type ChatMessage = MessageView

// =============================================================================
// Blueprint Types
// =============================================================================

/**
 * Frontend view of a blueprint document.
 * Corresponds to BlueprintDocument in schema.ts but with
 * ISO timestamps and extracted metadata fields.
 */
export interface BlueprintView {
    id: string
    projectId: string
    version: string
    status: "draft" | "locked" | "approved"
    content: unknown | null
    createdAt: string
    lockedAt?: string
}

// Backward-compatible alias
export type Blueprint = BlueprintView

export interface PRDView {
    id: string
    projectId: string
    config: PRDConfig
    updatedAt: string
}

export type PRD = PRDView

export interface ProjectPlanView {
    id: string
    projectId: string
    plan: ProjectPlan
    status: "draft" | "approved"
    approvedAt?: string
    approvedBy?: string
    updatedAt: string
    legacyPrd?: boolean
}

// =============================================================================
// Project Types
// =============================================================================

/**
 * Frontend view of a project with embedded chat history and blueprint.
 * This is the shape returned by GET /api/projects/[projectId].
 */
export interface ProjectView {
    id: string
    projectName: string
    description?: string
    stage?: ProjectStage
    chatHistory: MessageView[]
    createdAt: string
    updatedAt: string
    latestPrd?: PRDView
    latestPlan?: ProjectPlanView
    designArtifacts?: DesignArtifact[]
    buildRuns?: BuildRun[]
}

// Backward-compatible alias
export type Project = ProjectView

// =============================================================================
// Generate API Types
// =============================================================================

/**
 * Result from the generate API
 */
export interface GenerateResult {
    intent: Intent
    message: string
    prdConfig?: PRDConfig
    projectPlan?: ProjectPlan
    productName?: string
    questions?: ClarificationResponse["questions"]
    remainingRequired?: ClarificationResponse["remainingRequired"]
    stage?: ClarificationResponse["stage"]
}

export interface EnhanceResult {
    intent: Extract<Intent, "discussion" | "proposal">
    message: string
    proposedChanges?: ProposedChanges
}

// =============================================================================
// Display Types
// =============================================================================

/**
 * Display info for rendering messages
 */
export interface DisplayInfo {
    text: string
    intent: Intent
    proposedChanges?: ProposedChanges
    clarificationQuestions?: ClarificationQuestion[]
}

export interface ClarificationAnswerState {
    questionId: string
    selectedOptionIds: string[]
    customText: string
    isComplete: boolean
}

export interface ClarificationAnsweredSummary {
    questionId: string
    prompt: string
    answerText: string
}

/**
 * Selection context for AI enhancement
 */
export interface SelectionContext {
    section: string
    text: string
}

// =============================================================================
// Component Props
// =============================================================================

/**
 * Props for ChatInput component
 */
export interface ChatInputProps {
    message: string
    onMessageChange: (message: string) => void
    onSend: (e: React.FormEvent) => void
    isGenerating: boolean
    selectionContext: SelectionContext | null
    onClearContext: () => void
    placeholder?: string
    clarificationSummaries?: ClarificationAnsweredSummary[]
    activeClarificationQuestion?: ClarificationQuestion | null
    clarificationAnswers?: Record<string, ClarificationAnswerState>
    onClarificationToggle?: (question: ClarificationQuestion, optionId: string) => void
    onClarificationCustomTextChange?: (questionId: string, value: string) => void
    onClarificationContinue?: () => void
    canContinueClarificationStep?: boolean
    isClarificationReady?: boolean
}

/**
 * Props for MessageList component
 */
export interface MessageListProps {
    messages: MessageView[]
    currentPrd?: PRDConfig | null
    isStreaming: boolean
    streamedContent: string
    isGenerating: boolean
    thinkingPhase?: number
    generationMode: 'initial' | 'update' | 'chat'
    onOpenBlueprint: () => void
    onApplyProposedChanges: (changes: ProposedChanges, index: number) => void
    messagesEndRef: React.RefObject<HTMLDivElement | null>
}

/**
 * Props for ChatPanel component
 */
export interface ChatPanelProps {
    project: ProjectView
    currentPrd?: PRDConfig | null
    isGenerating: boolean
    isStreaming: boolean
    streamedContent: string
    thinkingPhase?: number
    generationMode: 'initial' | 'update' | 'chat'
    message: string
    error: string | null
    selectionContext: SelectionContext | null
    onMessageChange: (message: string) => void
    onSendMessage: (e: React.FormEvent) => void
    onOpenBlueprint: () => void
    onApplyProposedChanges: (changes: ProposedChanges, index: number) => void
    onClearContext: () => void
    onQuickAction: (message: string) => void
    onRetry?: () => void
    clarificationSummaries?: ClarificationAnsweredSummary[]
    activeClarificationQuestion?: ClarificationQuestion | null
    clarificationAnswers?: Record<string, ClarificationAnswerState>
    onClarificationToggle?: (question: ClarificationQuestion, optionId: string) => void
    onClarificationCustomTextChange?: (questionId: string, value: string) => void
    onClarificationContinue?: () => void
    canContinueClarificationStep?: boolean
    isClarificationReady?: boolean
}

// Re-export UBPContent for convenience
export type { UBPContent } from "@/components/UBPViewer"
export type { PRDConfig } from "@/lib/prd/schema"
