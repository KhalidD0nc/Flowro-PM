/**
 * Chat Component Types
 * 
 * Shared types for the chat interface components.
 * Follows the Architecture-Simplification-Plan Phase 4 structure.
 */

// Note: We use UBPContent from UBPViewer for compatibility with the viewer component
import type { UBPContent } from "@/components/UBPViewer"

// =============================================================================
// Intent Types
// =============================================================================

/**
 * Intent types for conversational PM flow
 * - initial: First blueprint generation
 * - discussion: General conversation
 * - proposal: Suggested changes to blueprint
 */
export type Intent = "initial" | "discussion" | "proposal"

// =============================================================================
// Message Types
// =============================================================================

/**
 * Proposed changes structure for proposal intents
 */
export interface ProposedChanges {
  action: "add" | "update" | "remove"
  summary: string
  sections: string[]
  changes: Record<string, unknown>
}

/**
 * Chat message structure
 */
export interface ChatMessage {
  role: "user" | "assistant"
  content: string
  timestamp: string
  intent?: Intent
  proposedChanges?: ProposedChanges
}

// =============================================================================
// Blueprint Types
// =============================================================================

/**
 * Blueprint document structure
 */
export interface Blueprint {
  id: string
  projectId: string
  version: string
  status: "draft" | "locked" | "approved"
  content: unknown | null
  createdAt: string
  lockedAt?: string
}

// =============================================================================
// Project Types
// =============================================================================

/**
 * Project document with chat history and blueprint
 */
export interface Project {
  id: string
  projectName: string
  description?: string
  chatHistory: ChatMessage[]
  createdAt: string
  updatedAt: string
  latestBlueprint?: Blueprint
}

// =============================================================================
// Generate API Types
// =============================================================================

/**
 * Result from the generate API
 */
export interface GenerateResult {
  intent: Intent
  message: string
  content: unknown
  proposedChanges?: ProposedChanges
  rawContent: string
  productName?: string
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
}

/**
 * Props for MessageList component
 */
export interface MessageListProps {
  messages: ChatMessage[]
  isStreaming: boolean
  streamedContent: string
  isGenerating: boolean
  thinkingPhase: number
  onOpenBlueprint: () => void
  onApplyProposedChanges: (changes: ProposedChanges, index: number) => void
  messagesEndRef: React.RefObject<HTMLDivElement | null>
}

/**
 * Props for ChatPanel component
 */
export interface ChatPanelProps {
  project: Project
  currentUBP: UBPContent | null
  isGenerating: boolean
  isStreaming: boolean
  streamedContent: string
  thinkingPhase: number
  message: string
  error: string | null
  selectionContext: SelectionContext | null
  onMessageChange: (message: string) => void
  onSendMessage: (e: React.FormEvent) => void
  onOpenBlueprint: () => void
  onApplyProposedChanges: (changes: ProposedChanges, index: number) => void
  onClearContext: () => void
  onQuickAction: (message: string) => void
  onRetry?: () => void // Issue 6: Retry failed generation
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if content has UBP structure
 */
export function isUBPContent(content: unknown): boolean {
  if (!content || typeof content !== "object") return false

  const ubpKeys = [
    "productVision",
    "scope",
    "actors",
    "behaviors",
    "constraints",
    "constraintsRisks",
    "techDecisions",
    "techStack",
    "phases",
    "integrations",
    "changelog",
    "changeLog",
  ]
  const contentObj = content as Record<string, unknown>

  return ubpKeys.some((key) => key in contentObj)
}
