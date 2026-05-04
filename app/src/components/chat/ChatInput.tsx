"use client";

import { getClarificationOptions, isOtherOption } from "@/lib/clarificationFlow";
import type { ChatInputProps } from "./types";

export default function ChatInput({
  message,
  onMessageChange,
  onSend,
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

  const defaultPlaceholder = selectionContext
    ? "Describe how to change this..."
    : placeholder || "Describe your product idea...";

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
    <div className="sticky bottom-0 border-t border-white/[0.07] bg-[#111216]/88 px-4 pt-4 pb-8 backdrop-blur-2xl">
      <div className="mx-auto max-w-3xl">
        {selectionContext ? (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-[#2f8fff]/25 bg-[#2f8fff]/10 px-3 py-2 text-sm text-[#8fc5ff]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">auto_fix</span>
              <span className="font-medium">Editing: {selectionContext.section}</span>
            </div>
            <button onClick={onClearContext} className="rounded-full p-1 text-[#8fc5ff] transition hover:bg-white/[0.06]">
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        ) : null}

        <form
          onSubmit={handleSubmit}
          className="rounded-[1.35rem] border border-white/[0.08] bg-[#17191f]/95 px-3 py-2 shadow-[0_26px_60px_-42px_rgba(0,0,0,0.95)] transition focus-within:border-[#2f8fff]/45 focus-within:ring-4 focus-within:ring-[#2f8fff]/10"
        >
          {hasClarificationFlow ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-white/[0.08] bg-[#0c0e13] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Waiting for answers</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Collecting one setup round before generating the project plan.
                </p>
              </div>

              {clarificationSummaries?.length ? (
                <div className="space-y-2">
                  {clarificationSummaries.map((summary, index) => (
                    <div key={summary.questionId} className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.045] px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300/70">
                            Answered {index + 1}
                          </p>
                          <p className="mt-1 text-sm font-medium leading-6 text-slate-100">{summary.prompt}</p>
                        </div>
                        <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
                          Done
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-400">{summary.answerText}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              {activeClarificationQuestion ? (
                <div className="rounded-xl border border-[#2f8fff]/22 bg-[#2f8fff]/[0.055] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8fc5ff]">Current question</p>
                      <p className="mt-2 text-base font-semibold leading-7 text-slate-100">{activeClarificationQuestion.prompt}</p>
                    </div>
                    <span className="rounded-full border border-white/[0.08] bg-[#0b0d12] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
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
                              ? "border-[#2f8fff]/55 bg-[#2f8fff]/12 text-white"
                               : "border-white/[0.08] bg-[#111318] text-slate-300 hover:border-[#2f8fff]/35 hover:bg-[#151d2a]"
                          } ${isGenerating ? "cursor-not-allowed opacity-70" : ""}`}
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] ${
                                isSelected
                                  ? "border-[#2f8fff] bg-[#2f8fff] text-white dark:border-[#5B8DEF] dark:bg-[#5B8DEF]"
                                  : "border-white/[0.14] text-transparent"
                              }`}
                            >
                              {activeClarificationQuestion.selectionMode === "single" ? "●" : "✓"}
                            </span>
                            <div>
                              <p className="text-sm font-medium">{option.label}</p>
                              {option.description ? (
                                <p className="mt-1 text-xs leading-5 text-slate-500">{option.description}</p>
                              ) : null}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {showOtherInput ? (
                    <div className="mt-4 rounded-xl border border-white/[0.08] bg-[#0b0d12] p-3">
                      <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Tell Flowro what to do instead
                      </label>
                      <textarea
                        value={activeAnswer?.customText || ""}
                        onChange={(event) => onClarificationCustomTextChange?.(activeClarificationQuestion.id, event.target.value)}
                        rows={3}
                        placeholder="Type your custom answer..."
                        disabled={isGenerating}
                        className="mt-3 w-full resize-none rounded-xl border border-white/[0.08] bg-[#151820] px-3 py-3 text-sm leading-6 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-[#2f8fff]/50 focus:ring-4 focus:ring-[#2f8fff]/10"
                      />
                    </div>
                  ) : null}

                  {activeClarificationQuestion.selectionMode === "multiple" || showOtherInput ? (
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        {canContinueClarificationStep ? "Answer ready" : "Complete this answer to continue"}
                      </span>
                      <button
                        type="button"
                        onClick={() => onClarificationContinue?.()}
                        disabled={!canContinueClarificationStep || isGenerating}
                        className="send-button-gradient inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
                      >
                        Continue
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.055] p-4">
                  <p className="text-sm font-medium text-slate-100">All questions are answered.</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Submit the selected answers so Flowro can generate the project plan.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between gap-3 pt-1">
                <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  {isClarificationReady ? "Ready to submit all answers" : "Flowro is waiting for the next answer"}
                </span>
                <button
                  type="submit"
                  disabled={!isClarificationReady || isGenerating}
                  className="send-button-gradient inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
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
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  disabled={isGenerating}
                  title="Attach (coming soon)"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-white/[0.06] hover:text-slate-200 disabled:opacity-40"
                >
                  <span className="material-symbols-outlined text-[20px]">add</span>
                </button>

                <textarea
                  value={message}
                  onChange={(event) => onMessageChange(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={defaultPlaceholder}
                  rows={1}
                  className="max-h-28 min-h-[40px] w-full resize-none border-0 bg-transparent py-2 text-sm leading-6 text-slate-100 placeholder:text-slate-600 focus:ring-0"
                  disabled={isGenerating}
                />

                <button
                  type="button"
                  disabled={isGenerating}
                  title="Voice (coming soon)"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-white/[0.06] hover:text-slate-200 disabled:opacity-40"
                >
                  <span className="material-symbols-outlined text-[20px]">mic</span>
                </button>

                <button
                  type="submit"
                  disabled={!message.trim() || isGenerating}
                  className="send-button-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-[0_14px_28px_-18px_rgba(47,143,255,0.95)] disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500 disabled:shadow-none"
                  title="Send"
                >
                  {isGenerating ? (
                    <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                  ) : (
                    <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                  )}
                </button>
              </div>

              <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-slate-600">
                <span className="font-medium text-slate-500">Flowro AI</span>
                <span>⏎ to send · ⇧⏎ for newline</span>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
