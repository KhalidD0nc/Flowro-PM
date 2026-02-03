/**
 * Chat Components Index
 * 
 * Exports all chat-related components for Phase 4 implementation.
 * @see /Docs/Architecture-Simplification-Plan.md Phase 4
 */

export { default as ChatPanel } from "./ChatPanel"
export { default as ChatInput } from "./ChatInput"
export { default as MessageList, WelcomeScreen } from "./MessageList"

// Re-export types
export type {
  Intent,
  ProposedChanges,
  ChatMessage,
  Blueprint,
  Project,
  GenerateResult,
  DisplayInfo,
  SelectionContext,
  ChatInputProps,
  MessageListProps,
  ChatPanelProps,
} from "./types"

export { isUBPContent } from "./types"
