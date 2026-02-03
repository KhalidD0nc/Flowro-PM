/**
 * MessageList Component
 * 
 * Displays chat messages with:
 * - User and assistant message bubbles
 * - Streaming response animation
 * - Thinking indicator with phases
 * - Proposal and blueprint action buttons
 * - Welcome screen with quick actions
 * 
 * @see /Docs/Architecture-Simplification-Plan.md Phase 4.3
 */

"use client"

import type { MessageListProps, ChatMessage, Intent, DisplayInfo, ProposedChanges } from "./types"
import { isUBPContent } from "./types"

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

const thinkingMessages = ["Thinking...", "Working on it...", "Almost there..."]

// =============================================================================
// Component
// =============================================================================

export default function MessageList({
  messages,
  isStreaming,
  streamedContent,
  isGenerating,
  thinkingPhase,
  onOpenBlueprint,
  onApplyProposedChanges,
  messagesEndRef,
}: MessageListProps) {
  return (
    <main className="flex-1 overflow-y-auto p-3 sm:p-6">
      <div className="mx-auto max-w-4xl flex flex-col gap-3 sm:gap-4">
        {messages.map((msg, index) => {
          const isUser = msg.role === "user"
          const displayInfo = isUser
            ? ({ text: msg.content, intent: "discussion" } as DisplayInfo)
            : getDisplayMessage(msg.content, msg.intent, msg.proposedChanges)

          return (
            <div key={index} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[90%] sm:max-w-[75%] rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 ${
                  isUser
                    ? "bg-[#137fec] text-white"
                    : "bg-[#18212b] border border-[#283039] text-white"
                }`}
              >
                {/* Context Block for User Context Messages */}
                {isUser && msg.proposedChanges && (
                  <div className="mb-2 p-2.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl text-xs flex items-center gap-3">
                    <div className="flex size-6 items-center justify-center rounded-lg bg-[#137fec]/20 border border-[#137fec]/30 shadow-sm">
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="text-[#137fec]"
                      >
                        <path
                          d="M12 3V4M12 20V21M4 12H3M21 12H20M18.364 5.636L17.6569 6.34315M6.34315 17.6569L5.63604 18.364M18.364 18.364L17.6569 17.6569M6.34315 6.34315L5.63604 5.636M12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8Z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[#137fec]/80 font-bold uppercase tracking-[0.05em] text-[9px] leading-tight">
                        AI Enhancement
                      </span>
                      <span className="text-white/90 font-medium">
                        Applied to {msg.proposedChanges.sections[0]}
                      </span>
                    </div>
                  </div>
                )}

                <p className="whitespace-pre-wrap leading-relaxed">{displayInfo.text}</p>

                {/* Proposal preview */}
                {displayInfo.intent === "proposal" && displayInfo.proposedChanges && (
                  <div className="mt-3 p-3 bg-[#0d141c] border border-[#283039] rounded-lg">
                    <div className="flex items-center gap-2 text-[#9dabb9] text-sm mb-2">
                      <span className="material-symbols-outlined text-[14px]">edit_note</span>
                      Proposed Changes
                    </div>
                    <p className="text-sm text-white">{displayInfo.proposedChanges.summary}</p>
                    {displayInfo.proposedChanges.sections.length > 0 && (
                      <p className="text-xs text-[#9dabb9] mt-1">
                        Sections: {displayInfo.proposedChanges.sections.join(", ")}
                      </p>
                    )}
                  </div>
                )}

                {/* Context-aware buttons based on intent */}
                {!isUser && displayInfo.intent === "initial" && (
                  <button
                    onClick={onOpenBlueprint}
                    className="mt-3 flex items-center gap-2 bg-[#137fec]/20 hover:bg-[#137fec]/30 text-[#137fec] font-medium py-2 px-3 rounded-lg transition-colors text-sm"
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

        {/* Streaming response in progress */}
        {isStreaming && (
          <div className="flex justify-start animate-slide-in-left">
            <div className="max-w-[90%] sm:max-w-[75%] rounded-xl sm:rounded-2xl rounded-tl-sm px-4 py-3 glass-message text-white shadow-lg">
              <div className="flex items-start gap-3">
                <div className="flex size-6 sm:size-7 items-center justify-center rounded-lg bg-[#137fec]/20 border border-[#137fec]/30 shrink-0 mt-0.5">
                  <div className="w-1.5 h-1.5 bg-[#137fec] rounded-full animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[#137fec] text-[10px] font-bold uppercase tracking-wider">
                      Flowro AI
                    </span>
                    <span className="text-[#9dabb9] text-[10px] animate-pulse">Generating...</span>
                  </div>
                  <p className="whitespace-pre-wrap leading-relaxed text-sm sm:text-base text-white/90 font-light">
                    {parseStreamedContent(streamedContent) && (
                      <span className="mr-0.5">{parseStreamedContent(streamedContent)}</span>
                    )}
                    <span className="inline-block w-1.5 h-4 bg-[#137fec] animate-pulse align-middle ml-0.5" />
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Thinking indicator */}
        {isGenerating && !streamedContent && (
          <div className="flex justify-start animate-slide-in-left">
            <div className="bg-[#18212b]/80 border border-[#283039] rounded-2xl rounded-tl-sm px-4 py-3 shadow-lg backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-[#137fec] rounded-full typing-dot" />
                  <div className="w-1.5 h-1.5 bg-[#137fec] rounded-full typing-dot" />
                  <div className="w-1.5 h-1.5 bg-[#137fec] rounded-full typing-dot" />
                </div>
                <span className="text-[#9dabb9] text-xs font-medium tracking-wide">
                  {thinkingMessages[thinkingPhase]}
                </span>
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
            <div className="flex size-16 sm:size-20 items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#137fec]/20 to-[#137fec]/5 ai-avatar-glow animate-subtle-pulse">
              <img src="/logo.png" alt="Flowro" className="w-10 h-10 sm:w-12 sm:h-12" />
            </div>
            <div className="absolute -bottom-1 -right-1 flex size-5 sm:size-6 items-center justify-center rounded-full bg-emerald-500 border-2 border-[#101922]">
              <span className="material-symbols-outlined text-white text-[10px] sm:text-xs">
                check
              </span>
            </div>
          </div>

          {/* Gradient Welcome Text */}
          <h2 className="text-xl sm:text-3xl font-bold gradient-text mb-2 sm:mb-3">
            Hello, Product Manager
          </h2>
          <p className="text-[#9dabb9] max-w-lg mb-6 sm:mb-8 text-sm sm:text-lg px-2">
            I&apos;m Flowro, your AI partner. Ready to bring your product vision to life? Choose an
            action below or describe your idea.
          </p>

          {/* Quick Action Chips */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap justify-center gap-2 sm:gap-3 max-w-2xl w-full px-2 sm:px-0">
            <button
              onClick={() => onQuickAction("I want to create a PRD for a new product idea")}
              className="action-chip flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-white text-xs sm:text-sm font-medium"
            >
              <span className="material-symbols-outlined text-[#137fec] text-base sm:text-lg">
                description
              </span>
              <span className="hidden xs:inline">Draft a </span>PRD
            </button>
            <button
              onClick={() => onQuickAction("Help me brainstorm features for my product")}
              className="action-chip flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-white text-xs sm:text-sm font-medium"
            >
              <span className="material-symbols-outlined text-[#137fec] text-base sm:text-lg">
                lightbulb
              </span>
              Brainstorm
            </button>
            <button
              onClick={() => onQuickAction("I need help creating a product roadmap")}
              className="action-chip flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-white text-xs sm:text-sm font-medium"
            >
              <span className="material-symbols-outlined text-[#137fec] text-base sm:text-lg">
                timeline
              </span>
              Roadmap
            </button>
            <button
              onClick={() => onQuickAction("Analyze competitors in my market")}
              className="action-chip flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-white text-xs sm:text-sm font-medium"
            >
              <span className="material-symbols-outlined text-[#137fec] text-base sm:text-lg">
                analytics
              </span>
              Research
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
