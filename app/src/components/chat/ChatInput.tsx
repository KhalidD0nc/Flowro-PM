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
    <div className="sticky bottom-0 border-t border-[#e8e0d6] bg-[#fbf7f1]/92 px-4 pt-4 pb-8 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#141416]/92">
      <div className="mx-auto max-w-3xl">
        {selectionContext ? (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-[1.25rem] border border-[#d8e7fb] bg-[#edf5ff] px-3 py-2 text-sm text-[#2f8fff] dark:border-[#5B8DEF]/30 dark:bg-[#5B8DEF]/10 dark:text-[#5B8DEF]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">auto_fix</span>
              <span className="font-medium">Editing: {selectionContext.section}</span>
            </div>
            <button onClick={onClearContext} className="rounded-full p-1 text-[#2f8fff] transition hover:bg-white/70 dark:text-[#5B8DEF] dark:hover:bg-[#1E1E22]/70">
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        ) : null}

        <form
          onSubmit={handleSubmit}
          className="rounded-[1.5rem] border border-[#dbe3ef] bg-white px-3 py-2 shadow-[0_24px_40px_-34px_rgba(25,37,62,0.3)] transition focus-within:border-[#bfd8ff] focus-within:ring-4 focus-within:ring-[#2f8fff]/10 dark:border-white/[0.06] dark:bg-[#1A1A1D] dark:focus-within:border-[#5B8DEF]/50 dark:focus-within:ring-[#5B8DEF]/10"
        >
          {hasClarificationFlow ? (
            <div className="space-y-4">
              <div className="rounded-[1.4rem] border border-[#e8e0d6] bg-[#fcfaf7] px-4 py-3 dark:border-white/[0.06] dark:bg-[#0C0C0E]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-white/[0.4]">Waiting for answers</p>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-white/[0.5]">
                  Collecting one setup round before generating the project plan.
                </p>
              </div>

              {clarificationSummaries?.length ? (
                <div className="space-y-2">
                  {clarificationSummaries.map((summary, index) => (
                    <div key={summary.questionId} className="rounded-[1.1rem] border border-[#e8e0d6] bg-[#fcfaf7] px-4 py-3 dark:border-white/[0.06] dark:bg-[#0C0C0E]">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-white/[0.4]">
                            Answered {index + 1}
                          </p>
                          <p className="mt-1 text-sm font-medium leading-6 text-slate-900 dark:text-white/[0.9]">{summary.prompt}</p>
                        </div>
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                          Done
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-white/[0.5]">{summary.answerText}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              {activeClarificationQuestion ? (
                <div className="rounded-[1.35rem] border border-[#dde8f7] bg-[#f8fbff] p-4 dark:border-white/[0.06] dark:bg-[#1A1A1D]/50">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-white/[0.4]">Current question</p>
                      <p className="mt-2 text-base font-semibold leading-7 text-slate-900 dark:text-white/[0.9]">{activeClarificationQuestion.prompt}</p>
                    </div>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#2f8fff] dark:bg-[#0C0C0E] dark:text-[#5B8DEF]">
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
                          className={`rounded-[1rem] border px-3 py-3 text-left transition ${
                            isSelected
                              ? "border-[#2f8fff] bg-[#edf5ff] text-slate-900 dark:border-[#5B8DEF] dark:bg-[#5B8DEF]/10 dark:text-white/[0.9]"
                               : "border-[#e2ddd5] bg-white text-slate-700 hover:border-[#bfd8ff] hover:bg-white dark:border-white/[0.06] dark:bg-[#1A1A1D] dark:text-white/[0.7] dark:hover:border-[#5B8DEF]/50 dark:hover:bg-[#1E1E22]"
                          } ${isGenerating ? "cursor-not-allowed opacity-70" : ""}`}
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] ${
                                isSelected
                                  ? "border-[#2f8fff] bg-[#2f8fff] text-white dark:border-[#5B8DEF] dark:bg-[#5B8DEF]"
                                  : "border-[#cfd7e4] text-transparent dark:border-white/[0.1]"
                              }`}
                            >
                              {activeClarificationQuestion.selectionMode === "single" ? "●" : "✓"}
                            </span>
                            <div>
                              <p className="text-sm font-medium">{option.label}</p>
                              {option.description ? (
                                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-white/[0.5]">{option.description}</p>
                              ) : null}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {showOtherInput ? (
                    <div className="mt-4 rounded-[1rem] border border-[#e2ddd5] bg-white p-3 dark:border-white/[0.06] dark:bg-[#0C0C0E]">
                      <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-white/[0.4]">
                        Tell Flowro what to do instead
                      </label>
                      <textarea
                        value={activeAnswer?.customText || ""}
                        onChange={(event) => onClarificationCustomTextChange?.(activeClarificationQuestion.id, event.target.value)}
                        rows={3}
                        placeholder="Type your custom answer..."
                        disabled={isGenerating}
                        className="mt-3 w-full resize-none rounded-[1rem] border border-[#e2ddd5] bg-[#fcfaf7] px-3 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-[#2f8fff] focus:bg-white focus:ring-4 focus:ring-[#2f8fff]/10 dark:border-white/[0.06] dark:bg-[#1A1A1D] dark:text-white/[0.9] dark:focus:border-[#5B8DEF] dark:focus:bg-[#1A1A1D] dark:focus:ring-[#5B8DEF]/10"
                      />
                    </div>
                  ) : null}

                  {activeClarificationQuestion.selectionMode === "multiple" || showOtherInput ? (
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                        {canContinueClarificationStep ? "Answer ready" : "Complete this answer to continue"}
                      </span>
                      <button
                        type="button"
                        onClick={() => onClarificationContinue?.()}
                        disabled={!canContinueClarificationStep || isGenerating}
                        className="send-button-gradient inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                      >
                        Continue
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-[1.35rem] border border-[#dde8f7] bg-[#f8fbff] p-4 dark:border-white/[0.06] dark:bg-[#1A1A1D]/50">
                  <p className="text-sm font-medium text-slate-800 dark:text-white/[0.8]">All questions are answered.</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-white/[0.5]">
                    Submit the selected answers so Flowro can generate the project plan.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between gap-3 pt-1">
                <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                  {isClarificationReady ? "Ready to submit all answers" : "Flowro is waiting for the next answer"}
                </span>
                <button
                  type="submit"
                  disabled={!isClarificationReady || isGenerating}
                  className="send-button-gradient inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
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
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-[#f5efe5] hover:text-slate-600 disabled:opacity-40 dark:hover:bg-[#242428] dark:hover:text-white/[0.7]"
                >
                  <span className="material-symbols-outlined text-[20px]">add</span>
                </button>

                <textarea
                  value={message}
                  onChange={(event) => onMessageChange(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={defaultPlaceholder}
                  rows={1}
                  className="max-h-28 min-h-[40px] w-full resize-none border-0 bg-transparent py-2 text-sm leading-6 text-slate-900 placeholder:text-slate-400 focus:ring-0 dark:text-white/[0.9] dark:placeholder:text-white/[0.4]"
                  disabled={isGenerating}
                />

                <button
                  type="button"
                  disabled={isGenerating}
                  title="Voice (coming soon)"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-[#f5efe5] hover:text-slate-600 disabled:opacity-40 dark:hover:bg-[#242428] dark:hover:text-white/[0.7]"
                >
                  <span className="material-symbols-outlined text-[20px]">mic</span>
                </button>

                <button
                  type="submit"
                  disabled={!message.trim() || isGenerating}
                  className="send-button-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                  title="Send"
                >
                  {isGenerating ? (
                    <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                  ) : (
                    <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                  )}
                </button>
              </div>

              <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-slate-400 dark:text-white/[0.4]">
                <span className="font-medium text-slate-500 dark:text-white/[0.5]">Flowro AI</span>
                <span>⏎ to send · ⇧⏎ for newline</span>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
