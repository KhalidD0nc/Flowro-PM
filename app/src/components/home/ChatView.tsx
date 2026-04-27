"use client";

import { startTransition, useCallback, useDeferredValue, useEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import type { User } from "firebase/auth";
import { authGet, authPatch, authPost } from "@/lib/authFetch";
import type { ClarificationAnswerState, ProjectView, PRDView } from "@/lib/types/views";
import { getLatestClarificationResponse, type ClarificationQuestion, type PRDConfig } from "@/lib/prd/schema";
import {
  buildClarificationAnswerMessage,
  canAdvanceClarificationQuestion,
  completeClarificationAnswer,
  createEmptyClarificationAnswer,
  getClarificationProgress,
  normalizeClarificationAnswers,
  updateClarificationCustomText,
  updateClarificationSelection,
} from "@/lib/clarificationFlow";
import {
  canApplyProposal,
  clonePrdConfig,
  createEmptyFeature,
  createEmptyFlow,
  createEmptyFlowStep,
  getProposalDraftState,
  normalizePrdConfig,
  validatePrdDraft,
  type PRDEditorValidationIssue,
} from "@/lib/prd/editor";
import { mapPRDFlowsToMermaid } from "@/lib/prd/mermaid";
import MermaidRenderer from "@/components/prd/MermaidRenderer";
import { ChatPanel } from "@/components/chat";
import type { ChatMessage, SelectionContext } from "@/components/chat/types";

interface ChatViewProps {
  projectId: string;
  initialMessage: string;
  user: User;
  onBack: () => void;
  isExisting?: boolean;
}

const PRD_SECTIONS = [
  { id: "framing", label: "Framing", issuePath: "metadata" },
  { id: "features", label: "Features", issuePath: "features" },
  { id: "flows", label: "Flows", issuePath: "flows" },
] as const;

const CHAT_SPLIT_STORAGE_KEY = "flowro_workspace_chat_split";
const DEFAULT_CHAT_SPLIT_PERCENT = 32;
const MIN_CHAT_SPLIT_PERCENT = 24;
const MAX_CHAT_SPLIT_PERCENT = 48;

function clampChatSplit(percent: number) {
  return Math.min(MAX_CHAT_SPLIT_PERCENT, Math.max(MIN_CHAT_SPLIT_PERCENT, percent));
}

function buildLocalPrdView(projectId: string, prdConfig: PRDConfig): PRDView {
  return {
    id: projectId,
    projectId,
    config: normalizePrdConfig(prdConfig),
    updatedAt: new Date().toISOString(),
  };
}

function deriveSeedMessage(project: ProjectView, initialMessage: string): string {
  const trimmedInitial = initialMessage.trim();
  if (trimmedInitial) {
    return trimmedInitial;
  }

  const latestUserMessage = [...project.chatHistory]
    .reverse()
    .find((message) => message.role === "user" && message.content.trim());

  if (latestUserMessage?.content.trim()) {
    return latestUserMessage.content.trim();
  }

  if (project.description?.trim()) {
    return project.description.trim();
  }

  return project.projectName.trim();
}

function createTemporaryMessageId() {
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getIssue(issues: PRDEditorValidationIssue[], path: string): string | null {
  return issues.find((issue) => issue.path === path)?.message ?? null;
}

function getSectionIssue(issues: PRDEditorValidationIssue[], prefix: string): string | null {
  return issues.find((issue) => issue.path === prefix || issue.path.startsWith(`${prefix}.`))?.message ?? null;
}

function FieldError({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="mt-2 text-xs font-medium text-amber-600">{message}</p>;
}

function SectionFrame({
  id,
  title,
  eyebrow,
  action,
  children,
}: {
  id?: string;
  title: string;
  eyebrow: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="rounded-[2rem] border border-[#e4ddd4] bg-white/90 p-6 shadow-[0_28px_60px_-40px_rgba(29,41,65,0.24)] scroll-mt-28"
    >
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-400">{eyebrow}</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function PanelLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {hint ? <span className="text-xs text-slate-400">{hint}</span> : null}
    </div>
  );
}

function InputField(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-2xl border border-[#d9e2ef] bg-[#faf8f4] px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#2f8fff] focus:bg-white focus:ring-4 focus:ring-[#2f8fff]/10 ${props.className ?? ""}`}
    />
  );
}

function TextAreaField(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-2xl border border-[#d9e2ef] bg-[#faf8f4] px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#2f8fff] focus:bg-white focus:ring-4 focus:ring-[#2f8fff]/10 ${props.className ?? ""}`}
    />
  );
}

function SelectField(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-2xl border border-[#d9e2ef] bg-[#faf8f4] px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#2f8fff] focus:bg-white focus:ring-4 focus:ring-[#2f8fff]/10 ${props.className ?? ""}`}
    />
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] border border-[#e4ddd4] bg-[#faf8f4] px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function PreviewMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] border border-[#ebe4db] bg-[#fbf8f4] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm leading-6 text-slate-700">{value}</p>
    </div>
  );
}

export default function ChatView({ projectId, initialMessage, user, onBack: _onBack }: ChatViewProps) {
  void _onBack;

  const [project, setProject] = useState<ProjectView | null>(null);
  const [loadingProject, setLoadingProject] = useState(true);
  const [draftPrd, setDraftPrd] = useState<PRDConfig | null>(null);
  const [baselinePrd, setBaselinePrd] = useState<PRDConfig | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [mobilePane, setMobilePane] = useState<"chat" | "prd">("chat");
  const [message, setMessage] = useState("");
  const [chatRequestState, setChatRequestState] = useState<"idle" | "submitting" | "error">("idle");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState("");
  const [thinkingPhase, setThinkingPhase] = useState<number | undefined>();
  const [selectionContext, setSelectionContext] = useState<SelectionContext | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [lastSubmittedMessage, setLastSubmittedMessage] = useState<string | null>(null);
  const [lastFailedSubmission, setLastFailedSubmission] = useState<string | null>(null);
  const [clarificationAnswers, setClarificationAnswers] = useState<Record<string, ClarificationAnswerState>>({});
  const [chatSplitPercent, setChatSplitPercent] = useState(DEFAULT_CHAT_SPLIT_PERCENT);
  const [isDraggingChatSplit, setIsDraggingChatSplit] = useState(false);
  const hasInitialized = useRef(false);
  const hasBootstrappedSeed = useRef(false);
  const desktopWorkspaceRef = useRef<HTMLDivElement>(null);
  const prdWorkspaceRef = useRef<HTMLDivElement>(null);

  const deferredDraft = useDeferredValue(draftPrd);
  const normalizedDraft = draftPrd ? normalizePrdConfig(draftPrd) : null;
  const normalizedDeferredDraft = deferredDraft ? normalizePrdConfig(deferredDraft) : null;
  const validationIssues = validatePrdDraft(draftPrd);
  const draftSnapshot = normalizedDraft ? JSON.stringify(normalizedDraft) : "";
  const baselineSnapshot = baselinePrd ? JSON.stringify(normalizePrdConfig(baselinePrd)) : "";
  const isDirty = draftSnapshot !== baselineSnapshot;
  const generationMode = "chat" as const;
  const isChatSubmitting = chatRequestState === "submitting";
  const latestClarification = project ? getLatestClarificationResponse(project.chatHistory) ?? null : null;
  const clarificationQuestions = !draftPrd ? latestClarification?.questions ?? null : null;
  const clarificationProgress = clarificationQuestions
    ? getClarificationProgress(clarificationQuestions, clarificationAnswers)
    : { activeQuestion: null, activeQuestionIndex: -1, answeredSummaries: [], isReady: false };
  const isClarificationReady = clarificationProgress.isReady;

  useEffect(() => {
    const stored = localStorage.getItem(CHAT_SPLIT_STORAGE_KEY);
    if (!stored) return;

    const parsed = Number(stored);
    if (!Number.isFinite(parsed)) return;

    setChatSplitPercent(clampChatSplit(parsed));
  }, []);

  useEffect(() => {
    localStorage.setItem(CHAT_SPLIT_STORAGE_KEY, String(chatSplitPercent));
  }, [chatSplitPercent]);

  useEffect(() => {
    if (!clarificationQuestions?.length) {
      setClarificationAnswers({});
      return;
    }

    setClarificationAnswers((current) => normalizeClarificationAnswers(clarificationQuestions, current));
  }, [clarificationQuestions]);

  const updateChatSplitFromClientX = useCallback((clientX: number) => {
    const workspace = desktopWorkspaceRef.current;
    if (!workspace) return;

    const bounds = workspace.getBoundingClientRect();
    if (bounds.width <= 0) return;

    const nextPercent = ((clientX - bounds.left) / bounds.width) * 100;
    setChatSplitPercent(clampChatSplit(nextPercent));
  }, []);

  useEffect(() => {
    if (!isDraggingChatSplit) return;

    const handlePointerMove = (event: PointerEvent) => {
      updateChatSplitFromClientX(event.clientX);
    };

    const handlePointerUp = () => {
      setIsDraggingChatSplit(false);
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isDraggingChatSplit, updateChatSplitFromClientX]);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    async function initializeWorkspace() {
      try {
        setLoadingProject(true);
        setWorkspaceError(null);

        const response = await authGet(`/api/projects/${projectId}`, user);
        if (!response.ok) {
          throw new Error("Failed to load project");
        }

        const data = await response.json();
        const nextProject: ProjectView = {
          id: data.id,
          projectName: data.projectName || data.name || "Untitled Project",
          description: data.description,
          chatHistory: data.chatHistory || [],
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          latestPrd: data.latestPrd,
        };

        setProject(nextProject);

        if (data.latestPrd?.config) {
          const persisted = normalizePrdConfig(clonePrdConfig(data.latestPrd.config));
          setDraftPrd(persisted);
          setBaselinePrd(clonePrdConfig(persisted));
          setLastSavedAt(data.latestPrd.updatedAt || data.updatedAt);
          return;
        }
        setDraftPrd(null);
        setBaselinePrd(null);
        setLastSavedAt(null);
      } catch (error) {
        console.error("Workspace bootstrap failed:", error);
        setWorkspaceError(error instanceof Error ? error.message : "Failed to load project");
      } finally {
        setLoadingProject(false);
      }
    }

    void initializeWorkspace();
  }, [initialMessage, projectId, user]);

  // Bootstrap the first clarification turn only once for a brand-new project.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!project || draftPrd || hasBootstrappedSeed.current) return;
    if (project.chatHistory.length > 0) return;

    const seedMessage = deriveSeedMessage(project, initialMessage);
    if (!seedMessage) return;

    hasBootstrappedSeed.current = true;
    void handleSendMessage(seedMessage);
  }, [draftPrd, initialMessage, project]);

  function updateDraft(mutator: (draft: PRDConfig) => void) {
    setDraftPrd((previous) => {
      if (!previous) return previous;
      const next = clonePrdConfig(previous);
      mutator(next);
      return next;
    });
    setSaveError(null);
  }

  function openPrdPane() {
    startTransition(() => {
      setMobilePane("prd");
    });
    requestAnimationFrame(() => {
      prdWorkspaceRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function handleChatResizePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    setIsDraggingChatSplit(true);
    updateChatSplitFromClientX(event.clientX);
  }

  function handleChatResizeKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setChatSplitPercent((current) => clampChatSplit(current - 2));
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      setChatSplitPercent((current) => clampChatSplit(current + 2));
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setChatSplitPercent(MIN_CHAT_SPLIT_PERCENT);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      setChatSplitPercent(MAX_CHAT_SPLIT_PERCENT);
    }
  }

  function handleClarificationToggle(question: ClarificationQuestion, optionId: string) {
    setClarificationAnswers((current) => ({
      ...current,
      [question.id]: updateClarificationSelection(question, current[question.id], optionId),
    }));
  }

  function handleClarificationCustomTextChange(questionId: string, value: string) {
    setClarificationAnswers((current) => ({
      ...current,
      [questionId]: updateClarificationCustomText(current[questionId], questionId, value),
    }));
  }

  function handleClarificationContinue() {
    const activeQuestion = clarificationProgress.activeQuestion;
    if (!activeQuestion) return;

    setClarificationAnswers((current) => {
      const answer = completeClarificationAnswer(activeQuestion, current[activeQuestion.id]);
      if (!answer.isComplete) {
        return current;
      }

      return {
        ...current,
        [activeQuestion.id]: answer,
      };
    });
  }

  async function handleSendMessage(customMessage?: string) {
    const isPrePrdConversation = !draftPrd;
    const messageToSend = isPrePrdConversation && clarificationQuestions?.length
      ? buildClarificationAnswerMessage(clarificationQuestions, clarificationAnswers)
      : (customMessage ?? message).trim();

    if (!project || isChatSubmitting) return;
    if (isPrePrdConversation && clarificationQuestions?.length && !isClarificationReady) return;
    if (!messageToSend) return;

    const optimisticUserMessage: ChatMessage = {
      id: createTemporaryMessageId(),
      role: "user",
      content: messageToSend,
      intent: isPrePrdConversation ? "clarification" : "discussion",
      timestamp: new Date().toISOString(),
    };

    try {
      setChatRequestState("submitting");
      setLastSubmittedMessage(messageToSend);
      setLastFailedSubmission(null);
      setProject((prev) =>
        prev
          ? {
              ...prev,
              chatHistory: [...prev.chatHistory, optimisticUserMessage],
            }
          : prev
      );
      setMessage("");
      if (isPrePrdConversation) {
        setClarificationAnswers({});
      }
      setChatError(null);
      setIsStreaming(true);
      setStreamedContent("");
      setThinkingPhase(0);

      const response = isPrePrdConversation
        ? await authPost("/api/generate", user, {
            message: messageToSend,
            projectId,
            context: project.chatHistory,
          })
        : await authPost("/api/enhance-prd", user, {
            prompt: messageToSend,
            projectId,
            currentPrd: normalizePrdConfig(draftPrd),
            context: project.chatHistory,
          });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to get a response from the assistant");
      }

      const persistedUserMessage: ChatMessage = data.userMessage || optimisticUserMessage;
      const assistantMessage: ChatMessage = data.assistantMessage || {
        id: createTemporaryMessageId(),
        role: "assistant",
        content: isPrePrdConversation && data.intent === "clarification" ? JSON.stringify(data) : data.message,
        intent: data.intent,
        proposedChanges: data.proposedChanges,
        timestamp: new Date().toISOString(),
      };

      if (data.intent === "initial" && data.prdConfig) {
        const nextPrd = normalizePrdConfig(clonePrdConfig(data.prdConfig));
        setDraftPrd(nextPrd);
        setBaselinePrd(clonePrdConfig(nextPrd));
        setLastSavedAt(new Date().toISOString());
        startTransition(() => setMobilePane("prd"));
      }

      setProject((prev) => {
        if (!prev) return prev;

        const nextHistory = prev.chatHistory
          .filter((chatMessage) => chatMessage.id !== optimisticUserMessage.id)
          .concat(persistedUserMessage, assistantMessage);

        return {
          ...prev,
          projectName: data.intent === "initial" && data.productName ? data.productName : prev.projectName,
          chatHistory: nextHistory,
          latestPrd:
            data.intent === "initial" && data.prdConfig
              ? buildLocalPrdView(projectId, data.prdConfig)
              : prev.latestPrd,
        };
      });
      setChatRequestState("idle");
    } catch (error) {
      console.error("Chat failed:", error);
      setProject((prev) =>
        prev
          ? {
              ...prev,
              chatHistory: prev.chatHistory.filter((chatMessage) => chatMessage.id !== optimisticUserMessage.id),
            }
          : prev
      );
      setChatRequestState("error");
      setChatError(error instanceof Error ? error.message : "Failed to send message");
      setLastFailedSubmission(messageToSend);
      if (isPrePrdConversation && project.chatHistory.length === 0) {
        hasBootstrappedSeed.current = false;
      }
    } finally {
      setIsStreaming(false);
      setStreamedContent("");
      setThinkingPhase(undefined);
    }
  }

  function handleRetry() {
    const messageToRetry = lastFailedSubmission || lastSubmittedMessage;
    if (!messageToRetry || isChatSubmitting) return;
    void handleSendMessage(messageToRetry);
  }

  function handleApplyProposedChanges(changes: NonNullable<ChatMessage["proposedChanges"]>) {
    if (!draftPrd) {
      setChatError("Draft is unavailable. Reload the project and try again.");
      setChatRequestState("error");
      return;
    }

    if (!canApplyProposal(changes, draftPrd)) {
      const proposalState = getProposalDraftState(changes, draftPrd);
      setChatError(
        proposalState === "applied"
          ? "This proposal is already applied to the draft."
          : "Proposal is stale. Generate a new one."
      );
      setChatRequestState("error");
      return;
    }

    setDraftPrd(normalizePrdConfig(clonePrdConfig(changes.nextPrdConfig)));
    setChatError(null);
    setChatRequestState("idle");
    openPrdPane();
  }

  async function handleSave() {
    if (!project || !normalizedDraft || validationIssues.length > 0) return;

    try {
      setIsSaving(true);
      setSaveError(null);

      const prdResponse = await authPatch(`/api/projects/${projectId}/prd`, user, {
        config: normalizedDraft,
      });
      const prdData = await prdResponse.json();

      if (!prdResponse.ok) {
        throw new Error(prdData.error || "Failed to save the PRD");
      }

      if (project.projectName !== normalizedDraft.metadata.productName.trim()) {
        const renameResponse = await authPatch(`/api/projects/${projectId}`, user, {
          projectName: normalizedDraft.metadata.productName.trim(),
        });

        if (!renameResponse.ok) {
          const renameData = await renameResponse.json();
          throw new Error(renameData.error || "PRD saved, but project name update failed");
        }
      }

      setBaselinePrd(clonePrdConfig(normalizedDraft));
      const savedAt = new Date().toISOString();
      setLastSavedAt(savedAt);
      setProject((previous) =>
        previous
          ? {
              ...previous,
              projectName: normalizedDraft.metadata.productName.trim(),
              latestPrd: buildLocalPrdView(projectId, normalizedDraft),
            }
          : previous
      );
    } catch (error) {
      console.error("Save failed:", error);
      setSaveError(error instanceof Error ? error.message : "Failed to save PRD");
    } finally {
      setIsSaving(false);
    }
  }

  if (loadingProject) {
    return (
      <div className="premium-bg relative flex flex-1 items-center justify-center overflow-hidden px-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(47,143,255,0.12),_transparent_45%),radial-gradient(circle_at_bottom_right,_rgba(240,210,178,0.22),_transparent_35%)]" />
        <div className="relative z-10 max-w-xl rounded-[2rem] border border-[#e4ddd4] bg-white/86 p-10 text-center shadow-[0_40px_90px_-50px_rgba(22,31,49,0.35)]">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-[#edf5ff] text-[#2f8fff]">
            <span className="material-symbols-outlined animate-spin text-3xl">progress_activity</span>
          </div>
          <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
            Loading workspace
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl tracking-tight text-slate-900">
            Syncing project data
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Fetching the latest project state and saved PRD configuration.
          </p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-red-50 text-red-500">
          <span className="material-symbols-outlined text-3xl">error</span>
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Unable to open the PRD workspace</h1>
          <p className="mt-2 text-sm text-slate-500">{workspaceError || "Project data is missing."}</p>
        </div>
      </div>
    );
  }

  const flowCharts = (normalizedDeferredDraft?.flows || []).map((flow, index) => ({
    id: flow.id || `flow-${index}`,
    title: flow.name?.trim() || `Flow ${index + 1}`,
    chart: mapPRDFlowsToMermaid([flow]),
  }));
  const savedLabel = lastSavedAt ? `Saved ${new Date(lastSavedAt).toLocaleString()}` : "Not saved yet";

  const mobileToggleClass = (active: boolean) =>
    `rounded-full px-3 py-1.5 text-sm font-medium transition ${
      active ? "bg-[#2f8fff] text-white shadow-[0_14px_24px_-18px_rgba(47,143,255,0.75)]" : "text-slate-500"
    }`;
  const actionButtonClass =
    "inline-flex items-center gap-2 rounded-full border border-[#d7e4f8] bg-[#edf5ff] px-3 py-2 text-sm font-medium text-[#2f8fff] transition hover:border-[#b8d2f7] hover:bg-[#e2efff]";
  const linkButtonClass = "text-xs font-semibold text-[#2f8fff] transition hover:text-[#1e6dd1]";

  return (
    <div className="relative flex h-full flex-1 flex-col overflow-hidden">
      <header className="border-b border-[#e7dfd5] bg-[#fbf7f1]/75 backdrop-blur-xl">
        <div className="px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Phase 2 Workspace</p>
              <h1 className="mt-3 truncate font-[family-name:var(--font-display)] text-3xl tracking-tight text-slate-900">
                {project.projectName}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                Keep the conversation on the left and shape the full PRD in one unified workspace on the right.
              </p>
            </div>

            <div className="flex flex-col items-start gap-3 lg:items-end">
              <div className="flex items-center gap-2 rounded-full border border-[#e4ddd4] bg-white/86 px-3 py-2 text-xs text-slate-500 shadow-[0_14px_26px_-24px_rgba(22,31,49,0.28)]">
                <span className="material-symbols-outlined text-[16px] text-[#2f8fff]">schedule</span>
                {savedLabel}
              </div>

              <div className="hidden items-center gap-2 rounded-full border border-[#e4ddd4] bg-white/82 px-4 py-2 text-sm text-slate-500 lg:inline-flex">
                <span className="material-symbols-outlined text-[16px] text-[#2f8fff]">web</span>
                Unified PRD workspace
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-full border border-[#e4ddd4] bg-white/86 p-1 lg:hidden">
            <button onClick={() => startTransition(() => setMobilePane("chat"))} className={mobileToggleClass(mobilePane === "chat")}>
              Chat
            </button>
            <button onClick={() => startTransition(() => setMobilePane("prd"))} className={mobileToggleClass(mobilePane === "prd")}>
              PRD
            </button>
          </div>
        </div>
      </header>

      <div ref={desktopWorkspaceRef} className="relative flex min-h-0 flex-1 overflow-hidden">
        <div
          className={`h-full w-full shrink-0 border-r border-[#e7dfd5] bg-[#fcf8f3]/78 lg:flex lg:w-[var(--chat-pane-width)] ${
            mobilePane === "chat" ? "flex" : "hidden"
          }`}
          style={{ "--chat-pane-width": `${chatSplitPercent}%` } as CSSProperties}
        >
          <ChatPanel
            project={project}
            currentPrd={draftPrd}
            isGenerating={isChatSubmitting}
            isStreaming={isStreaming}
            streamedContent={streamedContent}
            thinkingPhase={thinkingPhase}
            generationMode={generationMode}
            message={message}
            error={chatError}
            selectionContext={selectionContext}
            onMessageChange={setMessage}
            onSendMessage={() => {
              void handleSendMessage();
            }}
            onOpenBlueprint={openPrdPane}
            onApplyProposedChanges={(changes) => handleApplyProposedChanges(changes)}
            onClearContext={() => setSelectionContext(null)}
            onQuickAction={(nextMessage) => {
              void handleSendMessage(nextMessage);
            }}
            onRetry={handleRetry}
            clarificationSummaries={clarificationProgress.answeredSummaries}
            activeClarificationQuestion={clarificationProgress.activeQuestion}
            clarificationAnswers={clarificationAnswers}
            onClarificationToggle={handleClarificationToggle}
            onClarificationCustomTextChange={handleClarificationCustomTextChange}
            onClarificationContinue={handleClarificationContinue}
            canContinueClarificationStep={
              clarificationProgress.activeQuestion
                ? canAdvanceClarificationQuestion(
                    clarificationProgress.activeQuestion,
                    clarificationAnswers[clarificationProgress.activeQuestion.id] || createEmptyClarificationAnswer(clarificationProgress.activeQuestion.id)
                  )
                : false
            }
            isClarificationReady={isClarificationReady}
          />
        </div>

        <div
          role="separator"
          aria-label="Resize chat and PRD workspace"
          aria-orientation="vertical"
          aria-valuemin={MIN_CHAT_SPLIT_PERCENT}
          aria-valuemax={MAX_CHAT_SPLIT_PERCENT}
          aria-valuenow={Math.round(chatSplitPercent)}
          tabIndex={0}
          onPointerDown={handleChatResizePointerDown}
          onKeyDown={handleChatResizeKeyDown}
          className="group relative hidden w-4 shrink-0 cursor-col-resize touch-none items-stretch justify-center bg-transparent lg:flex"
        >
          <div className={`absolute inset-y-0 left-1/2 w-3 -translate-x-1/2 rounded-full transition ${isDraggingChatSplit ? "bg-[#2f8fff]/10" : "group-hover:bg-[#2f8fff]/6"}`} />
          <div className={`my-3 w-px rounded-full transition ${isDraggingChatSplit ? "bg-[#2f8fff]" : "bg-[#d6deea] group-hover:bg-[#2f8fff]/70"}`} />
          <div
            className={`absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 rounded-full border border-[#dbe4f0] bg-white/94 px-1.5 py-2 shadow-[0_14px_32px_-24px_rgba(23,34,55,0.3)] transition ${
              isDraggingChatSplit ? "border-[#bfd8ff]" : "group-hover:border-[#bfd8ff]"
            }`}
          >
            <span className="h-1 w-1 rounded-full bg-[#9aa9bd]" />
            <span className="h-1 w-1 rounded-full bg-[#9aa9bd]" />
            <span className="h-1 w-1 rounded-full bg-[#9aa9bd]" />
          </div>
        </div>

        <div
          ref={prdWorkspaceRef}
          className={`min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 ${mobilePane === "chat" ? "hidden" : "block"} lg:block`}
        >
          <div className="mx-auto max-w-5xl space-y-6 pb-32">
            {!normalizedDraft ? (
              <section className="rounded-[2rem] border border-[#e4ddd4] bg-white/88 p-8 shadow-[0_28px_60px_-40px_rgba(29,41,65,0.24)]">
                <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Pre-PRD discovery</p>
                    <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl tracking-tight text-slate-900">
                      Answer one short setup round to unlock the PRD workspace
                    </h2>
                    <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
                      Flowro is collecting one batch of minimum product detail before generating the first PRD. Keep the conversation going on the left. Once the answers are complete, the full editor, diagrams, and summary will appear here automatically.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    <StatChip label="Stage" value="Clarification" />
                    <StatChip label="PRD" value="Pending" />
                  </div>
                </div>

                <div className="mt-8 grid gap-4 lg:grid-cols-3">
                  <PreviewMeta label="Project" value={project.projectName || "Untitled Project"} />
                  <PreviewMeta label="Next step" value="Reply to the questions in chat" />
                  <PreviewMeta label="Workspace" value="Editor activates after PRD generation" />
                </div>
              </section>
            ) : (
              <>
            <section className="rounded-[2rem] border border-[#e4ddd4] bg-white/88 p-6 shadow-[0_28px_60px_-40px_rgba(29,41,65,0.24)]">
              <div className="grid gap-6 lg:grid-cols-[1.7fr_0.8fr]">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Unified PRD</p>
                  <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl tracking-tight text-slate-900">
                    {normalizedDraft?.metadata.productName || "Untitled Project"}
                  </h2>
                  <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
                    {normalizedDraft?.metadata.targetAudience || "No target audience defined."}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <StatChip label="Features" value={String(normalizedDraft?.features.length || 0)} />
                  <StatChip label="Flows" value={String(normalizedDraft?.flows.length || 0)} />
                </div>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-3">
                <PreviewMeta label="Audience" value={normalizedDraft?.metadata.targetAudience || "No audience defined yet."} />
                <PreviewMeta label="Surface" value="Web app" />
                <PreviewMeta label="Design vibe" value={normalizedDraft?.metadata.designVibe || "No design direction defined yet."} />
              </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <SectionFrame eyebrow="Interactions" title="User flow diagrams">
                <div className="space-y-4">
                  {flowCharts.length ? (
                    flowCharts.map((flowChart, index) => (
                      <div key={flowChart.id} className="rounded-[1.5rem] border border-[#ebe4db] bg-[#fcfaf7] p-4">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Diagram {index + 1}</p>
                            <h3 className="mt-1 text-base font-semibold text-slate-900">{flowChart.title}</h3>
                          </div>
                        </div>
                        <MermaidRenderer chart={flowChart.chart} title={flowChart.title} />
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[1.5rem] border border-dashed border-[#d9d1c6] bg-[#faf8f4] p-6 text-sm text-slate-500">
                      No flow diagrams yet.
                    </div>
                  )}
                </div>
              </SectionFrame>

              <section className="rounded-[2rem] border border-[#e4ddd4] bg-white/88 p-6 shadow-[0_28px_60px_-40px_rgba(29,41,65,0.24)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Workspace tools</p>
                <h3 className="mt-3 text-xl font-semibold text-slate-900">Everything in one PRD view</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Edit the product framing, features, and flows in one place. Database schema stays internal and is not shown in the workspace.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  {PRD_SECTIONS.map((section) => {
                    const hasIssue = Boolean(getSectionIssue(validationIssues, section.issuePath));
                    return (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => document.getElementById(section.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition ${
                          hasIssue
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : "border-[#e4ddd4] bg-[#faf8f4] text-slate-600 hover:border-[#bfd8ff] hover:text-slate-900"
                        }`}
                      >
                        {section.label}
                        {hasIssue ? <span className="h-2 w-2 rounded-full bg-amber-500" /> : null}
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>

            <SectionFrame id="framing" eyebrow="Metadata" title="Product framing">
              <div className="grid gap-6">
                <div>
                  <PanelLabel label="Product name" hint="Used for the project label and summary" />
                  <InputField
                    value={draftPrd!.metadata.productName}
                    onChange={(event) => updateDraft((draft) => { draft.metadata.productName = event.target.value; })}
                    placeholder="Task Orbit"
                  />
                  <FieldError message={getIssue(validationIssues, "metadata.productName")} />
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <div>
                    <PanelLabel label="Target audience" />
                    <TextAreaField
                      value={draftPrd!.metadata.targetAudience}
                      onChange={(event) => updateDraft((draft) => { draft.metadata.targetAudience = event.target.value; })}
                      rows={4}
                      placeholder="Product teams coordinating weekly planning"
                    />
                    <FieldError message={getIssue(validationIssues, "metadata.targetAudience")} />
                  </div>

                  <div>
                    <PanelLabel label="Design vibe" />
                    <TextAreaField
                      value={draftPrd!.metadata.designVibe}
                      onChange={(event) => updateDraft((draft) => { draft.metadata.designVibe = event.target.value; })}
                      rows={4}
                      placeholder="Focused, calm, and data-dense"
                    />
                    <FieldError message={getIssue(validationIssues, "metadata.designVibe")} />
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-[#d9e3ef] bg-[#f8fbff] px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Platform</p>
                  <p className="mt-2 text-sm font-medium text-slate-900">Web only</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Flowro now keeps this PRD focused on a single web experience. Mobile platforms are not shown in the workspace.
                  </p>
                </div>
              </div>
            </SectionFrame>

            <SectionFrame
              id="features"
              eyebrow="Requirements"
              title="Shippable features"
              action={
                <button type="button" onClick={() => updateDraft((draft) => { draft.features.push(createEmptyFeature()); })} className={actionButtonClass}>
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  Add feature
                </button>
              }
            >
              <div className="space-y-6 text-sm text-slate-600">
                {draftPrd!.features.length === 0 ? (
                  <p className="rounded-[1.75rem] border border-dashed border-[#d9d1c6] bg-[#faf8f4] py-8 text-center">No features defined yet. Use the chat to brainstorm.</p>
                ) : (
                  <div className="space-y-5">
                    {draftPrd!.features.map((feature, featureIndex) => (
                      <div key={feature.id} className="rounded-[1.75rem] border border-[#ebe4db] bg-[#fcfaf7] p-5">
                        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="flex size-9 items-center justify-center rounded-full bg-[#edf5ff] text-xs font-bold text-[#2f8fff]">
                              {featureIndex + 1}
                            </div>
                            <h4 className="text-base font-semibold text-slate-900">{feature.title || "New Feature"}</h4>
                          </div>
                          <button
                            type="button"
                            onClick={() => updateDraft((draft) => { draft.features.splice(featureIndex, 1); })}
                            className="rounded-full p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>

                        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr_1fr]">
                          <div>
                            <PanelLabel label="Feature title" />
                            <InputField
                              value={feature.title}
                              onChange={(event) => updateDraft((draft) => { draft.features[featureIndex].title = event.target.value; })}
                              placeholder="e.g., Real-time collaboration"
                            />
                          </div>
                          <div>
                            <PanelLabel label="Priority" />
                            <SelectField
                              value={feature.priority}
                              onChange={(event) => updateDraft((draft) => { draft.features[featureIndex].priority = event.target.value as typeof feature.priority; })}
                            >
                              <option value="must">Must Have</option>
                              <option value="should">Should Have</option>
                              <option value="could">Could Have</option>
                            </SelectField>
                          </div>
                          <div>
                            <PanelLabel label="Release scope" />
                            <SelectField
                              value={feature.scope}
                              onChange={(event) => updateDraft((draft) => { draft.features[featureIndex].scope = event.target.value as typeof feature.scope; })}
                            >
                              <option value="mvp">MVP</option>
                              <option value="later">V2 / Later</option>
                            </SelectField>
                          </div>
                        </div>

                        <div className="mt-6">
                          <PanelLabel label="Functional description" />
                          <TextAreaField
                            value={feature.description}
                            onChange={(event) => updateDraft((draft) => { draft.features[featureIndex].description = event.target.value; })}
                            rows={3}
                            className="resize-none"
                            placeholder="Describe what the user can do with this feature..."
                          />
                        </div>

                        <div className="mt-6">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <PanelLabel label="Acceptance criteria" hint="Definition of done" />
                            <button
                              type="button"
                              onClick={() => updateDraft((draft) => { draft.features[featureIndex].acceptanceCriteria.push(""); })}
                              className={linkButtonClass}
                            >
                              + Add criterion
                            </button>
                          </div>
                          <div className="space-y-3">
                            {feature.acceptanceCriteria.map((criterion, criterionIndex) => (
                              <div key={criterionIndex} className="flex gap-3">
                                <InputField
                                  value={criterion}
                                  onChange={(event) => updateDraft((draft) => { draft.features[featureIndex].acceptanceCriteria[criterionIndex] = event.target.value; })}
                                  placeholder="e.g., User can see changes live across devices."
                                />
                                <button
                                  onClick={() => updateDraft((draft) => { draft.features[featureIndex].acceptanceCriteria.splice(criterionIndex, 1); })}
                                  className="shrink-0 rounded-full p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                                >
                                  <span className="material-symbols-outlined text-[18px]">close</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </SectionFrame>

            <SectionFrame
              id="flows"
              eyebrow="Flows"
              title="User journeys"
              action={
                <button type="button" onClick={() => updateDraft((draft) => { draft.flows.push(createEmptyFlow()); })} className={actionButtonClass}>
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  Add flow
                </button>
              }
            >
              <div className="space-y-6">
                {draftPrd!.flows.length === 0 ? (
                  <p className="rounded-[1.75rem] border border-dashed border-[#d9d1c6] bg-[#faf8f4] py-8 text-center text-sm text-slate-500">No flows defined yet.</p>
                ) : (
                  <div className="space-y-5">
                    {draftPrd!.flows.map((flow, flowIndex) => (
                      <div key={flow.id} className="rounded-[1.75rem] border border-[#ebe4db] bg-[#fcfaf7] p-5">
                        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                          <div className="flex-1">
                            <PanelLabel label="Flow name" />
                            <InputField
                              value={flow.name}
                              onChange={(event) => updateDraft((draft) => { draft.flows[flowIndex].name = event.target.value; })}
                              placeholder="e.g., Onboarding Flow"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => updateDraft((draft) => { draft.flows.splice(flowIndex, 1); })}
                            className="mt-8 rounded-full p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <PanelLabel label="Steps" />
                            <button
                              type="button"
                              onClick={() => updateDraft((draft) => { draft.flows[flowIndex].steps.push(createEmptyFlowStep()); })}
                              className={linkButtonClass}
                            >
                              + Add step
                            </button>
                          </div>
                          <div className="space-y-4">
                            {flow.steps.map((step, stepIndex) => (
                              <div key={step.id} className="grid gap-3 rounded-[1.25rem] border border-[#ece5db] bg-white px-3 py-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
                                <InputField
                                  value={step.screen}
                                  onChange={(event) => updateDraft((draft) => { draft.flows[flowIndex].steps[stepIndex].screen = event.target.value; })}
                                  placeholder="Screen"
                                />
                                <InputField
                                  value={step.action}
                                  onChange={(event) => updateDraft((draft) => { draft.flows[flowIndex].steps[stepIndex].action = event.target.value; })}
                                  placeholder="Action"
                                />
                                <InputField
                                  value={step.outcome || ""}
                                  onChange={(event) => updateDraft((draft) => { draft.flows[flowIndex].steps[stepIndex].outcome = event.target.value; })}
                                  placeholder="Outcome"
                                />
                                <button
                                  onClick={() => updateDraft((draft) => { draft.flows[flowIndex].steps.splice(stepIndex, 1); })}
                                  className="rounded-full p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                                >
                                  <span className="material-symbols-outlined text-[18px]">close</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </SectionFrame>

            <section className="rounded-[2rem] border border-[#e4ddd4] bg-white/88 p-6 shadow-[0_28px_60px_-40px_rgba(29,41,65,0.24)]">
              <h3 className="text-xl font-semibold text-slate-900">Product summary</h3>
              <div className="mt-6 grid gap-8 lg:grid-cols-2">
                <div>
                  <h4 className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Key capabilities</h4>
                  <div className="mt-4 space-y-3">
                    {normalizedDraft?.features.length ? (
                      normalizedDraft.features.map((feature) => (
                        <div key={feature.id} className="rounded-[1.5rem] border border-[#ebe4db] bg-[#fcfaf7] p-4">
                          <div className="flex items-start justify-between gap-4">
                            <p className="font-medium text-slate-900">{feature.title}</p>
                            <span className="rounded-full bg-[#edf5ff] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#2f8fff]">
                              {feature.priority}
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-600">{feature.description || "No description added yet."}</p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[1.5rem] border border-dashed border-[#d9d1c6] bg-[#faf8f4] p-6 text-sm text-slate-500">
                        No feature summary yet.
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Critical paths</h4>
                  <div className="mt-4 space-y-3">
                    {normalizedDraft?.flows.length ? (
                      normalizedDraft.flows.map((flow) => (
                        <div key={flow.id} className="rounded-[1.5rem] border border-[#ebe4db] bg-[#fcfaf7] p-4">
                          <p className="font-medium text-slate-900">{flow.name}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {flow.steps.length ? (
                              flow.steps.map((step, index) => (
                                <div key={step.id} className="inline-flex items-center gap-2 rounded-full border border-[#d9e2ef] bg-white px-3 py-1.5 text-xs text-slate-600">
                                  <span className="font-semibold text-[#2f8fff]">{index + 1}</span>
                                  {step.screen || "Untitled step"}
                                </div>
                              ))
                            ) : (
                              <span className="text-sm text-slate-500">No steps added yet.</span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[1.5rem] border border-dashed border-[#d9d1c6] bg-[#faf8f4] p-6 text-sm text-slate-500">
                        No flow summary yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
              </>
            )}
          </div>
        </div>

        {normalizedDraft && isDirty ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-4 sm:px-6">
            <div className="pointer-events-auto flex w-full max-w-4xl flex-col gap-4 rounded-[1.75rem] border border-[#e4ddd4] bg-white/92 px-4 py-4 shadow-[0_34px_80px_-44px_rgba(29,41,65,0.3)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900">Draft has unsaved changes</p>
                <p className="mt-1 text-xs text-slate-500">
                  {validationIssues.length > 0
                    ? `${validationIssues.length} validation issue${validationIssues.length === 1 ? "" : "s"} must be resolved before saving.`
                    : "Save the draft to persist metadata, diagrams, and summary updates."}
                </p>
                {saveError ? <p className="mt-2 text-xs text-red-500">{saveError}</p> : null}
              </div>
              <button
                onClick={() => void handleSave()}
                disabled={isSaving || validationIssues.length > 0}
                className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition ${
                  isSaving || validationIssues.length > 0
                    ? "cursor-not-allowed bg-slate-200 text-slate-500"
                    : "bg-[#2f8fff] text-white shadow-[0_18px_28px_-18px_rgba(47,143,255,0.6)] hover:bg-[#267ce6]"
                }`}
              >
                <span className={`material-symbols-outlined text-[18px] ${isSaving ? "animate-spin" : ""}`}>
                  {isSaving ? "progress_activity" : "save"}
                </span>
                {isSaving ? "Saving..." : "Save draft"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
