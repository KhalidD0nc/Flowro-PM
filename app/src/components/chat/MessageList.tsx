"use client";

import type { MessageListProps, Intent, DisplayInfo, ProposedChanges } from "./types";
import { isUBPContent } from "./types";
import { useStreamingText } from "@/hooks/useStreamingText";
import { getProposalDraftState, hashPrdConfig } from "@/lib/prd/editor";
import { parseProposedPrdChanges } from "@/lib/prd/schema";

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
      return "I've created your PRD config. Open it and review the structure.";
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
      obj.intent === "initial" || obj.intent === "discussion" || obj.intent === "proposal"
        ? (obj.intent as Intent)
        : isUBPContent(obj)
          ? "initial"
          : "discussion";

    const text = extractMessage(obj, intent);

    const proposedChanges = parseProposedPrdChanges(obj.proposedChanges);

    return { text, intent, proposedChanges };
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
        <p className="whitespace-pre-wrap leading-7 text-slate-700">
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
}: MessageListProps) {
  const currentPrdHash = currentPrd ? hashPrdConfig(currentPrd) : null;

  return (
    <main className="flex-1 overflow-y-auto bg-transparent px-4 py-5 md:px-6 lg:px-7">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 pb-8">
        {messages.map((msg, index) => {
          const isUser = msg.role === "user";
          const displayInfo = isUser
            ? ({ text: msg.content, intent: "discussion" } as DisplayInfo)
            : getDisplayMessage(msg.content, msg.intent, msg.proposedChanges);

          if (isUser) {
            return (
              <div key={index} className="flex flex-col items-end gap-2">
                <div className="max-w-xl rounded-[1.5rem] rounded-tr-md border border-[#cfe1ff] user-message-gradient p-4 text-left text-slate-800">
                  {msg.proposedChanges ? (
                    <div className="mb-3 flex items-center gap-3 rounded-[1rem] border border-[#d3e6ff] bg-white/60 px-3 py-2 text-xs">
                      <div className="flex size-7 items-center justify-center rounded-lg bg-[#edf5ff] text-[#2f8fff]">
                        <span className="material-symbols-outlined text-[14px]">auto_fix</span>
                      </div>
                      <div>
                        <p className="font-semibold uppercase tracking-[0.14em] text-slate-500">AI enhancement</p>
                        <p className="mt-0.5 text-slate-700">Applied to {msg.proposedChanges.sections[0]}</p>
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
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Flowro AI</span>
              <div className="ai-message-bubble rounded-[1.5rem] p-4">
                <p className="mb-2 whitespace-pre-wrap leading-7 text-slate-700">{displayInfo.text}</p>

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
                    <div className="mt-4 rounded-[1rem] border border-[#dde8f7] bg-[#f8fbff] p-3">
                    <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
                      <span className="material-symbols-outlined text-[14px]">edit_note</span>
                      Proposed changes
                    </div>
                    <p className="text-sm font-medium text-slate-800">{displayInfo.proposedChanges.summary}</p>
                    {displayInfo.proposedChanges.sections.length > 0 ? (
                      <p className="mt-1 text-xs text-slate-500">
                        Sections: {displayInfo.proposedChanges.sections.join(", ")}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={`rounded-full px-2.5 py-1 font-semibold uppercase tracking-[0.12em] ${
                          proposalState === "applied"
                            ? "bg-emerald-100 text-emerald-700"
                            : proposalState === "stale"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-[#dcecff] text-[#2f8fff]"
                        }`}
                      >
                        {stateLabel}
                      </span>
                      {currentPrdHash && proposalState !== "ready" ? (
                        <span className="text-slate-500">
                          {proposalState === "applied"
                            ? "The draft already matches this proposal."
                            : `Current draft no longer matches base ${displayInfo.proposedChanges.basePrdHash}.`}
                        </span>
                      ) : null}
                      {proposalState === "ready" ? (
                        <span className="text-slate-500">Candidate draft {nextPrdHash} is ready for review.</span>
                      ) : null}
                    </div>
                  </div>
                  );
                })() : null}

                {displayInfo.intent === "initial" ? (
                  <button
                    onClick={onOpenBlueprint}
                    className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#d8e7fb] bg-[#edf5ff] px-3 py-2 text-sm font-medium text-[#2f8fff] transition hover:bg-[#e2efff]"
                  >
                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                    Open PRD
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
                          ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {proposalState === "applied" ? "task_alt" : proposalState === "stale" ? "history" : "check_circle"}
                      </span>
                      {label}
                    </button>
                  );
                })() : null}
              </div>
            </div>
          );
        })}

        {isStreaming && streamedContent ? <StreamingMessage rawContent={streamedContent} isStreaming={isStreaming} /> : null}

        {isGenerating ? (
          <div className="flex max-w-2xl flex-col gap-3 animate-slide-in-left">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Flowro AI</span>
            <div className="ai-message-bubble rounded-[1.5rem] p-4">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined animate-spin text-[#2f8fff]">progress_activity</span>
                  <div>
                    <p className="text-sm font-medium text-slate-800">Updating your workspace</p>
                    <p className="text-sm text-slate-500">
                      {thinkingPhase !== undefined ? `Step ${thinkingPhase + 1} in progress` : "Preparing changes"}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  {[0, 1, 2, 3, 4].map((step) => (
                    <span
                      key={step}
                      className={`h-2 flex-1 rounded-full ${
                        thinkingPhase !== undefined && thinkingPhase >= step ? "bg-[#2f8fff]" : "bg-[#e5e7eb]"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div ref={messagesEndRef} />
      </div>
    </main>
  );
}

export function WelcomeScreen({ onQuickAction }: { onQuickAction: (message: string) => void }) {
  const actions = [
    { icon: "description", text: "Draft a PRD", query: "I want to create a PRD for a new product idea" },
    { icon: "lightbulb", text: "Brainstorm", query: "Help me brainstorm features for my product" },
    { icon: "timeline", text: "Roadmap", query: "I need help creating a product roadmap" },
    { icon: "analytics", text: "Research", query: "Analyze competitors in my market" },
  ];

  return (
    <main className="flex flex-1 items-center justify-center overflow-y-auto px-5 py-10">
      <div className="mx-auto flex max-w-xl flex-col items-center gap-5 text-center">
        <div className="flex size-18 items-center justify-center rounded-[1.75rem] border border-[#dce8f8] bg-white shadow-[0_24px_36px_-26px_rgba(47,143,255,0.35)]">
          <img src="/logo.png" alt="Flowro" className="h-10 w-10 object-contain" />
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Start here</p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl tracking-tight text-slate-900">
            Shape the product with Flowro
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-500">
            Use the chat to draft requirements, refine flows, or turn a rough idea into a clean PRD structure.
          </p>
        </div>

        <div className="grid w-full gap-3 sm:grid-cols-2">
          {actions.map((action) => (
            <button
              key={action.text}
              onClick={() => onQuickAction(action.query)}
              className="group flex items-center justify-center gap-2 rounded-[1.25rem] border border-[#e4ddd4] bg-white px-4 py-3 text-sm font-medium text-slate-600 shadow-[0_18px_32px_-30px_rgba(20,27,44,0.25)] transition hover:border-[#bfd8ff] hover:bg-[#f8fbff] hover:text-slate-900"
            >
              <span className="material-symbols-outlined text-[18px] text-slate-400 transition group-hover:text-[#2f8fff]">
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
