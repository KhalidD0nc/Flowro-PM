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
    <div className="sticky bottom-0 border-t border-[#e8e0d6] bg-[#fbf7f1]/92 px-4 pt-4 pb-8 backdrop-blur-xl">
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
          onSubmit={handleSubmit}
          className="rounded-[1.75rem] border border-[#dbe3ef] bg-white px-4 py-3 shadow-[0_24px_40px_-34px_rgba(25,37,62,0.3)] transition focus-within:border-[#bfd8ff] focus-within:ring-4 focus-within:ring-[#2f8fff]/10"
        >
          {hasClarificationFlow ? (
            <div className="space-y-4">
              <div className="rounded-[1.4rem] border border-[#e8e0d6] bg-[#fcfaf7] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Waiting for answers</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Collecting one setup round before generating the project plan.
                </p>
              </div>

              {clarificationSummaries?.length ? (
                <div className="space-y-2">
                  {clarificationSummaries.map((summary, index) => (
                    <div key={summary.questionId} className="rounded-[1.1rem] border border-[#e8e0d6] bg-[#fcfaf7] px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                            Answered {index + 1}
                          </p>
                          <p className="mt-1 text-sm font-medium leading-6 text-slate-900">{summary.prompt}</p>
                        </div>
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                          Done
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{summary.answerText}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              {activeClarificationQuestion ? (
                <div className="rounded-[1.35rem] border border-[#dde8f7] bg-[#f8fbff] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Current question</p>
                      <p className="mt-2 text-base font-semibold leading-7 text-slate-900">{activeClarificationQuestion.prompt}</p>
                    </div>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#2f8fff]">
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
                              ? "border-[#2f8fff] bg-[#edf5ff] text-slate-900"
                              : "border-[#e2ddd5] bg-white text-slate-700 hover:border-[#bfd8ff] hover:bg-white"
                          } ${isGenerating ? "cursor-not-allowed opacity-70" : ""}`}
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] ${
                                isSelected
                                  ? "border-[#2f8fff] bg-[#2f8fff] text-white"
                                  : "border-[#cfd7e4] text-transparent"
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
                    <div className="mt-4 rounded-[1rem] border border-[#e2ddd5] bg-white p-3">
                      <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Tell Flowro what to do instead
                      </label>
                      <textarea
                        value={activeAnswer?.customText || ""}
                        onChange={(event) => onClarificationCustomTextChange?.(activeClarificationQuestion.id, event.target.value)}
                        rows={3}
                        placeholder="Type your custom answer..."
                        disabled={isGenerating}
                        className="mt-3 w-full resize-none rounded-[1rem] border border-[#e2ddd5] bg-[#fcfaf7] px-3 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-[#2f8fff] focus:bg-white focus:ring-4 focus:ring-[#2f8fff]/10"
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
                <div className="rounded-[1.35rem] border border-[#dde8f7] bg-[#f8fbff] p-4">
                  <p className="text-sm font-medium text-slate-800">All questions are answered.</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
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
            </>
          )}
        </form>
      </div>
    </div>
  );
}
