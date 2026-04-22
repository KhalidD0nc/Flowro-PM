"use client";

import type { ChatInputProps } from "./types";

export default function ChatInput({
  message,
  onMessageChange,
  onSend,
  isGenerating,
  selectionContext,
  onClearContext,
  placeholder,
}: ChatInputProps) {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSend(event as unknown as React.FormEvent);
    }
  };

  const defaultPlaceholder = selectionContext
    ? "Describe how to change this..."
    : placeholder || "Describe your product idea...";

  return (
    <div className="sticky bottom-0 border-t border-[#e8e0d6] bg-[#fbf7f1]/92 px-4 py-4 backdrop-blur-xl">
      <div className="mx-auto max-w-3xl">
        {selectionContext ? (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-[1.25rem] border border-[#d8e7fb] bg-[#edf5ff] px-3 py-2 text-sm text-[#2f8fff]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">auto_fix</span>
              <span className="font-medium">Editing: {selectionContext.section}</span>
            </div>
            <button onClick={onClearContext} className="rounded-full p-1 text-[#2f8fff] transition hover:bg-white/70">
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        ) : null}

        <form
          onSubmit={onSend}
          className="rounded-[1.75rem] border border-[#dbe3ef] bg-white px-4 py-3 shadow-[0_24px_40px_-34px_rgba(25,37,62,0.3)] transition focus-within:border-[#bfd8ff] focus-within:ring-4 focus-within:ring-[#2f8fff]/10"
        >
          <div className="flex items-end gap-3">
            <textarea
              value={message}
              onChange={(event) => onMessageChange(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={defaultPlaceholder}
              rows={1}
              className="max-h-28 min-h-[48px] w-full resize-none border-0 bg-transparent py-2 text-sm leading-6 text-slate-900 placeholder:text-slate-400 focus:ring-0"
              disabled={isGenerating}
            />

            <button
              type="submit"
              disabled={!message.trim() || isGenerating}
              className="send-button-gradient flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
              title="Send"
            >
              {isGenerating ? (
                <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
              ) : (
                <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
              )}
            </button>
          </div>

          <div className="mt-2 flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.18em] text-slate-400">
            <span>Flowro AI</span>
            <span>Press Enter to send</span>
          </div>
        </form>
      </div>
    </div>
  );
}
