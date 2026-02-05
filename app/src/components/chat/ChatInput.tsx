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
    <div className="absolute bottom-0 z-10 w-full border-t border-white/10 bg-[#0a0d12] px-4 py-2.5">
      <div className="mx-auto max-w-3xl">
        {/* Context Block above input */}
        {selectionContext && (
          <div className="mb-2 p-1.5 bg-white/5 border border-white/10 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-slate-400 text-[16px]">auto_fix</span>
              <span className="text-xs font-medium text-slate-400">Editing: {selectionContext.section}</span>
            </div>
            <button onClick={onClearContext} className="text-slate-500 hover:text-slate-300">
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        )}

        <form onSubmit={onSend} className="relative flex items-center gap-2 rounded-lg bg-[#141a22] ring-1 ring-white/10 focus-within:ring-white/20 transition-all px-3 py-2">
          <textarea
            value={message}
            onChange={(e) => onMessageChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={defaultPlaceholder}
            rows={1}
            className="max-h-24 min-h-[36px] w-full resize-none border-0 bg-transparent py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:ring-0"
            disabled={isGenerating}
          />

          <button
            type="submit"
            disabled={!message.trim() || isGenerating}
            className="flex items-center justify-center rounded-md bg-white/10 p-1.5 text-slate-300 hover:bg-white/20 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            title="Send"
          >
            {isGenerating ? (
              <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
            ) : (
              <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
            )}
          </button>
        </form>
        <p className="mt-1.5 text-center text-[9px] text-slate-600 uppercase tracking-wider">Flowro AI • Verify critical specs</p>
      </div>
    </div>
  )
}
