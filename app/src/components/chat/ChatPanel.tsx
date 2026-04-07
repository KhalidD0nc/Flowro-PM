/**
 * ChatPanel Component
 * 
 * Main chat container that orchestrates:
 * - MessageList for displaying messages
 * - ChatInput for user input
 * - Welcome screen for empty state
 * 
 * @see /Docs/Architecture-Simplification-Plan.md Phase 4.2
 */

"use client"

import { useRef } from "react"
import MessageList, { WelcomeScreen } from "./MessageList"
import ChatInput from "./ChatInput"
import type { ChatPanelProps, ProposedChanges } from "./types"

export default function ChatPanel({
  project,
  currentPrd: _currentPrd,
  isGenerating,
  isStreaming,
  streamedContent,
  thinkingPhase,
  generationMode,
  message,
  error,
  selectionContext,
  onMessageChange,
  onSendMessage,
  onOpenBlueprint,
  onApplyProposedChanges,
  onClearContext,
  onQuickAction,
  onRetry,
}: ChatPanelProps) {
  void _currentPrd
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const handleQuickAction = (actionMessage: string) => {
    onQuickAction(actionMessage)
  }

  const handleApplyProposedChanges = (changes: ProposedChanges, index: number) => {
    onApplyProposedChanges(changes, index)
  }

  // Determine placeholder based on conversation state
  const placeholder = project.chatHistory.length > 0 ? "Ask me anything..." : "Describe your product idea..."

  return (
    <>
      {/* Chat Messages or Welcome Screen */}
      {project.chatHistory.length === 0 ? (
        <WelcomeScreen onQuickAction={handleQuickAction} />
      ) : (
        <MessageList
          messages={project.chatHistory}
          isStreaming={isStreaming}
          streamedContent={streamedContent}
          isGenerating={isGenerating}
          thinkingPhase={thinkingPhase}
          generationMode={generationMode}
          onOpenBlueprint={onOpenBlueprint}
          onApplyProposedChanges={handleApplyProposedChanges}
          messagesEndRef={messagesEndRef}
        />
      )}

      {/* Inline Error Display for Transient Generation Errors */}
      {error && (
        <div className="mx-auto w-full max-w-3xl px-4 pb-2">
          <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <div className="flex items-center gap-3 text-red-400">
              <span className="material-symbols-outlined text-lg">error</span>
              <span className="text-sm">{error}</span>
            </div>
            {onRetry && (
              <button
                onClick={onRetry}
                disabled={isGenerating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span>
                Retry
              </button>
            )}
          </div>
        </div>
      )}

      {/* Message Input */}
      <ChatInput
        message={message}
        onMessageChange={onMessageChange}
        onSend={onSendMessage}
        isGenerating={isGenerating}
        selectionContext={selectionContext}
        onClearContext={onClearContext}
        placeholder={placeholder}
      />
    </>
  )
}
