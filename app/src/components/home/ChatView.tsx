"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react"
import type { User } from "firebase/auth"
import { authGet, authPost } from "@/lib/authFetch"
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

function BuilderWorkspace({
  project,
  planView,
  designArtifacts,
  imageAuthToken,
  buildRuns,
  busyAction,
  error,
  onApprovePlan,
  onRegeneratePlan,
  onGenerateDesign,
  onApproveDesign,
  onStartBuild,
}: {
  project: ProjectView
  planView: PlanView | null
  designArtifacts: DesignArtifact[]
  imageAuthToken: string | null
  buildRuns: BuildRun[]
  busyAction: string | null
  error: string | null
  onApprovePlan: () => void
  onRegeneratePlan: () => void
  onGenerateDesign: () => void
  onApproveDesign: (artifactId: string) => void
  onStartBuild: () => void
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
              Approve the product plan, generate UI with the Product Design Agent, approve the screen, then start the local build worker.
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
                <h3 className="font-semibold text-slate-900">Routes</h3>
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
            Approve the project plan before generating UI with Stitch.
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-3">
              <ActionButton onClick={onGenerateDesign} disabled={busyAction !== null}>
                <span className="material-symbols-outlined text-[18px]">draw</span>
                Generate UI
              </ActionButton>
              <span className="rounded-full border border-[#e4ddd4] bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                Requires STITCH_API_KEY
              </span>
            </div>

            {designArtifacts.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-[#d9d1c6] bg-[#faf8f4] p-6 text-sm text-slate-600">
                No generated screens yet.
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {designArtifacts.map((artifact) => (
                  <div key={artifact.id} className="overflow-hidden rounded-[1.5rem] border border-[#ebe4db] bg-white">
                    <div className="aspect-[16/10] bg-[#f1f5f9]">
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
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                      <div>
                        <p className="font-semibold text-slate-900">{artifact.name}</p>
                        <p className="mt-1 text-xs text-slate-500">{artifact.status === "approved" ? "Approved UI" : "Generated screen"}</p>
                      </div>
                      <ActionButton
                        onClick={() => onApproveDesign(artifact.id)}
                        disabled={artifact.status === "approved" || busyAction !== null}
                        tone={artifact.status === "approved" ? "secondary" : "primary"}
                      >
                        {artifact.status === "approved" ? "Approved" : "Approve UI"}
                      </ActionButton>
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
            Approve a UI screen before starting the build worker.
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
  const hasInitialized = useRef(false)
  const hasBootstrappedSeed = useRef(false)
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

  async function handleGenerateDesign() {
    try {
      setBusyAction("generate-design")
      setWorkspaceError(null)
      const response = await authPost(`/api/projects/${projectId}/design/generate`, user, {})
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to generate UI")
      setDesignArtifacts((current) => [data, ...current])
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Failed to generate UI")
    } finally {
      setBusyAction(null)
    }
  }

  async function handleApproveDesign(artifactId: string) {
    try {
      setBusyAction("approve-design")
      setWorkspaceError(null)
      const response = await authPost(`/api/projects/${projectId}/design/approve`, user, { artifactId })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to approve UI")
      setDesignArtifacts((current) => current.map((artifact) => artifact.id === data.id ? data : { ...artifact, status: "generated" }))
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Failed to approve UI")
    } finally {
      setBusyAction(null)
    }
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
            onApprovePlan={handleApprovePlan}
            onRegeneratePlan={handleRegeneratePlan}
            onGenerateDesign={handleGenerateDesign}
            onApproveDesign={handleApproveDesign}
            onStartBuild={handleStartBuild}
          />
        </div>
      </div>
    </div>
  )
}
