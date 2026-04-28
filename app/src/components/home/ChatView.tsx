"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react"
import type { User } from "firebase/auth"
import { authFetch, authGet, authPost } from "@/lib/authFetch"
import type { BuildRun, DesignArtifact } from "@/lib/project-plan/schema"
import type { ClarificationAnswerState, ProjectView } from "@/lib/types/views"
import { getLatestClarificationResponse, type ClarificationQuestion } from "@/lib/prd/schema"
import {
  buildClarificationAnswerMessage,
  canAdvanceClarificationQuestion,
  completeClarificationAnswer,
  createEmptyClarificationAnswer,
  getClarificationProgress,
  normalizeClarificationAnswers,
  updateClarificationCustomText,
  updateClarificationSelection,
} from "@/lib/clarificationFlow"
import { ChatPanel } from "@/components/chat"
import type { ChatMessage, SelectionContext } from "@/components/chat/types"

interface ChatViewProps {
  projectId: string
  initialMessage: string
  user: User
  onBack: () => void
  isExisting?: boolean
}

type PlanView = NonNullable<ProjectView["latestPlan"]>

const DEFAULT_CHAT_SPLIT_PERCENT = 34
const MIN_CHAT_SPLIT_PERCENT = 26
const MAX_CHAT_SPLIT_PERCENT = 48
const CHAT_SPLIT_STORAGE_KEY = "flowro_builder_chat_split"

function clampChatSplit(percent: number) {
  return Math.min(MAX_CHAT_SPLIT_PERCENT, Math.max(MIN_CHAT_SPLIT_PERCENT, percent))
}

function createTemporaryMessageId() {
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function deriveSeedMessage(project: ProjectView, initialMessage: string): string {
  const trimmedInitial = initialMessage.trim()
  if (trimmedInitial) return trimmedInitial

  const latestUserMessage = [...project.chatHistory]
    .reverse()
    .find((message) => message.role === "user" && message.content.trim())

  return latestUserMessage?.content.trim() || project.description?.trim() || project.projectName.trim()
}

function StatusPill({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] ${
        active ? "border-[#2f8fff] bg-[#edf5ff] text-[#2f8fff]" : "border-[#e4ddd4] bg-white/70 text-slate-400"
      }`}
    >
      {label}
    </span>
  )
}

function PanelShell({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-[1.75rem] border border-[#e4ddd4] bg-white/90 p-6 shadow-[0_28px_60px_-44px_rgba(29,41,65,0.26)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  )
}

function ActionButton({
  children,
  onClick,
  disabled,
  tone = "primary",
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  tone?: "primary" | "secondary"
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
        tone === "primary"
          ? "bg-[#2f8fff] text-white shadow-[0_18px_30px_-22px_rgba(47,143,255,0.8)] hover:bg-[#1f7fe8]"
          : "border border-[#d7e4f8] bg-[#edf5ff] text-[#2f8fff] hover:bg-[#e2efff]"
      }`}
    >
      {children}
    </button>
  )
}

function ScreenPreviewModal({
  artifact,
  imageSrc,
  onClose,
}: {
  artifact: DesignArtifact
  imageSrc: string | null
  onClose: () => void
}) {
  const [zoom, setZoom] = useState(1)
  const previewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
      if (e.key === "=" || e.key === "+") setZoom((z) => Math.min(z + 0.25, 3))
      if (e.key === "-") setZoom((z) => Math.max(z - 0.25, 0.25))
      if (e.key === "0") setZoom(1)
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setZoom((z) => Math.min(Math.max(z + delta, 0.25), 3))
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative mx-4 max-h-[90vh] max-w-[90vw] overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e4ddd4] bg-white px-4 py-3">
          <div>
            <p className="font-semibold text-slate-900">{artifact.name}</p>
            <p className="text-xs text-slate-500">{artifact.status === "approved" ? "Approved" : "Generated screen"}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoom((z) => Math.max(z - 0.25, 0.25))}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e4ddd4] text-slate-600 hover:bg-[#f5f5f5]"
              title="Zoom out (-)"
            >
              <span className="material-symbols-outlined text-[18px]">remove</span>
            </button>
            <span className="w-12 text-center text-xs font-mono text-slate-500">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e4ddd4] text-slate-600 hover:bg-[#f5f5f5]"
              title="Zoom in (+)"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
            </button>
            <button
              onClick={() => setZoom(1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e4ddd4] text-slate-600 hover:bg-[#f5f5f5]"
              title="Reset zoom (0)"
            >
              <span className="material-symbols-outlined text-[18px]">crop_free</span>
            </button>
            <button
              onClick={onClose}
              className="ml-2 flex h-8 w-8 items-center justify-center rounded-lg bg-[#2f8fff] text-white hover:bg-[#1f7fe8]"
              title="Close (Esc)"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>
        <div
          ref={previewRef}
          className="flex items-center justify-center overflow-auto bg-[#f1f5f9]"
          style={{ maxHeight: "calc(90vh - 120px)" }}
          onWheel={handleWheel}
        >
          <div className="p-4">
            {imageSrc ? (
              <img
                src={imageSrc}
                alt={artifact.name}
                className="transition-transform duration-150"
                style={{ transform: `scale(${zoom})`, transformOrigin: "center center", maxWidth: "90vw" }}
              />
            ) : artifact.htmlSnapshot ? (
              <div
                className="transition-transform duration-150"
                style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
              >
                <iframe
                  title={artifact.name}
                  srcDoc={artifact.htmlSnapshot}
                  className="h-[70vh] w-[90vw] max-w-5xl border-0"
                />
              </div>
            ) : (
              <div className="flex h-64 w-96 items-center justify-center text-sm text-slate-500">Preview unavailable</div>
            )}
          </div>
        </div>
        <div className="border-t border-[#e4ddd4] px-4 py-2 text-center text-xs text-slate-400">
          Scroll to zoom · +/- keys · 0 to reset · Esc to close
        </div>
      </div>
    </div>
  )
}

function BuilderWorkspace({
  project,
  planView,
  designArtifacts,
  imageAuthToken,
  buildRuns,
  busyAction,
  error,
  generationProgress,
  generationErrors,
  onApprovePlan,
  onRegeneratePlan,
  onApproveAllDesigns,
  onStartBuild,
  onViewScreen,
}: {
  project: ProjectView
  planView: PlanView | null
  designArtifacts: DesignArtifact[]
  imageAuthToken: string | null
  buildRuns: BuildRun[]
  busyAction: string | null
  error: string | null
  generationProgress: GenerationProgress
  generationErrors: { route: string; error: string }[]
  onApprovePlan: () => void
  onRegeneratePlan: () => void
  onApproveAllDesigns: () => void
  onStartBuild: () => void
  onViewScreen: (artifact: DesignArtifact) => void
}) {
  const plan = planView?.plan ?? null
  const approvedPlan = planView?.status === "approved"
  const approvedDesign = designArtifacts.find((artifact) => artifact.status === "approved") ?? null
  const latestBuild = buildRuns[0] ?? null
  const buildDesignImageSrc = useCallback((artifact: DesignArtifact) => {
    if (!artifact.imageUrl || !imageAuthToken) return null

    const params = new URLSearchParams({ token: imageAuthToken })
    return `/api/projects/${project.id}/design/screens/${artifact.screenId}/image?${params.toString()}`
  }, [imageAuthToken, project.id])

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-32">
      <section className="rounded-[2rem] border border-[#e4ddd4] bg-[#111827] p-6 text-white shadow-[0_32px_80px_-42px_rgba(17,24,39,0.65)]">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-200/70">Plan-to-app pipeline</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">{plan?.metadata.productName || project.projectName}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Approve the product plan to auto-generate all UI screens, approve a screen, then start the local build worker.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusPill active={Boolean(plan)} label="Plan" />
            <StatusPill active={approvedPlan} label="Approved" />
            <StatusPill active={designArtifacts.length > 0} label="Design" />
            <StatusPill active={Boolean(approvedDesign)} label="UI Approved" />
            <StatusPill active={Boolean(latestBuild)} label="Build" />
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-[1.5rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      <PanelShell eyebrow="Stage 1" title="Project Plan">
        {!plan ? (
          <div className="rounded-[1.5rem] border border-dashed border-[#d9d1c6] bg-[#faf8f4] p-6 text-sm leading-7 text-slate-600">
            Flowro is still collecting the initial context. Answer the setup questions in chat to generate the first project plan.
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2 rounded-[1.5rem] border border-[#ebe4db] bg-[#fcfaf7] p-5">
                <p className="text-sm font-semibold text-slate-900">{plan.appSummary}</p>
                <p className="mt-3 text-sm leading-7 text-slate-600">{plan.problem}</p>
              </div>
              <div className="rounded-[1.5rem] border border-[#d8e7fb] bg-[#f8fbff] p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Template</p>
                <p className="mt-2 text-base font-semibold text-slate-900">{plan.templateId}</p>
                <p className="mt-2 text-sm text-slate-500">Template-first generation; the AI cannot invent the base stack.</p>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-[1.5rem] border border-[#ebe4db] bg-white p-5">
                <h3 className="font-semibold text-slate-900">Routes <span className="text-xs font-normal text-slate-400">({plan.routes.length} screens)</span></h3>
                <div className="mt-4 space-y-3">
                  {plan.routes.map((route) => (
                    <div key={route.path} className="rounded-[1rem] bg-[#faf8f4] p-4">
                      <p className="text-sm font-semibold text-slate-900">{route.name} <span className="text-slate-400">{route.path}</span></p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{route.purpose}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-[#ebe4db] bg-white p-5">
                <h3 className="font-semibold text-slate-900">Build Tasks</h3>
                <div className="mt-4 space-y-3">
                  {plan.buildTasks.map((task) => (
                    <div key={task.id} className="rounded-[1rem] bg-[#faf8f4] p-4">
                      <p className="text-sm font-semibold text-slate-900">{task.id}: {task.title}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{task.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <ActionButton onClick={onApprovePlan} disabled={approvedPlan || busyAction !== null}>
                <span className="material-symbols-outlined text-[18px]">task_alt</span>
                {approvedPlan ? "Plan Approved" : "Approve Plan"}
              </ActionButton>
              <ActionButton onClick={onRegeneratePlan} disabled={busyAction !== null} tone="secondary">
                <span className="material-symbols-outlined text-[18px]">refresh</span>
                Regenerate Plan
              </ActionButton>
              {planView?.legacyPrd ? (
                <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                  Legacy PRD transformed into a project plan
                </span>
              ) : null}
            </div>
          </div>
        )}
      </PanelShell>

      <PanelShell eyebrow="Stage 2" title="Product Design Agent">
        {!approvedPlan ? (
          <div className="rounded-[1.5rem] border border-dashed border-[#d9d1c6] bg-[#faf8f4] p-6 text-sm text-slate-600">
            Approve the project plan to automatically generate all UI screens.
          </div>
        ) : (
          <div className="space-y-5">
            {generationProgress ? (
              <div className="rounded-[1.5rem] border border-[#d8e7fb] bg-[#f8fbff] p-6">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined animate-spin text-2xl text-[#2f8fff]">progress_activity</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Generating screen {generationProgress.current} of {generationProgress.total}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {generationProgress.route} — {generationProgress.status === "generating" ? "Generating..." : generationProgress.status === "done" ? "Complete" : "Failed"}
                    </p>
                  </div>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#e2efff]">
                  <div
                    className="h-full rounded-full bg-[#2f8fff] transition-all duration-500"
                    style={{ width: `${(generationProgress.current / generationProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            ) : null}

            {generationErrors.length > 0 ? (
              <div className="rounded-[1.5rem] border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-semibold text-red-700">Failed screens</p>
                <ul className="mt-2 space-y-1">
                  {generationErrors.map((err) => (
                    <li key={err.route} className="text-xs text-red-600">
                      <span className="font-medium">{err.route}</span>: {err.error}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {designArtifacts.length > 0 && !generationProgress ? (
              <div className="flex flex-wrap gap-3">
                <ActionButton onClick={onApproveAllDesigns} disabled={approvedDesign !== null || busyAction !== null}>
                  <span className="material-symbols-outlined text-[18px]">task_alt</span>
                  {approvedDesign !== null ? "All Screens Approved" : `Approve All Screens (${designArtifacts.length})`}
                </ActionButton>
              </div>
            ) : null}

            {designArtifacts.length === 0 && !generationProgress ? (
              <div className="rounded-[1.5rem] border border-dashed border-[#d9d1c6] bg-[#faf8f4] p-6 text-sm text-slate-600">
                Screens are being generated automatically. This may take a moment.
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {designArtifacts.map((artifact) => (
                  <div
                    key={artifact.id}
                    className="group cursor-pointer overflow-hidden rounded-[1.5rem] border border-[#ebe4db] bg-white transition-shadow hover:shadow-[0_12px_32px_-16px_rgba(0,0,0,0.15)]"
                    onClick={() => onViewScreen(artifact)}
                  >
                    <div className="relative aspect-[16/10] bg-[#f1f5f9]">
                      {buildDesignImageSrc(artifact) ? (
                        <img
                          src={buildDesignImageSrc(artifact) || undefined}
                          alt={artifact.name}
                          className="h-full w-full object-cover"
                          onError={(event) => {
                            event.currentTarget.style.display = "none"
                            const fallback = event.currentTarget.nextElementSibling
                            if (fallback instanceof HTMLElement) {
                              fallback.style.display = "flex"
                            }
                          }}
                        />
                      ) : artifact.htmlSnapshot ? (
                        <iframe title={artifact.name} srcDoc={artifact.htmlSnapshot} className="h-full w-full border-0" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-slate-500">Preview unavailable</div>
                      )}
                      {artifact.htmlSnapshot ? (
                        <iframe
                          title={`${artifact.name} fallback`}
                          srcDoc={artifact.htmlSnapshot}
                          className="hidden h-full w-full border-0"
                        />
                      ) : null}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/20 group-hover:opacity-100">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-lg">
                          <span className="material-symbols-outlined text-[24px] text-slate-700">zoom_in</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="font-semibold text-slate-900">{artifact.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{artifact.status === "approved" ? "Approved" : "Generated screen"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </PanelShell>

      <PanelShell eyebrow="Stage 3" title="Local Build Worker">
        {!approvedDesign ? (
          <div className="rounded-[1.5rem] border border-dashed border-[#d9d1c6] bg-[#faf8f4] p-6 text-sm text-slate-600">
            Approve all screens before starting the build worker.
          </div>
        ) : (
          <div className="space-y-5">
            <ActionButton onClick={onStartBuild} disabled={busyAction !== null}>
              <span className="material-symbols-outlined text-[18px]">terminal</span>
              Start Build
            </ActionButton>

            {latestBuild ? (
              <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
                <div className="rounded-[1.5rem] border border-[#d8e7fb] bg-[#f8fbff] p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Build status</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{latestBuild.status}</p>
                  {latestBuild.previewUrl ? <p className="mt-2 text-sm text-slate-500">Preview is backed by the approved design until file generation lands.</p> : null}
                </div>
                <pre className="max-h-72 overflow-auto rounded-[1.5rem] bg-[#111827] p-5 text-xs leading-6 text-slate-200">
                  {latestBuild.logs.join("\n")}
                </pre>
              </div>
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-[#d9d1c6] bg-[#faf8f4] p-6 text-sm text-slate-600">
                No build run yet. The first run creates a stub worker result and planned file-change manifest.
              </div>
            )}
          </div>
        )}
      </PanelShell>
    </div>
  )
}

type GenerationProgress = {
    current: number
    total: number
    route: string
    status: "generating" | "done" | "failed"
} | null

export default function ChatView({ projectId, initialMessage, user, onBack: _onBack }: ChatViewProps) {
  void _onBack

  const [project, setProject] = useState<ProjectView | null>(null)
  const [draftPlan, setDraftPlan] = useState<PlanView | null>(null)
  const [designArtifacts, setDesignArtifacts] = useState<DesignArtifact[]>([])
  const [imageAuthToken, setImageAuthToken] = useState<string | null>(null)
  const [buildRuns, setBuildRuns] = useState<BuildRun[]>([])
  const [loadingProject, setLoadingProject] = useState(true)
  const [workspaceError, setWorkspaceError] = useState<string | null>(null)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [chatRequestState, setChatRequestState] = useState<"idle" | "submitting" | "error">("idle")
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamedContent, setStreamedContent] = useState("")
  const [thinkingPhase, setThinkingPhase] = useState<number | undefined>()
  const [selectionContext, setSelectionContext] = useState<SelectionContext | null>(null)
  const [chatError, setChatError] = useState<string | null>(null)
  const [lastSubmittedMessage, setLastSubmittedMessage] = useState<string | null>(null)
  const [lastFailedSubmission, setLastFailedSubmission] = useState<string | null>(null)
  const [clarificationAnswers, setClarificationAnswers] = useState<Record<string, ClarificationAnswerState>>({})
  const [mobilePane, setMobilePane] = useState<"chat" | "workspace">("chat")
  const [chatSplitPercent, setChatSplitPercent] = useState(DEFAULT_CHAT_SPLIT_PERCENT)
  const [isDraggingChatSplit, setIsDraggingChatSplit] = useState(false)
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress>(null)
  const [generationErrors, setGenerationErrors] = useState<{ route: string; error: string }[]>([])
  const [selectedScreen, setSelectedScreen] = useState<DesignArtifact | null>(null)
  const hasInitialized = useRef(false)
  const hasBootstrappedSeed = useRef(false)
  const hasAutoGenerated = useRef(false)
  const desktopWorkspaceRef = useRef<HTMLDivElement>(null)

  const latestClarification = project && !draftPlan ? getLatestClarificationResponse(project.chatHistory) ?? null : null
  const clarificationQuestions = !draftPlan ? latestClarification?.questions ?? null : null
  const clarificationProgress = clarificationQuestions
    ? getClarificationProgress(clarificationQuestions, clarificationAnswers)
    : { activeQuestion: null, activeQuestionIndex: -1, answeredSummaries: [], isReady: false }
  const isClarificationReady = clarificationProgress.isReady
  const isChatSubmitting = chatRequestState === "submitting"

  const updateChatSplitFromClientX = useCallback((clientX: number) => {
    const workspace = desktopWorkspaceRef.current
    if (!workspace) return
    const bounds = workspace.getBoundingClientRect()
    if (bounds.width <= 0) return
    setChatSplitPercent(clampChatSplit(((clientX - bounds.left) / bounds.width) * 100))
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem(CHAT_SPLIT_STORAGE_KEY)
    if (!stored) return
    const parsed = Number(stored)
    if (Number.isFinite(parsed)) setChatSplitPercent(clampChatSplit(parsed))
  }, [])

  useEffect(() => {
    localStorage.setItem(CHAT_SPLIT_STORAGE_KEY, String(chatSplitPercent))
  }, [chatSplitPercent])

  useEffect(() => {
    if (!clarificationQuestions?.length) {
      setClarificationAnswers({})
      return
    }
    setClarificationAnswers((current) => normalizeClarificationAnswers(clarificationQuestions, current))
  }, [clarificationQuestions])

  useEffect(() => {
    if (!isDraggingChatSplit) return
    const handlePointerMove = (event: PointerEvent) => updateChatSplitFromClientX(event.clientX)
    const handlePointerUp = () => setIsDraggingChatSplit(false)
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerUp)
    return () => {
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
    }
  }, [isDraggingChatSplit, updateChatSplitFromClientX])

  useEffect(() => {
    if (hasInitialized.current) return
    hasInitialized.current = true

    async function initializeWorkspace() {
      try {
        setLoadingProject(true)
        const response = await authGet(`/api/projects/${projectId}`, user)
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || "Failed to load project")

        const nextProject: ProjectView = {
          id: data.id,
          projectName: data.projectName || data.name || "Untitled Project",
          description: data.description,
          stage: data.stage || "planning",
          chatHistory: data.chatHistory || [],
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          latestPrd: data.latestPrd,
          latestPlan: data.latestPlan,
          designArtifacts: data.designArtifacts || [],
          buildRuns: data.buildRuns || [],
        }

        setProject(nextProject)
        setDraftPlan(data.latestPlan || null)
        setDesignArtifacts(data.designArtifacts || [])
        setBuildRuns(data.buildRuns || [])
      } catch (error) {
        setWorkspaceError(error instanceof Error ? error.message : "Failed to load project")
      } finally {
        setLoadingProject(false)
      }
    }

    void initializeWorkspace()
  }, [projectId, user])

  useEffect(() => {
    let cancelled = false

    async function syncImageAuthToken(forceRefresh = false) {
      try {
        const token = await user.getIdToken(forceRefresh)
        if (!cancelled) {
          setImageAuthToken(token)
        }
      } catch {
        if (!cancelled) {
          setImageAuthToken(null)
        }
      }
    }

    void syncImageAuthToken(false)
    const refreshInterval = window.setInterval(() => {
      void syncImageAuthToken(true)
    }, 45 * 60 * 1000)

    return () => {
      cancelled = true
      window.clearInterval(refreshInterval)
    }
  }, [user])

  useEffect(() => {
    if (!project || draftPlan || hasBootstrappedSeed.current) return
    if (project.chatHistory.length > 0) return
    const seedMessage = deriveSeedMessage(project, initialMessage)
    if (!seedMessage) return
    hasBootstrappedSeed.current = true
    void handleSendMessage(seedMessage)
  })

  useEffect(() => {
    if (!draftPlan || draftPlan.status !== "approved" || hasAutoGenerated.current) return
    if (designArtifacts.length > 0) return
    hasAutoGenerated.current = true
    void handleGenerateAllDesigns()
  }, [draftPlan])

  function handleChatResizePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return
    event.preventDefault()
    setIsDraggingChatSplit(true)
    updateChatSplitFromClientX(event.clientX)
  }

  function handleClarificationToggle(question: ClarificationQuestion, optionId: string) {
    setClarificationAnswers((current) => ({
      ...current,
      [question.id]: updateClarificationSelection(question, current[question.id], optionId),
    }))
  }

  function handleClarificationCustomTextChange(questionId: string, value: string) {
    setClarificationAnswers((current) => ({
      ...current,
      [questionId]: updateClarificationCustomText(current[questionId], questionId, value),
    }))
  }

  function handleClarificationContinue() {
    const activeQuestion = clarificationProgress.activeQuestion
    if (!activeQuestion) return
    setClarificationAnswers((current) => {
      const answer = completeClarificationAnswer(activeQuestion, current[activeQuestion.id])
      return answer.isComplete ? { ...current, [activeQuestion.id]: answer } : current
    })
  }

  async function submitGenerate(messageToSend: string, forceRegenerate = false) {
    if (!project || isChatSubmitting) return

    const optimisticUserMessage: ChatMessage = {
      id: createTemporaryMessageId(),
      role: "user",
      content: messageToSend,
      intent: draftPlan && !forceRegenerate ? "discussion" : "clarification",
      timestamp: new Date().toISOString(),
    }

    try {
      setChatRequestState("submitting")
      setLastSubmittedMessage(messageToSend)
      setLastFailedSubmission(null)
      setProject((prev) => prev ? { ...prev, chatHistory: [...prev.chatHistory, optimisticUserMessage] } : prev)
      setMessage("")
      setChatError(null)
      setWorkspaceError(null)
      setIsStreaming(true)
      setStreamedContent("")
      setThinkingPhase(0)

      const response = await authPost("/api/generate", user, {
        message: messageToSend,
        projectId,
        context: project.chatHistory,
        forceRegenerate,
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to get a response from Flowro")

      const persistedUserMessage: ChatMessage = data.userMessage || optimisticUserMessage
      const assistantMessage: ChatMessage = data.assistantMessage || {
        id: createTemporaryMessageId(),
        role: "assistant",
        content: data.intent === "clarification" ? JSON.stringify(data) : data.message,
        intent: data.intent,
        timestamp: new Date().toISOString(),
      }

      if (data.intent === "initial" && data.projectPlan) {
        const nextPlan: PlanView = {
          id: projectId,
          projectId,
          plan: data.projectPlan,
          status: data.projectPlan.metadata.status === "approved" ? "approved" : "draft",
          updatedAt: new Date().toISOString(),
        }
        setDraftPlan(nextPlan)
        setMobilePane("workspace")
      }

      setProject((prev) => {
        if (!prev) return prev
        const nextHistory = prev.chatHistory
          .filter((chatMessage) => chatMessage.id !== optimisticUserMessage.id)
          .concat(persistedUserMessage, assistantMessage)
        return {
          ...prev,
          projectName: data.productName || prev.projectName,
          chatHistory: nextHistory,
          latestPlan: data.projectPlan
            ? {
                id: projectId,
                projectId,
                plan: data.projectPlan,
                status: data.projectPlan.metadata.status === "approved" ? "approved" : "draft",
                updatedAt: new Date().toISOString(),
              }
            : prev.latestPlan,
        }
      })
      setChatRequestState("idle")
    } catch (error) {
      setProject((prev) => prev ? { ...prev, chatHistory: prev.chatHistory.filter((chatMessage) => chatMessage.id !== optimisticUserMessage.id) } : prev)
      setChatRequestState("error")
      setChatError(error instanceof Error ? error.message : "Failed to send message")
      setLastFailedSubmission(messageToSend)
      if (project.chatHistory.length === 0) hasBootstrappedSeed.current = false
    } finally {
      setIsStreaming(false)
      setStreamedContent("")
      setThinkingPhase(undefined)
      setBusyAction(null)
    }
  }

  async function handleSendMessage(customMessage?: string) {
    const isPrePlanConversation = !draftPlan
    const messageToSend = isPrePlanConversation && clarificationQuestions?.length
      ? buildClarificationAnswerMessage(clarificationQuestions, clarificationAnswers)
      : (customMessage ?? message).trim()

    if (isPrePlanConversation && clarificationQuestions?.length && !isClarificationReady) return
    if (!messageToSend) return
    if (isPrePlanConversation) setClarificationAnswers({})
    await submitGenerate(messageToSend)
  }

  function handleRetry() {
    const messageToRetry = lastFailedSubmission || lastSubmittedMessage
    if (!messageToRetry) return
    void submitGenerate(messageToRetry)
  }

  async function handleApprovePlan() {
    if (!draftPlan) return
    try {
      setBusyAction("approve-plan")
      setWorkspaceError(null)
      const response = await authPost(`/api/projects/${projectId}/plan/approve`, user, {})
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to approve plan")
      setDraftPlan(data)
      setProject((prev) => prev ? { ...prev, latestPlan: data, stage: "plan_approved" } : prev)
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Failed to approve plan")
    } finally {
      setBusyAction(null)
    }
  }

  async function handleRegeneratePlan() {
    setBusyAction("regenerate-plan")
    await submitGenerate("Regenerate the project plan using the latest conversation context. Keep the template-first constraint.", true)
  }

  async function handleGenerateAllDesigns() {
    try {
      setBusyAction("generate-all-designs")
      setWorkspaceError(null)
      setGenerationProgress(null)
      setGenerationErrors([])

      const response = await authFetch(`/api/projects/${projectId}/design/generate-all`, user, { method: "POST" })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to generate screens")
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error("No stream reader available")

      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          try {
            const chunk = JSON.parse(line.slice(6))

            if (chunk.type === "start") {
              setGenerationProgress({ current: 0, total: chunk.total, route: "", status: "generating" })
            } else if (chunk.type === "progress") {
              setGenerationProgress({ current: chunk.current, total: chunk.total, route: chunk.route, status: chunk.status })
            } else if (chunk.type === "artifact") {
              setDesignArtifacts((current) => [chunk.artifact, ...current])
            } else if (chunk.type === "done") {
              setGenerationProgress(null)
              if (chunk.failed > 0) {
                setGenerationErrors(chunk.errors)
                setWorkspaceError(`${chunk.failed} screen(s) failed: ${chunk.errors.map((e: { route: string }) => e.route).join(", ")}`)
              }
            } else if (chunk.type === "error") {
              setGenerationProgress(null)
              throw new Error(chunk.error)
            }
          } catch {
            // skip malformed chunks
          }
        }
      }
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Failed to generate screens")
      setGenerationProgress(null)
    } finally {
      setBusyAction(null)
    }
  }

  async function handleApproveAllDesigns() {
    try {
      setBusyAction("approve-all-designs")
      setWorkspaceError(null)
      const response = await authPost(`/api/projects/${projectId}/design/approve`, user, {})
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to approve screens")
      setDesignArtifacts((current) =>
        current.map((artifact) => {
          const approved = data.artifacts.find((a: { id: string }) => a.id === artifact.id)
          return approved ? { ...artifact, status: "approved" as const, approvedAt: approved.approvedAt, approvedBy: approved.approvedBy } : artifact
        })
      )
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Failed to approve screens")
    } finally {
      setBusyAction(null)
    }
  }

  function handleViewScreen(artifact: DesignArtifact) {
    setSelectedScreen(artifact)
  }

  function handleCloseScreenPreview() {
    setSelectedScreen(null)
  }

  async function handleStartBuild() {
    try {
      setBusyAction("start-build")
      setWorkspaceError(null)
      const response = await authPost(`/api/projects/${projectId}/build/start`, user, {})
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to start build")
      setBuildRuns((current) => [data, ...current])
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Failed to start build")
    } finally {
      setBusyAction(null)
    }
  }

  if (loadingProject) {
    return (
      <div className="premium-bg flex flex-1 items-center justify-center">
        <div className="rounded-[2rem] border border-[#e4ddd4] bg-white/90 p-10 text-center shadow-[0_40px_90px_-50px_rgba(22,31,49,0.35)]">
          <span className="material-symbols-outlined animate-spin text-4xl text-[#2f8fff]">progress_activity</span>
          <h1 className="mt-4 text-2xl font-semibold text-slate-900">Loading builder workspace</h1>
          <p className="mt-2 text-sm text-slate-500">Syncing plan, design, and build state.</p>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="material-symbols-outlined text-4xl text-red-500">error</span>
        <h1 className="text-2xl font-semibold text-slate-900">Unable to open the builder workspace</h1>
        <p className="text-sm text-slate-500">{workspaceError || "Project data is missing."}</p>
      </div>
    )
  }

  return (
    <div className="relative flex h-full flex-1 flex-col overflow-hidden">
      <div className="flex border-b border-[#e7dfd5] bg-white/80 p-2 lg:hidden">
        <button onClick={() => setMobilePane("chat")} className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold ${mobilePane === "chat" ? "bg-[#2f8fff] text-white" : "text-slate-500"}`}>
          Chat
        </button>
        <button onClick={() => setMobilePane("workspace")} className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold ${mobilePane === "workspace" ? "bg-[#2f8fff] text-white" : "text-slate-500"}`}>
          Builder
        </button>
      </div>

      <div ref={desktopWorkspaceRef} className="relative flex min-h-0 flex-1 overflow-hidden">
        <div
          className={`h-full w-full shrink-0 border-r border-[#e7dfd5] bg-[#fcf8f3]/78 lg:flex lg:w-[var(--chat-pane-width)] ${mobilePane === "chat" ? "flex" : "hidden"}`}
          style={{ "--chat-pane-width": `${chatSplitPercent}%` } as CSSProperties}
        >
          <ChatPanel
            project={project}
            currentPrd={null}
            isGenerating={isChatSubmitting}
            isStreaming={isStreaming}
            streamedContent={streamedContent}
            thinkingPhase={thinkingPhase}
            generationMode="chat"
            message={message}
            error={chatError}
            selectionContext={selectionContext}
            onMessageChange={setMessage}
            onSendMessage={() => { void handleSendMessage() }}
            onOpenBlueprint={() => setMobilePane("workspace")}
            onApplyProposedChanges={() => undefined}
            onClearContext={() => setSelectionContext(null)}
            onQuickAction={(nextMessage) => { void handleSendMessage(nextMessage) }}
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
          aria-label="Resize chat and builder workspace"
          onPointerDown={handleChatResizePointerDown}
          className="group relative hidden w-4 shrink-0 cursor-col-resize touch-none items-stretch justify-center bg-transparent lg:flex"
        >
          <div className="my-3 w-px rounded-full bg-[#d6deea] transition group-hover:bg-[#2f8fff]/70" />
        </div>

        <div className={`min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${mobilePane === "chat" ? "hidden" : "block"} lg:block`}>
          <BuilderWorkspace
            project={project}
            planView={draftPlan}
            designArtifacts={designArtifacts}
            imageAuthToken={imageAuthToken}
            buildRuns={buildRuns}
            busyAction={busyAction}
            error={workspaceError}
            generationProgress={generationProgress}
            generationErrors={generationErrors}
            onApprovePlan={handleApprovePlan}
            onRegeneratePlan={handleRegeneratePlan}
            onApproveAllDesigns={handleApproveAllDesigns}
            onStartBuild={handleStartBuild}
            onViewScreen={handleViewScreen}
          />
        </div>
      </div>

      {selectedScreen && (
        <ScreenPreviewModal
          artifact={selectedScreen}
          imageSrc={imageAuthToken ? `/api/projects/${projectId}/design/screens/${selectedScreen.screenId}/image?token=${imageAuthToken}` : null}
          onClose={handleCloseScreenPreview}
        />
      )}
    </div>
  )
}
