/**
 * Chat Component Types
 * 
 * Thin re-export layer from the unified type system at lib/types/views.ts.
 * Maintains backward compatibility — all existing imports from this file
 * or from the chat/index.ts barrel continue to work.
 */

// Re-export all types from the unified source
export type {
  Intent,
  ProposedChanges,
  ChatMessage,
  MessageView,
  Blueprint,
  BlueprintView,
  PRD,
  PRDView,
  Project,
  ProjectView,
  GenerateResult,
  DisplayInfo,
  SelectionContext,
  ChatInputProps,
  MessageListProps,
  ChatPanelProps,
  UBPContent,
  PRDConfig,
} from "@/lib/types/views"

// Re-export utility functions from transforms
export { isUBPContent } from "@/lib/transforms/ubp"
