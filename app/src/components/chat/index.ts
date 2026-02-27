/**
 * Chat Components Index
 * 
 * Exports all chat-related components and types.
 * Types are sourced from the unified type system at lib/types/views.ts.
 */

export { default as ChatPanel } from "./ChatPanel"
export { default as ChatInput } from "./ChatInput"
export { default as MessageList, WelcomeScreen } from "./MessageList"

// Re-export types from unified source (via chat/types.ts thin layer)
export type {
  Intent,
  ProposedChanges,
  ChatMessage,
  MessageView,
  Blueprint,
  BlueprintView,
  Project,
  ProjectView,
  GenerateResult,
  DisplayInfo,
  SelectionContext,
  ChatInputProps,
  MessageListProps,
  ChatPanelProps,
} from "./types"

// Re-export utility function
export { isUBPContent } from "./types"
