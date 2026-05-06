"use client";

import { useEffect, useRef, useState } from "react";
import { getClarificationOptions, isOtherOption } from "@/lib/clarificationFlow";
import type { ChatInputProps } from "./types";

export default function ChatInput({
  message,
  onMessageChange,
  onSend,
  actionMode = "build",
  onActionModeChange,
  isGenerating,
  selectionContext,
  onClearContext,
  placeholder,
  clarificationSummaries,
  activeClarificationQuestion,
  clarificationAnswers,
  onClarificationToggle,
  onClarificationCustomTextChange,
  onClarificationContinue,
  canContinueClarificationStep,
  isClarificationReady,
}: ChatInputProps) {
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActionMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setIsActionMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isActionMenuOpen]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSend(event as unknown as React.FormEvent);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isGenerating) return;
    onSend(event);
  };

  const handleActionModeSelect = (mode: "build" | "plan") => {
    onActionModeChange?.(mode);
    setIsActionMenuOpen(false);
  };

  const defaultPlaceholder = selectionContext
    ? "Describe how to change this..."
    : placeholder ? placeholder.replace("Ask Flowro to refine the project plan...", "Ask Flowro...").replace("Describe your product idea...", "Ask Flowro...") : "Ask Flowro...";

  const hasClarificationFlow = Boolean(activeClarificationQuestion || clarificationSummaries?.length);
  const activeAnswer = activeClarificationQuestion
    ? clarificationAnswers?.[activeClarificationQuestion.id]
    : undefined;
  const activeOptions = activeClarificationQuestion ? getClarificationOptions(activeClarificationQuestion) : [];
  const selectedOtherId = activeClarificationQuestion
    ? activeAnswer?.selectedOptionIds.find((optionId) => isOtherOption(activeClarificationQuestion, optionId))
    : undefined;
  const showOtherInput = Boolean(activeClarificationQuestion && selectedOtherId);

  return (
    <div className="sticky bottom-0 bg-gradient-to-t from-[#191919] via-[#191919]/96 to-[#191919]/72 px-3 pb-4 pt-3 backdrop-blur-2xl">
      <div className="mx-auto max-w-[46rem]">
        {selectionContext ? (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-[0.9rem] border border-[#4169ff]/35 bg-[#4169ff]/12 px-3 py-2 text-sm text-[#afbdff]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">auto_fix</span>
              <span className="font-medium">Editing: {selectionContext.section}</span>
            </div>
            <button type="button" onClick={onClearContext} className="rounded-full p-1 text-[#afbdff] transition hover:bg-white/[0.06]">
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        ) : null}

        <form
          onSubmit={handleSubmit}
          className="rounded-[1.45rem] border border-white/[0.12] bg-[#252623]/96 p-4 shadow-[0_28px_70px_-42px_rgba(0,0,0,0.98)] transition focus-within:border-white/[0.2] focus-within:ring-2 focus-within:ring-[#4169ff]/45"
        >
          {hasClarificationFlow ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-white/[0.08] bg-[#1c1d1a] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8f8f8b]">Waiting for answers</p>
                <p className="mt-2 text-sm leading-6 text-[#b8b8b5]">
                  Collecting one setup round before generating the project plan.
                </p>
              </div>

              {clarificationSummaries?.length ? (
                <div className="space-y-2">
                  {clarificationSummaries.map((summary, index) => (
                    <div key={summary.questionId} className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.055] px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300/70">
                            Answered {index + 1}
                          </p>
                          <p className="mt-1 text-sm font-medium leading-6 text-[#f0f0ed]">{summary.prompt}</p>
                        </div>
                        <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
                          Done
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[#b8b8b5]">{summary.answerText}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              {activeClarificationQuestion ? (
                <div className="rounded-xl border border-[#4169ff]/35 bg-[#4169ff]/[0.08] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#afbdff]">Current question</p>
                      <p className="mt-2 text-base font-semibold leading-7 text-[#f0f0ed]">{activeClarificationQuestion.prompt}</p>
                    </div>
                    <span className="rounded-full border border-white/[0.08] bg-[#1c1d1a] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#b8b8b5]">
                      {activeClarificationQuestion.selectionMode === "single" ? "Select one answer" : "Select one or more"}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-2">
                    {activeOptions.map((option) => {
                      const isSelected = activeAnswer?.selectedOptionIds.includes(option.id) ?? false;

                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => onClarificationToggle?.(activeClarificationQuestion, option.id)}
                          disabled={isGenerating}
                          className={`rounded-xl border px-3 py-3 text-left transition ${
                            isSelected
                              ? "border-[#4169ff]/70 bg-[#4169ff]/16 text-white"
                               : "border-white/[0.08] bg-[#20201f] text-[#d8d8d5] hover:border-white/[0.16] hover:bg-[#2c2c2a]"
                          } ${isGenerating ? "cursor-not-allowed opacity-70" : ""}`}
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] ${
                                isSelected
                                  ? "border-[#4169ff] bg-[#4169ff] text-white"
                                  : "border-white/[0.14] text-transparent"
                              }`}
                            >
                              {activeClarificationQuestion.selectionMode === "single" ? "●" : "✓"}
                            </span>
                            <div>
                              <p className="text-sm font-medium">{option.label}</p>
                              {option.description ? (
                                <p className="mt-1 text-xs leading-5 text-[#9f9f9b]">{option.description}</p>
                              ) : null}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {showOtherInput ? (
                    <div className="mt-4 rounded-xl border border-white/[0.08] bg-[#1c1d1a] p-3">
                      <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8f8f8b]">
                        Tell Flowro what to do instead
                      </label>
                      <textarea
                        value={activeAnswer?.customText || ""}
                        onChange={(event) => onClarificationCustomTextChange?.(activeClarificationQuestion.id, event.target.value)}
                        rows={3}
                        placeholder="Type your custom answer..."
                        dir="auto"
                        disabled={isGenerating}
                        className="flowro-bidi-text mt-3 w-full resize-none rounded-xl border border-white/[0.08] bg-[#20201f] px-3 py-3 text-sm leading-6 text-[#f0f0ed] outline-none transition placeholder:text-[#777773] focus:border-[#4169ff]/60 focus:ring-4 focus:ring-[#4169ff]/12"
                      />
                    </div>
                  ) : null}

                  {activeClarificationQuestion.selectionMode === "multiple" || showOtherInput ? (
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <span className="text-[11px] uppercase tracking-[0.18em] text-[#8f8f8b]">
                        {canContinueClarificationStep ? "Answer ready" : "Complete this answer to continue"}
                      </span>
                      <button
                        type="button"
                        onClick={() => onClarificationContinue?.()}
                        disabled={!canContinueClarificationStep || isGenerating}
                        className="send-button-gradient inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-[#3a3a38] disabled:text-[#777773]"
                      >
                        Continue
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.055] p-4">
                  <p className="text-sm font-medium text-[#f0f0ed]">All questions are answered.</p>
                  <p className="mt-2 text-sm leading-6 text-[#b8b8b5]">
                    Submit the selected answers so Flowro can generate the project plan.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between gap-3 pt-1">
                <span className="text-[11px] uppercase tracking-[0.18em] text-[#8f8f8b]">
                  {isClarificationReady ? "Ready to submit all answers" : "Flowro is waiting for the next answer"}
                </span>
                <button
                  type="submit"
                  disabled={!isClarificationReady || isGenerating}
                  className="send-button-gradient inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-[#3a3a38] disabled:text-[#777773]"
                >
                  {isGenerating ? (
                    <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                  ) : (
                    "Submit Answers"
                  )}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="min-h-[72px]">
                <textarea
                  value={message}
                  onChange={(event) => onMessageChange(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={defaultPlaceholder}
                  rows={2}
                  aria-label="Ask Flowro"
                  dir="auto"
                  className="flowro-bidi-text max-h-32 min-h-[62px] w-full resize-none border-0 bg-transparent text-[17px] leading-7 text-[#f0f0ed] outline-none placeholder:text-[#b0b0ad] focus:ring-0"
                  disabled={isGenerating}
                />
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  disabled={isGenerating}
                  title="Attach (coming soon)"
                  aria-label="Attach"
                  className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-[#30312e] text-[#d8d8d5] transition hover:bg-[#3a3b38] hover:text-white disabled:opacity-40"
                >
                  <span className="material-symbols-outlined text-[20px]">add</span>
                </button>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                <div className="relative hidden sm:block" ref={actionMenuRef}>
                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={() => setIsActionMenuOpen((current) => !current)}
                    aria-haspopup="menu"
                    aria-expanded={isActionMenuOpen}
                    className="inline-flex min-h-10 items-center gap-1 rounded-full px-3 text-sm font-medium text-[#d8d8d5] transition hover:bg-white/[0.06] disabled:opacity-40"
                  >
                    {actionMode === "build" ? "Build" : "Plan"}
                    <span className={`material-symbols-outlined text-[17px] transition ${isActionMenuOpen ? "rotate-180" : ""}`}>keyboard_arrow_down</span>
                  </button>
                  {isActionMenuOpen ? (
                    <div className="absolute bottom-[calc(100%+0.5rem)] right-0 z-50 w-64 overflow-hidden rounded-[0.9rem] border border-white/[0.09] bg-[#242423] p-2 shadow-[0_24px_58px_-30px_rgba(0,0,0,0.95)]" role="menu">
                      <button
                        type="button"
                        onClick={() => handleActionModeSelect("build")}
                        className={`flex w-full items-start gap-3 rounded-[0.7rem] px-3 py-2.5 text-left transition ${
                          actionMode === "build" ? "bg-[#4169ff]/14 text-[#dce4ff]" : "text-[#e4e4e1] hover:bg-white/[0.055]"
                        }`}
                        role="menuitem"
                      >
                        <span className="material-symbols-outlined mt-0.5 text-[18px]">bolt</span>
                        <span>
                          <span className="block text-sm font-semibold">Build</span>
                          <span className="mt-0.5 block text-xs leading-5 text-[#a8a8a5]">Make the change directly.</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleActionModeSelect("plan")}
                        className={`mt-1 flex w-full items-start gap-3 rounded-[0.7rem] px-3 py-2.5 text-left transition ${
                          actionMode === "plan" ? "bg-[#4169ff]/14 text-[#dce4ff]" : "text-[#e4e4e1] hover:bg-white/[0.055]"
                        }`}
                        role="menuitem"
                      >
                        <span className="material-symbols-outlined mt-0.5 text-[18px]">route</span>
                        <span>
                          <span className="block text-sm font-semibold">Plan</span>
                          <span className="mt-0.5 block text-xs leading-5 text-[#a8a8a5]">Discuss before making changes.</span>
                        </span>
                      </button>
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  disabled={isGenerating}
                  title="Voice (coming soon)"
                  aria-label="Voice"
                  className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-[#30312e] text-[#d8d8d5] transition hover:bg-[#3a3b38] hover:text-white disabled:opacity-40"
                >
                  <span className="material-symbols-outlined text-[20px]">mic</span>
                </button>

                <button
                  type="submit"
                  disabled={!message.trim() || isGenerating}
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#a7a7a3] text-[#252623] shadow-[0_14px_28px_-18px_rgba(255,255,255,0.65)] transition hover:bg-[#f0f0ed] disabled:cursor-not-allowed disabled:bg-[#595956] disabled:text-[#8f8f8b] disabled:shadow-none"
                  title="Send"
                >
                  {isGenerating ? (
                    <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                  ) : (
                    <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                  )}
                </button>
                </div>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
