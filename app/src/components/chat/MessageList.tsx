/**
 * MessageList Component
 * 
 * Displays chat messages with:
 * - User and assistant message bubbles
 * - Smooth word-by-word streaming animation
 * - Thinking indicator with phases
 * - Proposal and blueprint action buttons
 * - Welcome screen with quick actions
 * 
 * @see /Docs/Architecture-Simplification-Plan.md Phase 4.3
 * @see /Docs/Brand-Guidelines.md - Visual aesthetics & animations
 */

"use client"

import type { MessageListProps, ChatMessage, Intent, DisplayInfo, ProposedChanges } from "./types"
import { isUBPContent } from "./types"
import { useStreamingText } from "@/hooks/useStreamingText"

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Extract display info from assistant message content
 */
function getDisplayMessage(
  content: string | object,
  msgIntent?: Intent,
  msgProposedChanges?: ProposedChanges
): DisplayInfo {
  const extractMessage = (obj: Record<string, unknown>, fallbackIntent: Intent): string => {
    if (obj.message && typeof obj.message === "string" && obj.message.trim().length > 0) {
      return obj.message
    }
    if (fallbackIntent === "initial") {
      return "I've created your Unified Blueprint! Check it out and let me know what you think."
    }
    if (fallbackIntent === "proposal") {
      return "I have some suggested changes for your blueprint."
    }
    return "Let me know what you'd like to explore!"
  }

  const isRawJson = (str: string): boolean => {
    const trimmed = str.trim()
    return (
      (trimmed.startsWith("{") && trimmed.includes('"intent"')) ||
      (trimmed.startsWith("{") && trimmed.includes('"message"')) ||
      trimmed.startsWith("```")
    )
  }

  const cleanJsonString = (str: string): string => {
    let clean = str.trim()
    if (clean.startsWith("```")) {
      clean = clean.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "")
    }
    return clean
  }

  if (msgIntent) {
    let parsed: unknown = content
    if (typeof content === "string") {
      try {
        const cleanContent = cleanJsonString(content)
        parsed = JSON.parse(cleanContent)
      } catch {
        if (isRawJson(content)) {
          return { text: extractMessage({}, msgIntent), intent: msgIntent, proposedChanges: msgProposedChanges }
        }
      }
    }
    const obj = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null
    const text = obj
      ? extractMessage(obj, msgIntent)
      : typeof content === "string" && !isRawJson(content)
        ? content
        : extractMessage({}, msgIntent)

    return {
      text,
      intent: msgIntent,
      proposedChanges: msgProposedChanges,
    }
  }

  // Legacy parsing for existing chat history without intent
  let parsed: unknown = content

  if (typeof content === "string") {
    try {
      const cleanContent = cleanJsonString(content)
      parsed = JSON.parse(cleanContent)
    } catch {
      if (isRawJson(content)) {
        return { text: "Let me know what you'd like to explore!", intent: "discussion" }
      }
      return { text: content, intent: "discussion" }
    }
  }

  if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>
    const intent =
      obj.intent === "initial" || obj.intent === "discussion" || obj.intent === "proposal"
        ? (obj.intent as Intent)
        : isUBPContent(obj)
          ? "initial"
          : "discussion"

    const text = extractMessage(obj, intent)

    let proposedChanges: ProposedChanges | undefined
    if (obj.proposedChanges && typeof obj.proposedChanges === "object") {
      const pc = obj.proposedChanges as Record<string, unknown>
      proposedChanges = {
        action: (pc.action as "add" | "update" | "remove") || "update",
        summary: (pc.summary as string) || "Blueprint update",
        sections: (pc.sections as string[]) || [],
        changes: (pc.changes as Record<string, unknown>) || {},
      }
    }

    return { text, intent, proposedChanges }
  }

  const contentStr = String(content)
  if (isRawJson(contentStr)) {
    return { text: "Let me know what you'd like to explore!", intent: "discussion" }
  }
  return { text: contentStr, intent: "discussion" }
}

/**
 * Parse streamed content to extract message field
 */
function parseStreamedContent(raw: string): string {
  if (!raw) return ""

  try {
    const parsed = JSON.parse(raw)
    if (parsed.message && typeof parsed.message === "string") {
      return parsed.message
    }
  } catch {
    // Not complete JSON yet
  }

  const patterns = [
    /"message"\s*:\s*"((?:[^"\\]|\\.)*)"/,
    /"message"\s*:\s*"((?:[^"\\]|\\.)*)/,
  ]

  for (const pattern of patterns) {
    const match = raw.match(pattern)
    if (match && match[1]) {
      return match[1]
        .replace(/\\"/g, '"')
        .replace(/\\n/g, "\n")
        .replace(/\\t/g, "\t")
        .replace(/\\r/g, "\r")
    }
  }

  if (raw.includes('"message"') && raw.includes('":"')) {
    return ""
  }

  if (raw.trim().startsWith("{")) {
    return ""
  }

  return raw
}

// =============================================================================
// Thinking Messages
// =============================================================================

// =============================================================================
// Streaming Message Component
// =============================================================================

interface StreamingMessageProps {
  rawContent: string
  isStreaming: boolean
}

/**
 * Renders the streaming AI response with smooth word-by-word animation
 */
function StreamingMessage({ rawContent, isStreaming }: StreamingMessageProps) {
  const parsedContent = parseStreamedContent(rawContent)
  
  const { displayedText, isTyping } = useStreamingText(parsedContent, {
    isStreaming,
    charDelay: 15,
    minDelay: 8,
    maxDelay: 35,
    punctuationPause: 80
  })

  return (
    <div className="flex flex-col gap-3 w-full max-w-2xl animate-slide-in-left">
      {/* Flowro AI label */}
      <span className="text-sm font-semibold text-slate-400">Flowro AI</span>

      {/* Message bubble with dark mode styling */}
      <div className="ai-message-bubble-dark rounded-xl p-4">
        <p className="whitespace-pre-wrap leading-relaxed text-slate-200">
          {displayedText && (
            <span className="streaming-text">{displayedText}</span>
          )}
          {/* Typing cursor - only show when actively typing */}
          {(isTyping || (isStreaming && !displayedText)) && (
            <span className="typing-cursor inline-block w-0.5 h-[1.1em] bg-gradient-to-b from-cyan-500 to-violet-500 ml-0.5 align-middle" />
          )}
        </p>
      </div>
    </div>
  )
}

// =============================================================================
// Component
// =============================================================================

export default function MessageList({
  messages,
  isStreaming,
  streamedContent,
  isGenerating,
  thinkingPhase,
  generationMode,
  onOpenBlueprint,
  onApplyProposedChanges,
  messagesEndRef,
}: MessageListProps) {
  return (
    <main className="flex-1 overflow-y-auto p-4 md:px-8 lg:px-12 scroll-smooth pb-40 bg-[#0a0d12]">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        {messages.map((msg, index) => {
          const isUser = msg.role === "user"
          const displayInfo = isUser
            ? ({ text: msg.content, intent: "discussion" } as DisplayInfo)
            : getDisplayMessage(msg.content, msg.intent, msg.proposedChanges)

          if (isUser) {
            return (
              <div key={index} className="flex flex-col items-end gap-2">
                <div className="user-message-gradient text-white p-4 rounded-2xl rounded-tr-none shadow-lg max-w-xl text-left leading-relaxed">
                  {/* Context Block for User Context Messages */}
                  {msg.proposedChanges && (
                    <div className="mb-2 p-2.5 bg-white/10 backdrop-blur-md border border-white/10 rounded-xl text-xs flex items-center gap-3">
                      <div className="flex size-6 items-center justify-center rounded-lg bg-blue-500/20 border border-blue-500/30 shadow-sm">
                        <span className="material-symbols-outlined text-blue-400 text-[14px]">auto_fix</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-blue-300 font-bold uppercase tracking-[0.05em] text-[9px] leading-tight">
                          AI Enhancement
                        </span>
                        <span className="text-white/90 font-medium">
                          Applied to {msg.proposedChanges.sections[0]}
                        </span>
                      </div>
                    </div>
                  )}
                  <p className="whitespace-pre-wrap">{displayInfo.text}</p>
                </div>
              </div>
            )
          }

          return (
            <div key={index} className="flex flex-col gap-3 w-full max-w-2xl">
              {/* Flowro AI label */}
              <span className="text-sm font-semibold text-slate-400">Flowro AI</span>

                {/* AI message bubble with dark mode styling */}
                <div className="ai-message-bubble-dark rounded-xl p-4">
                  <p className="whitespace-pre-wrap leading-relaxed text-slate-200 mb-2">{displayInfo.text}</p>

                  {/* Proposal preview */}
                  {displayInfo.intent === "proposal" && displayInfo.proposedChanges && (
                    <div className="mt-3 p-3 bg-white/5 border border-white/10 rounded-lg">
                      <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                        <span className="material-symbols-outlined text-[14px]">edit_note</span>
                        Proposed Changes
                      </div>
                      <p className="text-sm text-slate-200 font-medium">{displayInfo.proposedChanges.summary}</p>
                      {displayInfo.proposedChanges.sections.length > 0 && (
                        <p className="text-xs text-slate-500 mt-1">
                          Sections: {displayInfo.proposedChanges.sections.join(", ")}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Context-aware buttons based on intent */}
                  {!isUser && displayInfo.intent === "initial" && (
                    <button
                      onClick={onOpenBlueprint}
                      className="mt-3 flex items-center gap-2 bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 font-medium py-2 px-3 rounded-lg transition-colors text-sm"
                    >
                      <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                      Open Blueprint
                    </button>
                  )}

                  {displayInfo.intent === "proposal" && displayInfo.proposedChanges && (
                    <button
                      onClick={() => onApplyProposedChanges(displayInfo.proposedChanges!, index)}
                      className="mt-3 flex items-center gap-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-medium py-2 px-3 rounded-lg transition-colors text-sm"
                    >
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      Update Blueprint
                    </button>
                  )}
                </div>
            </div>
          )
        })}

        {/* Chat mode: streaming text word-by-word */}
        {isGenerating && generationMode === 'chat' && (
          <StreamingMessage rawContent={streamedContent} isStreaming={isStreaming} />
        )}

        {/* Blueprint progress indicator - shows throughout entire generation */}
        {isGenerating && (generationMode === 'initial' || generationMode === 'update') && (
          <div className="flex flex-col gap-3 w-full max-w-2xl animate-slide-in-left">
            {/* Flowro AI label */}
            <span className="text-sm font-semibold text-slate-400">Flowro AI</span>

            {/* Progress card */}
            <div className="ai-message-bubble-dark rounded-xl p-4">
              <div className="flex flex-col gap-3">
                {/* Blueprint sections progress */}
                <div className="flex flex-col gap-2.5">
                  <div className={`flex items-center gap-2.5 transition-all duration-500 ${thinkingPhase >= 0 ? 'opacity-100' : 'opacity-40'}`}>
                    <div className="relative flex size-2.5 items-center justify-center">
                      {thinkingPhase === 0 && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>}
                      <span className={`relative inline-flex size-2 rounded-full ${thinkingPhase >= 0 ? 'bg-cyan-500' : 'bg-slate-600'}`}></span>
                    </div>
                    <span className="text-xs font-medium text-slate-300">Product Vision</span>
                  </div>
                  
                  <div className={`flex items-center gap-2.5 transition-all duration-500 ${thinkingPhase >= 1 ? 'opacity-100' : 'opacity-40'}`}>
                    <div className="relative flex size-2.5 items-center justify-center">
                      {thinkingPhase === 1 && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>}
                      <span className={`relative inline-flex size-2 rounded-full ${thinkingPhase >= 1 ? 'bg-cyan-500' : 'bg-slate-600'}`}></span>
                    </div>
                    <span className="text-xs font-medium text-slate-300">Actors & Entities</span>
                  </div>
                  
                  <div className={`flex items-center gap-2.5 transition-all duration-500 ${thinkingPhase >= 2 ? 'opacity-100' : 'opacity-40'}`}>
                    <div className="relative flex size-2.5 items-center justify-center">
                      {thinkingPhase === 2 && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>}
                      <span className={`relative inline-flex size-2 rounded-full ${thinkingPhase >= 2 ? 'bg-cyan-500' : 'bg-slate-600'}`}></span>
                    </div>
                    <span className="text-xs font-medium text-slate-300">Behaviors</span>
                  </div>
                  
                  <div className={`flex items-center gap-2.5 transition-all duration-500 ${thinkingPhase >= 3 ? 'opacity-100' : 'opacity-40'}`}>
                    <div className="relative flex size-2.5 items-center justify-center">
                      {thinkingPhase === 3 && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>}
                      <span className={`relative inline-flex size-2 rounded-full ${thinkingPhase >= 3 ? 'bg-cyan-500' : 'bg-slate-600'}`}></span>
                    </div>
                    <span className="text-xs font-medium text-slate-300">Constraints & Risks</span>
                  </div>
                  
                  <div className={`flex items-center gap-2.5 transition-all duration-500 ${thinkingPhase >= 4 ? 'opacity-100' : 'opacity-40'}`}>
                    <div className="relative flex size-2.5 items-center justify-center">
                      {thinkingPhase === 4 && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>}
                      <span className={`relative inline-flex size-2 rounded-full ${thinkingPhase >= 4 ? 'bg-cyan-500' : 'bg-slate-600'}`}></span>
                    </div>
                    <span className="text-xs font-medium text-slate-300">TechStack & Integrations</span>
                  </div>
                </div>

                {/* Typing dots */}
                <div className="flex gap-1 pt-1">
                  <span className="size-1.5 rounded-full bg-slate-500 typing-dot"></span>
                  <span className="size-1.5 rounded-full bg-slate-500 typing-dot"></span>
                  <span className="size-1.5 rounded-full bg-slate-500 typing-dot"></span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </main>
  )
}

// =============================================================================
// Welcome Screen Component
// =============================================================================

interface WelcomeScreenProps {
  onQuickAction: (message: string) => void
}

export function WelcomeScreen({ onQuickAction }: WelcomeScreenProps) {
  return (
    <main className="flex-1 overflow-y-auto p-3 sm:p-6">
      <div className="mx-auto max-w-4xl flex flex-col gap-3 sm:gap-4">
        <div className="flex flex-col items-center justify-center py-8 sm:py-16 text-center px-2">
          {/* Animated AI Avatar */}
          <div className="relative mb-4 sm:mb-6">
            <div className="flex size-16 sm:size-20 items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-500 shadow-xl shadow-violet-500/20">
              <img src="/logo.png" alt="Flowro" className="w-10 h-10 sm:w-12 sm:h-12 brightness-0 invert" />
            </div>
          </div>

          {/* Welcome Text */}
          <h2 className="text-xl sm:text-3xl font-bold text-slate-100 mb-2 sm:mb-3">
            Hello, Product Manager
          </h2>
          <p className="text-slate-400 max-w-lg mb-6 sm:mb-8 text-sm sm:text-lg px-2">
            I&apos;m Flowro, your AI partner. Ready to bring your product vision to life? Choose an
            action below or describe your idea.
          </p>

          {/* Quick Action Chips */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap justify-center gap-2 sm:gap-3 max-w-2xl w-full px-2 sm:px-0">
            {[
              { icon: 'description', text: 'Draft a PRD', query: "I want to create a PRD for a new product idea" },
              { icon: 'lightbulb', text: 'Brainstorm', query: "Help me brainstorm features for my product" },
              { icon: 'timeline', text: 'Roadmap', query: "I need help creating a product roadmap" },
              { icon: 'analytics', text: 'Research', query: "Analyze competitors in my market" }
            ].map((action, i) => (
              <button
                key={i}
                onClick={() => onQuickAction(action.query)}
                className="group flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 text-slate-300 shadow-sm hover:border-violet-500/50 hover:text-violet-300 hover:bg-violet-500/10 hover:shadow-lg hover:shadow-violet-500/10 transition-all text-xs sm:text-sm font-medium"
              >
                <span className="material-symbols-outlined text-slate-400 group-hover:text-violet-400 transition-colors text-base sm:text-lg">
                  {action.icon}
                </span>
                {action.text}
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
