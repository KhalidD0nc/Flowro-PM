/**
 * ChatInput Component
 * 
 * Premium floating input for chat messages with:
 * - Floating card design with glass morphism
 * - Context block for AI enhancement mode
 * - Auto-expanding textarea
 * - Send button with gradient animation
 * 
 * @see /Docs/Architecture-Simplification-Plan.md Phase 4.4
 */

"use client"

import type { ChatInputProps } from "./types"

export default function ChatInput({
  message,
  onMessageChange,
  onSend,
  isGenerating,
  selectionContext,
  onClearContext,
  placeholder,
}: ChatInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      onSend(e as unknown as React.FormEvent)
    }
  }

  const defaultPlaceholder = selectionContext
    ? "Describe how to change this..."
    : placeholder || "Describe your product idea..."

  return (
    <footer className="relative px-2 sm:px-4 pb-3 sm:pb-4 pb-safe pt-2 shrink-0">
      {/* Top gradient fade */}
      <div className="absolute -top-8 left-0 right-0 h-8 bg-gradient-to-t from-[#101922] to-transparent pointer-events-none" />

      <form onSubmit={onSend} className="mx-auto max-w-4xl">
        {/* Context Block above input */}
        {selectionContext && (
          <div className="mb-2 sm:mb-3 mx-0.5 sm:mx-1 p-2 sm:p-3 bg-gradient-to-r from-[#137fec]/10 to-transparent border border-[#137fec]/20 rounded-xl sm:rounded-2xl animate-in slide-in-from-bottom-2 fade-in duration-300 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="flex size-7 sm:size-8 items-center justify-center rounded-lg sm:rounded-xl bg-[#137fec]/20 border border-[#137fec]/30 shadow-lg shrink-0">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-[#137fec] sm:w-[18px] sm:h-[18px]"
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
                <div className="flex flex-col min-w-0">
                  <span className="text-[#137fec] font-bold text-[9px] sm:text-[10px] uppercase tracking-[0.15em] leading-none mb-0.5 sm:mb-1">
                    Enhancement Mode
                  </span>
                  <span className="text-white font-medium text-xs sm:text-sm truncate">
                    Target: {selectionContext.section}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={onClearContext}
                className="flex size-7 sm:size-8 items-center justify-center rounded-lg text-[#9dabb9] hover:text-white hover:bg-white/10 transition-all active:scale-90 shrink-0"
                title="Cancel"
              >
                <span className="material-symbols-outlined text-lg sm:text-xl">
                  close
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Floating card container */}
        <div className="relative rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#18212b] via-[#1a252f] to-[#18212b] border border-[#283039]/50 shadow-2xl shadow-black/30 p-1 sm:p-1.5">
          {/* Inner glow border */}
          <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#137fec]/0 via-[#137fec]/5 to-[#137fec]/0 pointer-events-none" />

          <div className="relative flex items-end gap-1 sm:gap-2">
            <div className="flex-1 relative">
              <textarea
                value={message}
                onChange={(e) => onMessageChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={defaultPlaceholder}
                rows={1}
                className="w-full rounded-lg sm:rounded-xl bg-transparent px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-white placeholder-[#9dabb9]/50 focus:outline-none resize-none min-h-[44px] sm:min-h-[48px] max-h-[200px]"
                disabled={isGenerating}
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1 sm:gap-1.5 pb-1 sm:pb-1.5 pr-0.5 sm:pr-1">
              {/* Attachment button - hidden on very small screens */}
              <button
                type="button"
                className="hidden sm:flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl text-[#9dabb9] hover:text-white hover:bg-white/5 transition-all"
                title="Attach file"
              >
                <span className="material-symbols-outlined text-lg sm:text-xl">
                  attach_file
                </span>
              </button>

              {/* Send button */}
              <button
                type="submit"
                disabled={!message.trim() || isGenerating}
                className="send-button-gradient flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl text-white disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none disabled:bg-[#283039]"
              >
                <span className="material-symbols-outlined text-lg sm:text-xl">
                  send
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Helper text - hidden on mobile */}
        <p className="hidden sm:block text-center text-xs text-[#9dabb9]/50 mt-2">
          Press Enter to send • Shift + Enter for new line
        </p>
      </form>
    </footer>
  )
}
