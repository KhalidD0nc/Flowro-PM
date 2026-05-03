"use client";

import type { MessageListProps, Intent, DisplayInfo, ProposedChanges } from "./types";
import { isUBPContent } from "./types";
import { useStreamingText } from "@/hooks/useStreamingText";
import { getProposalDraftState, hashPrdConfig } from "@/lib/prd/editor";
import { parseClarificationResponseContent, parseProposedPrdChanges } from "@/lib/prd/schema";
import StepCardList from "./StepCardList";
import ActionChipRow from "./ActionChipRow";

function getDisplayMessage(
  content: string | object,
  msgIntent?: Intent,
  msgProposedChanges?: ProposedChanges
): DisplayInfo {
  const extractMessage = (obj: Record<string, unknown>, fallbackIntent: Intent): string => {
    if (obj.message && typeof obj.message === "string" && obj.message.trim().length > 0) {
      return obj.message;
    }
    if (fallbackIntent === "initial") {
      return "I've created your project plan. Open it and review the build contract.";
    }
    if (fallbackIntent === "clarification") {
      return "I need a few details before I generate the project plan.";
    }
    if (fallbackIntent === "proposal") {
      return "I have some suggested changes for your blueprint.";
    }
    return "Let me know what you'd like to explore.";
  };

  const isRawJson = (value: string): boolean => {
    const trimmed = value.trim();
    return (
      (trimmed.startsWith("{") && trimmed.includes('"intent"')) ||
      (trimmed.startsWith("{") && trimmed.includes('"message"')) ||
      trimmed.startsWith("```")
    );
  };

  const cleanJsonString = (value: string): string => {
    let clean = value.trim();
    if (clean.startsWith("```")) {
      clean = clean.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }
    return clean;
  };

  if (msgIntent) {
    let parsed: unknown = content;
    if (typeof content === "string") {
      try {
        parsed = JSON.parse(cleanJsonString(content));
      } catch {
        if (isRawJson(content)) {
          return { text: extractMessage({}, msgIntent), intent: msgIntent, proposedChanges: msgProposedChanges };
        }
      }
    }

    const obj = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    const text = obj
      ? extractMessage(obj, msgIntent)
      : typeof content === "string" && !isRawJson(content)
        ? content
        : extractMessage({}, msgIntent);

    return {
      text,
      intent: msgIntent,
      proposedChanges: msgProposedChanges,
      clarificationQuestions: msgIntent === "clarification" ? parseClarificationResponseContent(parsed)?.questions : undefined,
    };
  }

  let parsed: unknown = content;
  if (typeof content === "string") {
    try {
      parsed = JSON.parse(cleanJsonString(content));
    } catch {
      if (isRawJson(content)) {
        return { text: "Let me know what you'd like to explore.", intent: "discussion" };
      }
      return { text: content, intent: "discussion" };
    }
  }

  if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    const intent =
      obj.intent === "initial" || obj.intent === "clarification" || obj.intent === "discussion" || obj.intent === "proposal"
        ? (obj.intent as Intent)
        : isUBPContent(obj)
          ? "initial"
          : "discussion";

    const text = extractMessage(obj, intent);

    const proposedChanges = parseProposedPrdChanges(obj.proposedChanges);
    const clarificationQuestions = parseClarificationResponseContent(parsed)?.questions;

    return { text, intent, proposedChanges, clarificationQuestions };
  }

  const contentStr = String(content);
  if (isRawJson(contentStr)) {
    return { text: "Let me know what you'd like to explore.", intent: "discussion" };
  }
  return { text: contentStr, intent: "discussion" };
}

function parseStreamedContent(raw: string): string {
  if (!raw) return "";

  try {
    const parsed = JSON.parse(raw);
    if (parsed.message && typeof parsed.message === "string") {
      return parsed.message;
    }
  } catch {
    return raw.trim().startsWith("{") ? "" : raw;
  }

  return raw;
}

function StreamingMessage({ rawContent, isStreaming }: { rawContent: string; isStreaming: boolean }) {
  const parsedContent = parseStreamedContent(rawContent);
  const { displayedText, isTyping } = useStreamingText(parsedContent, {
    isStreaming,
    charDelay: 15,
    minDelay: 8,
    maxDelay: 35,
    punctuationPause: 80,
  });

  return (
    <div className="flex max-w-2xl flex-col gap-3 animate-slide-in-left">
      <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Flowro AI</span>
      <div className="ai-message-bubble rounded-[1.5rem] p-4">
        <p className="whitespace-pre-wrap leading-7 text-slate-700 dark:text-white/[0.85]">
          {displayedText ? <span className="streaming-text">{displayedText}</span> : null}
          {(isTyping || (isStreaming && !displayedText)) ? (
            <span className="typing-cursor ml-0.5 inline-block h-[1.1em] w-0.5 bg-[#2f8fff] align-middle" />
          ) : null}
        </p>
      </div>
    </div>
  );
}

export default function MessageList({
  messages,
  currentPrd,
  isStreaming,
  streamedContent,
  isGenerating,
  thinkingPhase,
  onOpenBlueprint,
  onApplyProposedChanges,
  messagesEndRef,
  onQuickAction,
}: MessageListProps) {
  const currentPrdHash = currentPrd ? hashPrdConfig(currentPrd) : null;

  return (
    <main className="flex-1 overflow-y-auto bg-transparent px-4 py-5 md:px-6 lg:px-7 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 pb-8">
        {messages.map((msg, index) => {
          const isUser = msg.role === "user";
          const displayInfo = isUser
            ? ({ text: msg.content, intent: "discussion" } as DisplayInfo)
            : getDisplayMessage(msg.content, msg.intent, msg.proposedChanges);

          if (isUser) {
            return (
              <div key={index} className="flex flex-col items-end gap-2">
                <div className="max-w-xl rounded-[1.5rem] rounded-tr-md border border-[#cfe1ff] user-message-gradient p-4 text-left text-slate-800 dark:border-[#5B8DEF]/20 dark:text-white/[0.9]">
                  {msg.proposedChanges ? (
                    <div className="mb-3 flex items-center gap-3 rounded-[1rem] border border-[#d3e6ff] bg-white/60 px-3 py-2 text-xs dark:border-white/[0.06] dark:bg-[#1A1A1D]/60">
                      <div className="flex size-7 items-center justify-center rounded-lg bg-[#edf5ff] text-[#2f8fff] dark:bg-[#5B8DEF]/10 dark:text-[#5B8DEF]">
                        <span className="material-symbols-outlined text-[14px]">auto_fix</span>
                      </div>
                      <div>
                        <p className="font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-white/[0.5]">AI enhancement</p>
                        <p className="mt-0.5 text-slate-700 dark:text-white/[0.7]">Applied to {msg.proposedChanges.sections[0]}</p>
                      </div>
                    </div>
                  ) : null}
                  <p className="whitespace-pre-wrap leading-7">{displayInfo.text}</p>
                </div>
              </div>
            );
          }

          return (
            <div key={index} className="flex max-w-2xl flex-col gap-3">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-white/[0.4]">Flowro AI</span>
              <div className="ai-message-bubble rounded-[1.5rem] p-4">
                <p className="mb-2 whitespace-pre-wrap leading-7 text-slate-700 dark:text-white/[0.85]">{displayInfo.text}</p>
                {displayInfo.intent === "proposal" && displayInfo.proposedChanges ? (() => {
                  const proposalState = getProposalDraftState(displayInfo.proposedChanges, currentPrd ?? null);
                  const nextPrdHash = hashPrdConfig(displayInfo.proposedChanges.nextPrdConfig);
                  const stateLabel =
                    proposalState === "applied"
                      ? "Applied to draft"
                      : proposalState === "stale"
                        ? "Proposal is stale"
                        : "Ready to apply";

                  return (
                    <div className="mt-4 rounded-[1rem] border border-[#dde8f7] bg-[#f8fbff] p-3 dark:border-white/[0.06] dark:bg-[#141416]">
                    <div className="mb-2 flex items-center gap-2 text-sm text-slate-500 dark:text-white/[0.5]">
                      <span className="material-symbols-outlined text-[14px]">edit_note</span>
                      Proposed changes
                    </div>
                    <p className="text-sm font-medium text-slate-800 dark:text-white/[0.9]">{displayInfo.proposedChanges.summary}</p>
                    {displayInfo.proposedChanges.sections.length > 0 ? (
                      <p className="mt-1 text-xs text-slate-500 dark:text-white/[0.4]">
                        Sections: {displayInfo.proposedChanges.sections.join(", ")}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={`rounded-full px-2.5 py-1 font-semibold uppercase tracking-[0.12em] ${
                          proposalState === "applied"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : proposalState === "stale"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                              : "bg-[#dcecff] text-[#2f8fff] dark:bg-[#5B8DEF]/10 dark:text-[#5B8DEF]"
                        }`}
                      >
                        {stateLabel}
                      </span>
                      {currentPrdHash && proposalState !== "ready" ? (
                        <span className="text-slate-500 dark:text-white/[0.5]">
                          {proposalState === "applied"
                            ? "The draft already matches this proposal."
                            : `Current draft no longer matches base ${displayInfo.proposedChanges.basePrdHash}.`}
                        </span>
                      ) : null}
                      {proposalState === "ready" ? (
                        <span className="text-slate-500 dark:text-white/[0.5]">Candidate draft {nextPrdHash} is ready for review.</span>
                      ) : null}
                    </div>
                  </div>
                  );
                })() : null}

                {displayInfo.intent === "initial" ? (
                  <button
                    onClick={onOpenBlueprint}
                    className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#d8e7fb] bg-[#edf5ff] px-3 py-2 text-sm font-medium text-[#2f8fff] transition hover:bg-[#e2efff] dark:border-[#5B8DEF]/20 dark:bg-[#5B8DEF]/10 dark:text-[#5B8DEF] dark:hover:bg-[#5B8DEF]/15"
                  >
                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                    Open Project Plan
                  </button>
                ) : null}

                {displayInfo.intent === "proposal" && displayInfo.proposedChanges ? (() => {
                  const proposalState = getProposalDraftState(displayInfo.proposedChanges, currentPrd ?? null);
                  const disabled = proposalState !== "ready";
                  const label =
                    proposalState === "applied"
                      ? "Applied"
                      : proposalState === "stale"
                        ? "Stale Proposal"
                        : "Apply To Draft";

                  return (
                    <button
                      onClick={() => onApplyProposedChanges(displayInfo.proposedChanges!, index)}
                      disabled={disabled}
                      className={`mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition ${
                        disabled
                          ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500 dark:border-white/[0.06] dark:bg-[#1A1A1D] dark:text-white/[0.4]"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/20 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {proposalState === "applied" ? "task_alt" : proposalState === "stale" ? "history" : "check_circle"}
                      </span>
                      {label}
                    </button>
                  );
                })() : null}

                {onQuickAction && (displayInfo.intent === "initial" || displayInfo.intent === "proposal" || displayInfo.intent === "discussion") ? (
                  <ActionChipRow intent={displayInfo.intent} onPick={onQuickAction} />
                ) : null}
              </div>
            </div>
          );
        })}

        {isStreaming && streamedContent ? <StreamingMessage rawContent={streamedContent} isStreaming={isStreaming} /> : null}

        {isGenerating ? (
          <div className="flex max-w-2xl flex-col gap-3 animate-slide-in-left">
          <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-white/[0.4]">Flowro AI</span>
          <StepCardList thinkingPhase={thinkingPhase} />
          </div>
        ) : null}

        <div ref={messagesEndRef} />
      </div>
    </main>
  );
}

export function WelcomeScreen({ onQuickAction }: { onQuickAction: (message: string) => void }) {
  const actions = [
    { icon: "description", text: "Draft a Plan", query: "I want to create a project plan for a new web app" },
    { icon: "lightbulb", text: "Brainstorm", query: "Help me brainstorm features for my app" },
    { icon: "timeline", text: "Build Flow", query: "Help me plan the app screens, design, and build tasks" },
    { icon: "analytics", text: "Research", query: "Analyze competitors in my market" },
  ];

  return (
    <main className="flex flex-1 items-center justify-center overflow-y-auto px-5 py-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="mx-auto flex max-w-xl flex-col items-center gap-5 text-center">
        <div className="flex size-18 items-center justify-center rounded-[1.75rem] border border-[#dce8f8] bg-white shadow-[0_24px_36px_-26px_rgba(47,143,255,0.35)] dark:border-[#5B8DEF]/20 dark:bg-[#1A1A1D]">
          <img src="/logo.png" alt="Flowro" className="h-10 w-10 object-contain" />
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-white/[0.4]">Start here</p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl tracking-tight text-slate-900 dark:text-white/[0.9]">
            Shape the product with Flowro
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-white/[0.5]">
            Use the chat to turn a rough idea into an approved project plan, UI direction, and build-ready task list.
          </p>
        </div>

        <div className="grid w-full gap-3 sm:grid-cols-2">
          {actions.map((action) => (
            <button
              key={action.text}
              onClick={() => onQuickAction(action.query)}
              className="group flex items-center justify-center gap-2 rounded-[1.25rem] border border-[#e4ddd4] bg-white px-4 py-3 text-sm font-medium text-slate-600 shadow-[0_18px_32px_-30px_rgba(20,27,44,0.25)] transition hover:border-[#bfd8ff] hover:bg-[#f8fbff] hover:text-slate-900 dark:border-white/[0.06] dark:bg-[#141416] dark:text-white/[0.7] dark:hover:border-[#5B8DEF]/30 dark:hover:bg-[#1A1A1D] dark:hover:text-white/[0.9]"
            >
              <span className="material-symbols-outlined text-[18px] text-slate-400 transition group-hover:text-[#2f8fff] dark:text-white/[0.4] dark:group-hover:text-[#5B8DEF]">
                {action.icon}
              </span>
              {action.text}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
