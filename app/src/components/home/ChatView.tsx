"use client";

import { startTransition, useDeferredValue, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { User } from "firebase/auth";
import { authGet, authPatch, authPost } from "@/lib/authFetch";
import type { ProjectView, PRDView } from "@/lib/types/views";
import type { PRDConfig, PRDPlatform } from "@/lib/prd/schema";
import {
  clonePrdConfig,
  createEmptyFeature,
  createEmptyFlow,
  createEmptyFlowStep,
  createEmptyPrdConfig,
  normalizePrdConfig,
  validatePrdDraft,
  type PRDEditorValidationIssue,
} from "@/lib/prd/editor";
import { mapPRDEntitiesToMermaid, mapPRDFlowsToMermaid } from "@/lib/prd/mermaid";
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

const PLATFORM_OPTIONS: Array<{ label: string; value: PRDPlatform; icon: string }> = [
  { label: "Web", value: "web", icon: "language" },
  { label: "iOS", value: "ios", icon: "phone_iphone" },
  { label: "Android", value: "android", icon: "smartphone" },
];

const EDITOR_SECTIONS = [
  { id: "framing", label: "Framing", issuePath: "metadata" },
  { id: "features", label: "Features", issuePath: "features" },
  { id: "data", label: "Data", issuePath: "entities" },
  { id: "flows", label: "Flows", issuePath: "flows" },
] as const;

function buildLocalPrdView(projectId: string, prdConfig: PRDConfig): PRDView {
  return {
    id: projectId,
    projectId,
    config: prdConfig,
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
  const [isGeneratingPrd, setIsGeneratingPrd] = useState(false);
  const [draftPrd, setDraftPrd] = useState<PRDConfig | null>(null);
  const [baselinePrd, setBaselinePrd] = useState<PRDConfig | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [mobilePane, setMobilePane] = useState<"chat" | "editor" | "preview">("chat");
  const [desktopPane, setDesktopPane] = useState<"editor" | "preview">("editor");
  const [message, setMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState("");
  const [thinkingPhase, setThinkingPhase] = useState<number | undefined>();
  const [selectionContext, setSelectionContext] = useState<SelectionContext | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const hasInitialized = useRef(false);

  const deferredDraft = useDeferredValue(draftPrd);
  const normalizedDraft = draftPrd ? normalizePrdConfig(draftPrd) : null;
  const normalizedDeferredDraft = deferredDraft ? normalizePrdConfig(deferredDraft) : null;
  const validationIssues = validatePrdDraft(draftPrd);
  const draftSnapshot = normalizedDraft ? JSON.stringify(normalizedDraft) : "";
  const baselineSnapshot = baselinePrd ? JSON.stringify(normalizePrdConfig(baselinePrd)) : "";
  const isDirty = draftSnapshot !== baselineSnapshot;
  const generationMode = "chat" as const;

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
          const persisted = clonePrdConfig(data.latestPrd.config);
          setDraftPrd(persisted);
          setBaselinePrd(clonePrdConfig(data.latestPrd.config));
          setLastSavedAt(data.latestPrd.updatedAt || data.updatedAt);
          return;
        }

        const seedMessage = deriveSeedMessage(nextProject, initialMessage);
        if (seedMessage) {
          await generateInitialPrd(nextProject, seedMessage);
          return;
        }

        const fallback = createEmptyPrdConfig(nextProject.projectName);
        setDraftPrd(fallback);
        setBaselinePrd(null);
      } catch (error) {
        console.error("Workspace bootstrap failed:", error);
        setWorkspaceError(error instanceof Error ? error.message : "Failed to load project");
      } finally {
        setLoadingProject(false);
      }
    }

    async function generateInitialPrd(nextProject: ProjectView, seedMessage: string) {
      try {
        setIsGeneratingPrd(true);
        const response = await authPost("/api/generate", user, {
          message: seedMessage,
          projectId,
          context: nextProject.chatHistory,
        });

        const data = await response.json();
        if (!response.ok || !data.prdConfig) {
          throw new Error(data.error || "Failed to generate the initial PRD");
        }

        const nextPrd = clonePrdConfig(data.prdConfig);
        setDraftPrd(nextPrd);
        setBaselinePrd(clonePrdConfig(data.prdConfig));
        setLastSavedAt(new Date().toISOString());
        setProject((prev) =>
          prev
            ? {
                ...prev,
                projectName: data.productName || prev.projectName,
                latestPrd: buildLocalPrdView(projectId, data.prdConfig),
              }
            : prev
        );
      } catch (error) {
        console.error("Initial PRD generation failed:", error);
        setWorkspaceError(error instanceof Error ? error.message : "Failed to generate the initial PRD");
        setDraftPrd(createEmptyPrdConfig(nextProject.projectName));
        setBaselinePrd(null);
      } finally {
        setIsGeneratingPrd(false);
      }
    }

    void initializeWorkspace();
  }, [initialMessage, projectId, user]);

  function updateDraft(mutator: (draft: PRDConfig) => void) {
    setDraftPrd((previous) => {
      if (!previous) return previous;
      const next = clonePrdConfig(previous);
      mutator(next);
      return next;
    });
    setSaveError(null);
  }

  async function handleSendMessage(customMessage?: string) {
    const messageToSend = customMessage || message;
    if (!messageToSend.trim() || !project) return;

    try {
      const userMessage: ChatMessage = {
        role: "user",
        content: messageToSend,
        intent: "discussion",
        timestamp: new Date().toISOString(),
      };

      setProject((prev) =>
        prev
          ? {
              ...prev,
              chatHistory: [...prev.chatHistory, userMessage],
            }
          : prev
      );
      setMessage("");
      setChatError(null);
      setIsStreaming(true);
      setStreamedContent("");
      setThinkingPhase(0);

      const response = await authPost("/api/generate", user, {
        message: messageToSend,
        projectId,
        context: project.chatHistory,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to get a response from the assistant");
      }

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: data.message,
        intent: data.intent,
        timestamp: new Date().toISOString(),
      };

      setProject((prev) =>
        prev
          ? {
              ...prev,
              chatHistory: [...prev.chatHistory, assistantMessage],
              ...(data.prdConfig ? { latestPrd: buildLocalPrdView(projectId, data.prdConfig) } : {}),
              ...(data.productName ? { projectName: data.productName } : {}),
            }
          : prev
      );

      if (data.prdConfig) {
        setDraftPrd(clonePrdConfig(data.prdConfig));
      }
    } catch (error) {
      console.error("Chat failed:", error);
      setChatError(error instanceof Error ? error.message : "Failed to send message");
    } finally {
      setIsStreaming(false);
      setStreamedContent("");
      setThinkingPhase(undefined);
    }
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

  if (loadingProject || isGeneratingPrd) {
    return (
      <div className="premium-bg relative flex flex-1 items-center justify-center overflow-hidden px-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(47,143,255,0.12),_transparent_45%),radial-gradient(circle_at_bottom_right,_rgba(240,210,178,0.22),_transparent_35%)]" />
        <div className="relative z-10 max-w-xl rounded-[2rem] border border-[#e4ddd4] bg-white/86 p-10 text-center shadow-[0_40px_90px_-50px_rgba(22,31,49,0.35)]">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-[#edf5ff] text-[#2f8fff]">
            <span className="material-symbols-outlined animate-spin text-3xl">progress_activity</span>
          </div>
          <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
            {loadingProject ? "Loading workspace" : "Generating PRD"}
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl tracking-tight text-slate-900">
            {loadingProject ? "Syncing project data" : "Building your PRD workspace"}
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            {loadingProject
              ? "Fetching the latest project state and saved PRD configuration."
              : "Creating the first structured PRD so the editor, diagrams, and summary can stay in sync."}
          </p>
        </div>
      </div>
    );
  }

  if (!project || !draftPrd) {
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

  const flowChart = mapPRDFlowsToMermaid(normalizedDeferredDraft?.flows || []);
  const entityChart = mapPRDEntitiesToMermaid(normalizedDeferredDraft?.entities || []);
  const savedLabel = lastSavedAt ? `Saved ${new Date(lastSavedAt).toLocaleString()}` : "Not saved yet";

  const desktopToggleClass = (active: boolean) =>
    `rounded-full px-4 py-2 text-sm font-medium transition ${
      active ? "bg-[#2f8fff] text-white shadow-[0_14px_24px_-18px_rgba(47,143,255,0.75)]" : "text-slate-500 hover:text-slate-800"
    }`;
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
                Keep the conversation on the left and shape the structured PRD in a focused editor or preview canvas.
              </p>
            </div>

            <div className="flex flex-col items-start gap-3 lg:items-end">
              <div className="flex items-center gap-2 rounded-full border border-[#e4ddd4] bg-white/86 px-3 py-2 text-xs text-slate-500 shadow-[0_14px_26px_-24px_rgba(22,31,49,0.28)]">
                <span className="material-symbols-outlined text-[16px] text-[#2f8fff]">schedule</span>
                {savedLabel}
              </div>

              <div className="hidden items-center gap-2 rounded-full border border-[#e4ddd4] bg-white/82 p-1 lg:inline-flex">
                <button onClick={() => startTransition(() => setDesktopPane("editor"))} className={desktopToggleClass(desktopPane === "editor")}>
                  Editor
                </button>
                <button onClick={() => startTransition(() => setDesktopPane("preview"))} className={desktopToggleClass(desktopPane === "preview")}>
                  Preview
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-full border border-[#e4ddd4] bg-white/86 p-1 lg:hidden">
            <button onClick={() => startTransition(() => setMobilePane("chat"))} className={mobileToggleClass(mobilePane === "chat")}>
              Chat
            </button>
            <button onClick={() => startTransition(() => setMobilePane("editor"))} className={mobileToggleClass(mobilePane === "editor")}>
              Editor
            </button>
            <button onClick={() => startTransition(() => setMobilePane("preview"))} className={mobileToggleClass(mobilePane === "preview")}>
              Preview
            </button>
          </div>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <div
          className={`h-full w-full shrink-0 border-r border-[#e7dfd5] bg-[#fcf8f3]/78 lg:flex lg:w-[390px] xl:w-[420px] ${
            mobilePane === "chat" ? "flex" : "hidden"
          }`}
        >
          <ChatPanel
            project={project}
            currentPrd={draftPrd}
            isGenerating={isGeneratingPrd}
            isStreaming={isStreaming}
            streamedContent={streamedContent}
            thinkingPhase={thinkingPhase}
            generationMode={generationMode}
            message={message}
            error={chatError}
            selectionContext={selectionContext}
            onMessageChange={setMessage}
            onSendMessage={() => handleSendMessage()}
            onOpenBlueprint={() => {}}
            onApplyProposedChanges={() => {}}
            onClearContext={() => setSelectionContext(null)}
            onQuickAction={(nextMessage) => handleSendMessage(nextMessage)}
            onRetry={() => handleSendMessage()}
          />
        </div>

        <div className={`min-h-0 flex-1 overflow-hidden ${mobilePane === "chat" ? "hidden" : "flex"} lg:flex`}>
          <div className={`min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 ${mobilePane === "editor" ? "block" : "hidden"} ${desktopPane === "editor" ? "lg:block" : "lg:hidden"}`}>
            <div className="mx-auto max-w-5xl space-y-6 pb-32">
              <section className="rounded-[2rem] border border-[#e4ddd4] bg-white/80 p-5 shadow-[0_24px_56px_-38px_rgba(29,41,65,0.24)]">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Editor</p>
                    <h2 className="mt-2 text-xl font-semibold text-slate-900">Organize the PRD into clear sections</h2>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      Edit structured product data without crowding diagrams, summaries, and forms into one view.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {EDITOR_SECTIONS.map((section) => {
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
                </div>
              </section>

              <SectionFrame id="framing" eyebrow="Metadata" title="Product framing">
                <div className="grid gap-6">
                  <div>
                    <PanelLabel label="Product name" hint="Used for the project label and summary" />
                    <InputField
                      value={draftPrd.metadata.productName}
                      onChange={(event) => updateDraft((draft) => { draft.metadata.productName = event.target.value; })}
                      placeholder="Task Orbit"
                    />
                    <FieldError message={getIssue(validationIssues, "metadata.productName")} />
                  </div>

                  <div className="grid gap-6 lg:grid-cols-2">
                    <div>
                      <PanelLabel label="Target audience" />
                      <TextAreaField
                        value={draftPrd.metadata.targetAudience}
                        onChange={(event) => updateDraft((draft) => { draft.metadata.targetAudience = event.target.value; })}
                        rows={4}
                        placeholder="Product teams coordinating weekly planning"
                      />
                      <FieldError message={getIssue(validationIssues, "metadata.targetAudience")} />
                    </div>

                    <div>
                      <PanelLabel label="Design vibe" />
                      <TextAreaField
                        value={draftPrd.metadata.designVibe}
                        onChange={(event) => updateDraft((draft) => { draft.metadata.designVibe = event.target.value; })}
                        rows={4}
                        placeholder="Focused, calm, and data-dense"
                      />
                      <FieldError message={getIssue(validationIssues, "metadata.designVibe")} />
                    </div>
                  </div>

                  <div>
                    <PanelLabel label="Platforms" hint="At least one platform is required" />
                    <div className="flex flex-wrap gap-3">
                      {PLATFORM_OPTIONS.map((platform) => {
                        const isActive = draftPrd.metadata.platforms.includes(platform.value);
                        return (
                          <button
                            key={platform.value}
                            type="button"
                            onClick={() =>
                              updateDraft((draft) => {
                                const hasPlatform = draft.metadata.platforms.includes(platform.value);
                                draft.metadata.platforms = hasPlatform
                                  ? draft.metadata.platforms.filter((value) => value !== platform.value)
                                  : [...draft.metadata.platforms, platform.value];
                              })
                            }
                            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${
                              isActive
                                ? "border-[#b9d4ff] bg-[#edf5ff] text-[#1f5fb3]"
                                : "border-[#e4ddd4] bg-[#faf8f4] text-slate-500 hover:border-[#bfd8ff] hover:text-slate-800"
                            }`}
                          >
                            <span className="material-symbols-outlined text-[18px]">{platform.icon}</span>
                            {platform.label}
                          </button>
                        );
                      })}
                    </div>
                    <FieldError message={getIssue(validationIssues, "metadata.platforms")} />
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
                  {draftPrd.features.length === 0 ? (
                    <p className="rounded-[1.75rem] border border-dashed border-[#d9d1c6] bg-[#faf8f4] py-8 text-center">No features defined yet. Use the chat to brainstorm.</p>
                  ) : (
                    <div className="space-y-5">
                      {draftPrd.features.map((feature, featureIndex) => (
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
                id="data"
                eyebrow="Architecture"
                title="Data schema"
                action={
                  <button
                    type="button"
                    onClick={() =>
                      updateDraft((draft) => {
                        draft.entities.push({
                          name: "",
                          description: "",
                          fields: [{ name: "", type: "", required: true, relationshipTo: "" }],
                        });
                      })
                    }
                    className={actionButtonClass}
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    Add entity
                  </button>
                }
              >
                <div className="space-y-6">
                  {draftPrd.entities.length === 0 ? (
                    <p className="rounded-[1.75rem] border border-dashed border-[#d9d1c6] bg-[#faf8f4] py-8 text-center text-sm text-slate-500">No entities defined. Use the chat to model your data.</p>
                  ) : (
                    <div className="space-y-5">
                      {draftPrd.entities.map((entity, entityIndex) => (
                        <div key={entityIndex} className="rounded-[1.75rem] border border-[#ebe4db] bg-[#fcfaf7] p-5">
                          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                            <div className="flex-1">
                              <PanelLabel label="Entity name" />
                              <InputField
                                value={entity.name}
                                onChange={(event) => updateDraft((draft) => { draft.entities[entityIndex].name = event.target.value; })}
                                placeholder="e.g., Workspace"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => updateDraft((draft) => { draft.entities.splice(entityIndex, 1); })}
                              className="mt-8 rounded-full p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>

                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <PanelLabel label="Fields" />
                              <button
                                type="button"
                                onClick={() =>
                                  updateDraft((draft) => {
                                    draft.entities[entityIndex].fields.push({
                                      name: "",
                                      type: "",
                                      required: false,
                                      relationshipTo: "",
                                    });
                                  })
                                }
                                className={linkButtonClass}
                              >
                                + Add field
                              </button>
                            </div>
                            <div className="grid gap-3">
                              {entity.fields.map((field, fieldIndex) => (
                                <div key={fieldIndex} className="grid gap-3 rounded-[1.25rem] border border-[#ece5db] bg-white px-3 py-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
                                  <InputField
                                    value={field.name}
                                    onChange={(event) => updateDraft((draft) => { draft.entities[entityIndex].fields[fieldIndex].name = event.target.value; })}
                                    placeholder="Field name"
                                  />
                                  <InputField
                                    value={field.type}
                                    onChange={(event) => updateDraft((draft) => { draft.entities[entityIndex].fields[fieldIndex].type = event.target.value; })}
                                    placeholder="Type (e.g., UUID)"
                                  />
                                  <SelectField
                                    value={field.relationshipTo || ""}
                                    onChange={(event) => updateDraft((draft) => { draft.entities[entityIndex].fields[fieldIndex].relationshipTo = event.target.value; })}
                                  >
                                    <option value="">No relation</option>
                                    {draftPrd.entities.filter((existingEntity) => existingEntity.name && existingEntity.name !== entity.name).map((existingEntity) => (
                                      <option key={existingEntity.name} value={existingEntity.name}>
                                        Relates to {existingEntity.name}
                                      </option>
                                    ))}
                                  </SelectField>
                                  <button
                                    onClick={() => updateDraft((draft) => { draft.entities[entityIndex].fields.splice(fieldIndex, 1); })}
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
                  {draftPrd.flows.length === 0 ? (
                    <p className="rounded-[1.75rem] border border-dashed border-[#d9d1c6] bg-[#faf8f4] py-8 text-center text-sm text-slate-500">No flows defined yet.</p>
                  ) : (
                    <div className="space-y-5">
                      {draftPrd.flows.map((flow, flowIndex) => (
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
            </div>
          </div>

          <div className={`min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 ${mobilePane === "preview" ? "block" : "hidden"} ${desktopPane === "preview" ? "lg:block" : "lg:hidden"}`}>
            <div className="mx-auto max-w-5xl space-y-6 pb-32">
              <section className="rounded-[2rem] border border-[#e4ddd4] bg-white/88 p-6 shadow-[0_28px_60px_-40px_rgba(29,41,65,0.24)]">
                <div className="grid gap-6 lg:grid-cols-[1.7fr_0.8fr]">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Live product summary</p>
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
                  <PreviewMeta
                    label="Platforms"
                    value={normalizedDraft?.metadata.platforms.length ? normalizedDraft.metadata.platforms.join(", ") : "No platform selected."}
                  />
                  <PreviewMeta label="Design vibe" value={normalizedDraft?.metadata.designVibe || "No design direction defined yet."} />
                </div>
              </section>

              <div className="grid gap-6 xl:grid-cols-2">
                <SectionFrame eyebrow="Interactions" title="User flow diagram">
                  <div className="rounded-[1.5rem] border border-[#ebe4db] bg-[#fcfaf7] p-4">
                    <MermaidRenderer chart={flowChart} title="User Flow" />
                  </div>
                </SectionFrame>

                <SectionFrame eyebrow="Data architecture" title="Entity relationship diagram">
                  <div className="rounded-[1.5rem] border border-[#ebe4db] bg-[#fcfaf7] p-4">
                    <MermaidRenderer chart={entityChart} title="Data Model" />
                  </div>
                </SectionFrame>
              </div>

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
            </div>
          </div>
        </div>

        {isDirty ? (
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
