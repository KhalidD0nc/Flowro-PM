"use client";

import { useRef } from "react";
import MessageList, { WelcomeScreen } from "./MessageList";
import ChatInput from "./ChatInput";
import ChatHeader from "./ChatHeader";
import type { ChatPanelProps, ProposedChanges } from "./types";

export default function ChatPanel({
  project,
  user,
  currentPrd,
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
  actionMode,
  onActionModeChange,
  onOpenBlueprint,
  onProjectSelect,
  onGoHome,
  onApplyProposedChanges,
  onClearContext,
  onQuickAction,
  onRetry,
  clarificationSummaries,
  activeClarificationQuestion,
  clarificationAnswers,
  onClarificationToggle,
  onClarificationCustomTextChange,
  onClarificationContinue,
  canContinueClarificationStep,
  isClarificationReady,
}: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleApplyProposedChanges = (changes: ProposedChanges, index: number) => {
    onApplyProposedChanges(changes, index);
  };

  const placeholder =
    currentPrd
      ? project.chatHistory.length > 0
        ? "Ask Flowro to refine the project plan..."
        : "Describe your product idea..."
      : project.chatHistory.length > 0
        ? "Answer the current question or ask about the plan..."
        : "Describe your product idea...";

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-[#191919]">
      <ChatHeader project={project} user={user} onOpenBlueprint={onOpenBlueprint} onProjectSelect={onProjectSelect} onGoHome={onGoHome} />
      <div className="relative flex min-h-0 flex-1 flex-col">
        {project.chatHistory.length === 0 ? (
          <WelcomeScreen onQuickAction={onQuickAction} />
        ) : (
          <MessageList
            messages={project.chatHistory}
            currentPrd={currentPrd}
            isStreaming={isStreaming}
            streamedContent={streamedContent}
            isGenerating={isGenerating}
            thinkingPhase={thinkingPhase}
            generationMode={generationMode}
            onOpenBlueprint={onOpenBlueprint}
            onApplyProposedChanges={handleApplyProposedChanges}
            messagesEndRef={messagesEndRef}
            onQuickAction={onQuickAction}
          />
        )}

        {error ? (
          <div className="mx-5 mb-3 rounded-[1rem] border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-200 shadow-[0_18px_32px_-28px_rgba(239,68,68,0.5)]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-lg">error</span>
                <span>{error}</span>
              </div>
              {onRetry ? (
                <button
                  onClick={onRetry}
                  disabled={isGenerating}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-red-300/30 bg-red-300/10 px-3 py-1.5 text-sm font-medium text-red-100 transition hover:bg-red-300/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[16px]">refresh</span>
                  Retry
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        <ChatInput
          message={message}
          onMessageChange={onMessageChange}
          onSend={onSendMessage}
          actionMode={actionMode}
          onActionModeChange={onActionModeChange}
          isGenerating={isGenerating}
          selectionContext={selectionContext}
          onClearContext={onClearContext}
          placeholder={placeholder}
          clarificationSummaries={clarificationSummaries}
          activeClarificationQuestion={activeClarificationQuestion}
          clarificationAnswers={clarificationAnswers}
          onClarificationToggle={onClarificationToggle}
          onClarificationCustomTextChange={onClarificationCustomTextChange}
          onClarificationContinue={onClarificationContinue}
          canContinueClarificationStep={canContinueClarificationStep}
          isClarificationReady={isClarificationReady}
        />
      </div>
    </div>
  );
}
