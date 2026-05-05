"use client"

import { useEffect, useRef, useState } from "react"
import type { User } from "firebase/auth"
import { authGet, authPost } from "@/lib/authFetch"
import type { BuildRun } from "@/lib/project-plan/schema"
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
import WorkspaceTabs, { type WorkspaceTabKey } from "@/components/workspace/WorkspaceTabs"
import { BuilderWorkspace, EmptyTab, type PlanView } from "@/components/workspace/BuilderWorkspace"
import GeneratedAppExplorer from "@/components/workspace/GeneratedAppExplorer"
import { mergeBuildRun, isBuildRunning, shouldPollBuildRun } from "@/components/workspace/BuildMissionControl"

interface ChatViewProps {
  projectId: string
  initialMessage: string
  user: User
  onBack: () => void
  onProjectSelect?: (projectId: string) => void
  isExisting?: boolean
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

export default function ChatView({ projectId, initialMessage, user, onBack, onProjectSelect }: ChatViewProps) {
  const [project, setProject] = useState<ProjectView | null>(null)
  const [draftPlan, setDraftPlan] = useState<PlanView | null>(null)
  const [buildRuns, setBuildRuns] = useState<BuildRun[]>([])
  const [loadingProject, setLoadingProject] = useState(true)
  const [workspaceError, setWorkspaceError] = useState<string | null>(null)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [composerActionMode, setComposerActionMode] = useState<"build" | "plan">("build")
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
  const [selectedPreviewPath, setSelectedPreviewPath] = useState("/")
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0)
  const hasInitialized = useRef(false)
  const hasBootstrappedSeed = useRef(false)

  const latestClarification = project && !draftPlan ? getLatestClarificationResponse(project.chatHistory) ?? null : null
  const clarificationQuestions = !draftPlan ? latestClarification?.questions ?? null : null
  const clarificationProgress = clarificationQuestions
    ? getClarificationProgress(clarificationQuestions, clarificationAnswers)
    : { activeQuestion: null, activeQuestionIndex: -1, answeredSummaries: [], isReady: false }
  const isClarificationReady = clarificationProgress.isReady
  const isChatSubmitting = chatRequestState === "submitting"
  const latestBuild = buildRuns[0] ?? null
  const latestBuildId = latestBuild?.id
  const shouldPollBuild = shouldPollBuildRun(latestBuild)
  const hasWorkspaceContent = Boolean(draftPlan)

  useEffect(() => {
    if (!clarificationQuestions?.length) {
      setClarificationAnswers({})
      return
    }
    setClarificationAnswers((current) => normalizeClarificationAnswers(clarificationQuestions, current))
  }, [clarificationQuestions])

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
          buildRuns: data.buildRuns || [],
        }

        setProject(nextProject)
        setDraftPlan(data.latestPlan || null)
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
    if (!project || draftPlan || hasBootstrappedSeed.current) return
    if (project.chatHistory.length > 0) return
    const seedMessage = deriveSeedMessage(project, initialMessage)
    if (!seedMessage) return
    hasBootstrappedSeed.current = true
    void handleSendMessage(seedMessage)
  })

  useEffect(() => {
    if (!shouldPollBuild) return
    let cancelled = false

    async function pollBuildStatus() {
      try {
        const response = await authGet(`/api/projects/${projectId}/build/status`, user)
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || "Failed to refresh build status")
        if (!cancelled && data.latestRun) {
          setBuildRuns((current) => mergeBuildRun(current, data.latestRun))
        }
      } catch (error) {
        if (!cancelled) {
          setWorkspaceError(error instanceof Error ? error.message : "Failed to refresh build status")
        }
      }
    }

    void pollBuildStatus()
    const interval = window.setInterval(() => {
      void pollBuildStatus()
    }, 2000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [latestBuildId, shouldPollBuild, projectId, user])

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
        modelUsed: data.modelUsed,
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

    // After a successful build preview, Build mode routes changes directly to the build worker.
    const hasPreview = Boolean(latestBuild?.previewAvailable && latestBuild?.previewUrl)
    if (hasPreview && !customMessage && !isBuildRunning(latestBuild) && composerActionMode === "build") {
      setMessage("")
      setProject((prev) =>
        prev
          ? {
              ...prev,
              chatHistory: [
                ...prev.chatHistory,
                {
                  id: createTemporaryMessageId(),
                  role: "user" as const,
                  content: messageToSend,
                  intent: "discussion" as const,
                  timestamp: new Date().toISOString(),
                },
              ],
            }
          : prev
      )
      await handleApplyBuildEdit(messageToSend)
      return
    }

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
      setMobilePane("workspace")

      if (!latestBuild) {
        setBusyAction("start-build")
        const buildResponse = await authPost(`/api/projects/${projectId}/build/start`, user, {})
        const buildData = await buildResponse.json()
        if (!buildResponse.ok) throw new Error(buildData.error || "Failed to start build")
        setBuildRuns((current) => mergeBuildRun(current, buildData))
      }
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

  async function handleStartBuild() {
    try {
      setBusyAction("start-build")
      setWorkspaceError(null)
      const response = await authPost(`/api/projects/${projectId}/build/start`, user, {})
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to start build")
      setBuildRuns((current) => mergeBuildRun(current, data))
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Failed to start build")
    } finally {
      setBusyAction(null)
    }
  }

  async function handleCancelBuild() {
    try {
      setBusyAction("cancel-build")
      setWorkspaceError(null)
      const response = await authPost(`/api/projects/${projectId}/build/cancel`, user, {})
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to cancel build")
      if (data.latestRun) {
        setBuildRuns((current) => mergeBuildRun(current, data.latestRun))
      }
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Failed to cancel build")
    } finally {
      setBusyAction(null)
    }
  }

  async function handleApplyBuildEdit(instruction: string) {
    try {
      setBusyAction("apply-build-edit")
      setWorkspaceError(null)
      const response = await authPost(`/api/projects/${projectId}/build/edit`, user, { instruction })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to apply targeted edit")
      setBuildRuns((current) => mergeBuildRun(current, data))
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Failed to apply targeted edit")
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
          <p className="mt-2 text-sm text-slate-500">Syncing plan, build state, and preview.</p>
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
    <div className="relative flex h-full flex-1 flex-col overflow-hidden bg-[#111111] text-slate-100">
      {hasWorkspaceContent ? (
        <div className="flex border-b border-white/[0.07] bg-[#181818] p-2 backdrop-blur-xl lg:hidden">
          <button onClick={() => setMobilePane("chat")} className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold ${mobilePane === "chat" ? "bg-[#2f2f2d] text-white shadow-[0_10px_26px_-18px_rgba(0,0,0,0.95)]" : "text-[#8f8f8b]"}`}>
            Chat
          </button>
          <button onClick={() => setMobilePane("workspace")} className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold ${mobilePane === "workspace" ? "bg-[#2f2f2d] text-white shadow-[0_10px_26px_-18px_rgba(0,0,0,0.95)]" : "text-[#8f8f8b]"}`}>
            Builder
          </button>
        </div>
      ) : null}

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <div
          className={`h-full w-full shrink-0 bg-[#191919] lg:flex ${hasWorkspaceContent ? "border-r border-white/[0.07] lg:w-[39%]" : "lg:w-full"} ${mobilePane === "chat" || !hasWorkspaceContent ? "flex" : "hidden"}`}
        >
          <ChatPanel
            project={project}
            user={user}
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
            actionMode={composerActionMode}
            onActionModeChange={setComposerActionMode}
            onOpenBlueprint={() => {
              if (hasWorkspaceContent) setMobilePane("workspace")
            }}
            onProjectSelect={onProjectSelect}
            onGoHome={onBack}
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

        {hasWorkspaceContent ? (
          <>
            <div
              role="separator"
              aria-label="Chat and builder divider"
              className="hidden w-px shrink-0 bg-white/[0.07] lg:block"
            />

            <div className={`min-h-0 flex-1 bg-[#111111] ${mobilePane === "chat" ? "hidden" : "block"} lg:block`}>
              <WorkspaceTabs
                previewRoutes={draftPlan?.plan.routes}
                selectedPreviewPath={selectedPreviewPath}
                onPreviewPathChange={setSelectedPreviewPath}
                onRefreshPreview={() => setPreviewRefreshKey((current) => current + 1)}
                projectId={projectId}
                user={user}
                initialPublishStatus={project?.publishStatus}
                initialVercelUrl={project?.vercelDeployUrl}
                renderTab={(tab: WorkspaceTabKey) => {
                  if (tab === "code") {
                    return (
                      <GeneratedAppExplorer
                        projectId={projectId}
                        user={user}
                        fallbackPath={latestBuild?.targetWorkspacePath || `/Users/khalidr/Desktop/Flowro-Apps/${projectId}`}
                      />
                    )
                  }

                  if (tab === "files") {
                    return <EmptyTab icon="folder_open" title="Files" body="File management is coming soon." />
                  }

                  return (
                    <BuilderWorkspace
                      project={project}
                      planView={draftPlan}
                      buildRuns={buildRuns}
                      busyAction={busyAction}
                      error={workspaceError}
                      user={user}
                      selectedPreviewPath={selectedPreviewPath}
                      previewRefreshKey={previewRefreshKey}
                      onApprovePlan={handleApprovePlan}
                      onRegeneratePlan={handleRegeneratePlan}
                      onStartBuild={handleStartBuild}
                      onCancelBuild={handleCancelBuild}
                      onApplyBuildEdit={handleApplyBuildEdit}
                    />
                  )
                }}
              />
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
