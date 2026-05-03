"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react"
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
import StageCard, { type StageStatus } from "@/components/workspace/StageCard"
import WorkspaceTabs, { type WorkspaceTabKey } from "@/components/workspace/WorkspaceTabs"

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

function EmptyTab({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="flex h-full items-center justify-center px-6 py-12">
      <div className="max-w-sm text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-white shadow-[0_18px_36px_-26px_rgba(29,41,65,0.25)]">
          <span className="material-symbols-outlined text-[26px] text-[#2f8fff]">{icon}</span>
        </div>
        <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">{body}</p>
        <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#fef3c7] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">
          Coming soon
        </span>
      </div>
    </div>
  )
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

const BUILD_TERMINAL_STATUSES = new Set(["success", "failed", "canceled"])

const BUILD_PHASES: Array<{ key: NonNullable<BuildRun["phase"]>; label: string; icon: string }> = [
  { key: "queued", label: "Queued", icon: "hourglass_top" },
  { key: "planning", label: "Planning", icon: "route" },
  { key: "generating", label: "Generating", icon: "auto_fix_high" },
  { key: "installing", label: "Installing", icon: "deployed_code" },
  { key: "building", label: "Building", icon: "construction" },
  { key: "repairing", label: "Repairing", icon: "build" },
  { key: "preview", label: "Preview", icon: "smart_display" },
]

function isBuildRunning(build: BuildRun | null) {
  return Boolean(build && !BUILD_TERMINAL_STATUSES.has(build.status))
}

function mergeBuildRun(current: BuildRun[], nextRun: BuildRun): BuildRun[] {
  const existingIndex = current.findIndex((run) => run.id === nextRun.id)
  if (existingIndex === -1) return [nextRun, ...current]
  return current.map((run, index) => index === existingIndex ? nextRun : run)
}

function formatElapsed(ms?: number) {
  if (!ms) return "00:00"
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0")
  const seconds = (totalSeconds % 60).toString().padStart(2, "0")
  return `${minutes}:${seconds}`
}

function getBuildProgress(build: BuildRun | null) {
  if (!build) return 0
  if (BUILD_TERMINAL_STATUSES.has(build.status)) return 100
  if (build.phase === "generating" && build.totalFiles && build.totalFiles > 0) {
    return Math.min(55, 18 + Math.round(((build.completedFiles ?? 0) / build.totalFiles) * 37))
  }
  const phaseProgress: Record<string, number> = {
    queued: 4,
    planning: 12,
    generating: 35,
    installing: 58,
    building: 74,
    repairing: 84,
    fallback: 82,
    preview: 94,
    completed: 100,
    failed: 100,
    canceled: 100,
  }
  return phaseProgress[build.phase || "queued"] ?? 4
}

function BuildMissionControl({
  build,
  busyAction,
  onCancelBuild,
  onRetryBuild,
}: {
  build: BuildRun
  busyAction: string | null
  onCancelBuild: () => void
  onRetryBuild: () => void
}) {
  const running = isBuildRunning(build)
  const progress = getBuildProgress(build)
  const activePhase = build.phase || (build.status === "queued" ? "queued" : build.status === "running" ? "planning" : "completed")
  const recentLogs = build.logs.slice(-8)
  const fileChips = build.filesChanged.slice(-10)
  const canRetry = build.status === "failed" || build.status === "canceled"
  const runLabel = build.runType === "edit" ? "Targeted edit" : "Build worker"

  return (
    <div className="overflow-hidden rounded-[2rem] border border-[#16253f] bg-[#080d17] text-white shadow-[0_36px_90px_-55px_rgba(8,13,23,0.9)]">
      <div className="relative overflow-hidden p-6">
        <div className="absolute inset-0 opacity-60 [background:radial-gradient(circle_at_18%_16%,rgba(47,143,255,0.32),transparent_26rem),radial-gradient(circle_at_86%_18%,rgba(16,185,129,0.2),transparent_24rem)]" />
        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-blue-200/70">Mission control</p>
            <h3 className="mt-3 text-2xl font-black tracking-tight">{runLabel} is {running ? "assembling" : build.status}</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              {build.currentAction || "Waiting for the next build signal."}
            </p>
            {build.runType === "edit" && build.editInstruction ? (
              <p className="mt-3 max-w-2xl rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-xs leading-5 text-slate-300">
                Edit: {build.editInstruction}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {build.fallbackUsed ? (
              <span className="rounded-full border border-amber-300/30 bg-amber-300/12 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-amber-200">
                AI fallback used
              </span>
            ) : null}
            <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-slate-200">
              {formatElapsed(build.elapsedMs)}
            </span>
            {running ? (
              <ActionButton onClick={onCancelBuild} disabled={busyAction !== null} tone="secondary">
                <span className="material-symbols-outlined text-[18px]">stop_circle</span>
                Cancel build
              </ActionButton>
            ) : canRetry ? (
              <ActionButton onClick={onRetryBuild} disabled={busyAction !== null}>
                <span className="material-symbols-outlined text-[18px]">refresh</span>
                Retry build
              </ActionButton>
            ) : null}
          </div>
        </div>

        <div className="relative mt-6 h-3 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#2f8fff] via-cyan-300 to-emerald-300 transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="relative mt-6 grid gap-3 md:grid-cols-7">
          {BUILD_PHASES.map((phase, index) => {
            const activeIndex = BUILD_PHASES.findIndex((item) => item.key === activePhase)
            const active = phase.key === activePhase
            const complete = activeIndex > index || build.status === "success"
            return (
              <div
                key={phase.key}
                className={`rounded-2xl border p-3 transition ${
                  active
                    ? "border-cyan-300/60 bg-cyan-300/12 shadow-[0_0_35px_-18px_rgba(103,232,249,0.9)]"
                    : complete
                      ? "border-emerald-300/30 bg-emerald-300/10"
                      : "border-white/10 bg-white/[0.04]"
                }`}
              >
                <span className={`material-symbols-outlined text-[20px] ${active && running ? "animate-pulse text-cyan-200" : "text-slate-300"}`}>
                  {complete ? "check_circle" : phase.icon}
                </span>
                <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-300">{phase.label}</p>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid gap-px bg-white/10 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="bg-[#0d1422] p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Generated files</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {fileChips.length ? fileChips.map((file) => (
              <span key={file} className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs text-slate-200">
                {file}
              </span>
            )) : (
              <span className="text-sm text-slate-500">File output will appear here as the worker writes it.</span>
            )}
          </div>
          {build.commandsRun.length ? (
            <div className="mt-5 space-y-2">
              {build.commandsRun.slice(-3).map((command, index) => (
                <div key={`${command.command}-${index}`} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-bold text-slate-200">{command.command}</p>
                    <span className={command.status === "success" ? "text-xs font-bold text-emerald-300" : "text-xs font-bold text-red-300"}>
                      {command.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{command.summary}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="bg-[#050914] p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Live activity feed</p>
          <pre className="mt-4 max-h-72 overflow-auto rounded-2xl border border-white/10 bg-black/40 p-4 text-xs leading-6 text-slate-300 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {recentLogs.length ? recentLogs.join("\n") : "Awaiting worker logs..."}
          </pre>
        </div>
      </div>
    </div>
  )
}

function BuilderWorkspace({
  project,
  planView,
  buildRuns,
  busyAction,
  error,
  onApprovePlan,
  onRegeneratePlan,
  onStartBuild,
  onCancelBuild,
  onApplyBuildEdit,
}: {
  project: ProjectView
  planView: PlanView | null
  buildRuns: BuildRun[]
  busyAction: string | null
  error: string | null
  onApprovePlan: () => void
  onRegeneratePlan: () => void
  onStartBuild: () => void
  onCancelBuild: () => void
  onApplyBuildEdit: (instruction: string) => void
}) {
  const [editInstruction, setEditInstruction] = useState("")
  const plan = planView?.plan ?? null
  const approvedPlan = planView?.status === "approved"
  const latestBuild = buildRuns[0] ?? null
  const planStatus: StageStatus = approvedPlan ? "complete" : plan ? "active" : "active"
  const contractStatus: StageStatus = !approvedPlan ? "locked" : "complete"
  const buildStatus: StageStatus = !approvedPlan ? "locked" : latestBuild?.status === "success" ? "complete" : latestBuild ? "active" : "active"

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-32">
      <section className="rounded-[2rem] border border-[#e4ddd4] bg-[#111827] p-6 text-white shadow-[0_32px_80px_-42px_rgba(17,24,39,0.65)]">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-200/70">Plan-to-app pipeline</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">{plan?.metadata.productName || project.projectName}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Approve the product plan to create a build contract, then start the local worker. UI direction, security rules, and acceptance checks move with the contract.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusPill active={Boolean(plan)} label="Plan" />
            <StatusPill active={approvedPlan} label="Approved" />
            <StatusPill active={approvedPlan} label="Contract" />
            <StatusPill active={Boolean(latestBuild)} label="Build" />
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-[1.5rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      <StageCard
        step={1}
        title="Project Plan"
        description="Approve your project plan to unlock the internal build contract."
        status={planStatus}
        autoExpanded={!approvedPlan}
        statusLabel={approvedPlan ? "Approved" : plan ? "Draft ready" : "Awaiting context"}
      >
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
                <h3 className="font-semibold text-slate-900">Routes <span className="text-xs font-normal text-slate-400">({plan.routes.length} planned)</span></h3>
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
      </StageCard>

      <StageCard
        step={2}
        title="Build Contract"
        description="Flowro converts the approved plan into design, security, and business-logic guardrails for the coding agent."
        status={contractStatus}
        autoExpanded={approvedPlan && !latestBuild}
        statusLabel={contractStatus === "locked" ? "Locked" : "Ready"}
      >
        {!approvedPlan || !plan ? (
          <div className="rounded-[1.5rem] border border-dashed border-[#d9d1c6] bg-[#faf8f4] p-6 text-sm text-slate-600">
            Approve the project plan to generate the internal build contract.
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-[1.5rem] border border-[#d8e7fb] bg-[#f8fbff] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Design guardrails</p>
              <div className="mt-4 space-y-2">
                {plan.uiRequirements.slice(0, 5).map((item) => (
                  <div key={item} className="rounded-[1rem] bg-white px-4 py-3 text-sm text-slate-700">{item}</div>
                ))}
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-[#ebe4db] bg-white p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Agent guardrails</p>
              <div className="mt-4 grid gap-3">
                {["Use template components first", "Keep secrets out of client code", "Use local mock data unless integrations are approved", "Verify acceptance checks after build"].map((item) => (
                  <div key={item} className="flex gap-3 rounded-[1rem] bg-[#faf8f4] p-4 text-sm text-slate-700">
                    <span className="material-symbols-outlined mt-0.5 text-[18px] text-[#2f8fff]">verified</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </StageCard>

      <StageCard
        step={3}
        title="Local Build Worker"
        description="Run a local build and preview the generated app."
        status={buildStatus}
        autoExpanded={Boolean(approvedPlan && (!latestBuild || isBuildRunning(latestBuild)))}
        statusLabel={buildStatus === "locked" ? "Locked" : latestBuild?.status === "success" ? "Built" : latestBuild ? latestBuild.status : "Ready"}
      >
        {!approvedPlan ? (
          <div className="rounded-[1.5rem] border border-dashed border-[#d9d1c6] bg-[#faf8f4] p-6 text-sm text-slate-600">
            Approve the project plan before starting the build worker.
          </div>
        ) : (
          <div className="space-y-5">
            {!isBuildRunning(latestBuild) && latestBuild?.status !== "failed" && latestBuild?.status !== "canceled" ? (
              <ActionButton onClick={onStartBuild} disabled={busyAction !== null}>
                <span className="material-symbols-outlined text-[18px]">terminal</span>
                Start Build
              </ActionButton>
            ) : null}

            {latestBuild ? (
              <div className="space-y-4">
                <BuildMissionControl
                  build={latestBuild}
                  busyAction={busyAction}
                  onCancelBuild={onCancelBuild}
                  onRetryBuild={onStartBuild}
                />

                {latestBuild.previewAvailable && latestBuild.previewUrl && (
                  <div className="space-y-4">
                    <form
                      onSubmit={(event) => {
                        event.preventDefault()
                        const trimmed = editInstruction.trim()
                        if (!trimmed) return
                        onApplyBuildEdit(trimmed)
                        setEditInstruction("")
                      }}
                      className="rounded-[1.5rem] border border-[#d8e7fb] bg-[#f8fbff] p-4"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                        <div className="min-w-0 flex-1">
                          <label htmlFor="targeted-build-edit" className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                            Targeted preview edit
                          </label>
                          <input
                            id="targeted-build-edit"
                            value={editInstruction}
                            onChange={(event) => setEditInstruction(event.target.value)}
                            disabled={busyAction !== null || isBuildRunning(latestBuild)}
                            placeholder="Example: change the dashboard title to Team Command Center"
                            className="mt-2 w-full rounded-2xl border border-[#d7e4f8] bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#2f8fff] focus:ring-4 focus:ring-[#2f8fff]/10 disabled:cursor-not-allowed disabled:opacity-60"
                          />
                        </div>
                        <ActionButton disabled={busyAction !== null || isBuildRunning(latestBuild) || !editInstruction.trim()} onClick={() => {
                          const trimmed = editInstruction.trim()
                          if (!trimmed) return
                          onApplyBuildEdit(trimmed)
                          setEditInstruction("")
                        }}>
                          <span className="material-symbols-outlined text-[18px]">edit_note</span>
                          Apply edit
                        </ActionButton>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        P0 edits modify one existing generated file at a time. New pages, dependencies, and config changes are blocked.
                      </p>
                    </form>

                    <div className="overflow-hidden rounded-[1.5rem] border border-[#d8e7fb] bg-white">
                      <div className="flex items-center justify-between border-b border-[#e4ddd4] bg-[#faf8f4] px-5 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Live Preview</p>
                        <a
                          href={latestBuild.previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-bold uppercase tracking-[0.16em] text-[#2f8fff] hover:underline"
                        >
                          Open tab
                        </a>
                        <span className="inline-flex h-2 w-2 rounded-full bg-green-500" />
                      </div>
                      <iframe
                        src={latestBuild.previewUrl}
                        title="Generated app preview"
                        className="h-[500px] w-full border-0"
                        sandbox="allow-scripts allow-same-origin allow-forms"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-[#d9d1c6] bg-[#faf8f4] p-6 text-sm text-slate-600">
                No build run yet. The first run creates generated app files from the approved build contract.
              </div>
            )}
          </div>
        )}
      </StageCard>
    </div>
  )
}

export default function ChatView({ projectId, initialMessage, user, onBack: _onBack }: ChatViewProps) {
  void _onBack

  const [project, setProject] = useState<ProjectView | null>(null)
  const [draftPlan, setDraftPlan] = useState<PlanView | null>(null)
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
  const latestBuild = buildRuns[0] ?? null
  const latestBuildId = latestBuild?.id
  const shouldPollBuild = isBuildRunning(latestBuild)

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
          <p className="mt-2 text-sm text-slate-500">Syncing plan, contract, and build state.</p>
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

        <div className={`min-h-0 flex-1 ${mobilePane === "chat" ? "hidden" : "block"} lg:block`}>
          <WorkspaceTabs
            previewAvailable={Boolean(latestBuild?.previewAvailable && latestBuild?.previewUrl)}
            uiViewsCount={draftPlan ? 1 : 0}
            renderTab={(tab: WorkspaceTabKey) => {
              if (tab === "preview" && latestBuild?.previewUrl) {
                return (
                  <iframe
                    src={latestBuild.previewUrl}
                    title="Generated app preview"
                    className="h-full w-full border-0 bg-white"
                    sandbox="allow-scripts allow-same-origin allow-forms"
                  />
                )
              }
              if (tab === "ui") {
                return (
                  <div className="px-4 py-6 sm:px-6 lg:px-8">
                    {!draftPlan ? (
                      <EmptyTab icon="grid_view" title="No build contract yet" body="Generate and approve a project plan to see the build contract." />
                    ) : (
                      <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-2">
                        <div className="rounded-[1.5rem] border border-[#d8e7fb] bg-[#f8fbff] p-5">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Visual direction</p>
                          <div className="mt-4 space-y-2">
                            {draftPlan.plan.uiRequirements.map((item) => (
                              <div key={item} className="rounded-[1rem] bg-white px-4 py-3 text-sm text-slate-700">{item}</div>
                            ))}
                          </div>
                        </div>
                        <div className="rounded-[1.5rem] border border-[#ebe4db] bg-white p-5">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Build contract</p>
                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-[1rem] bg-[#faf8f4] p-4">
                              <p className="text-2xl font-black text-slate-900">{draftPlan.plan.routes.length}</p>
                              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Routes</p>
                            </div>
                            <div className="rounded-[1rem] bg-[#faf8f4] p-4">
                              <p className="text-2xl font-black text-slate-900">{draftPlan.plan.acceptanceChecks.length}</p>
                              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Checks</p>
                            </div>
                          </div>
                          <div className="mt-4 space-y-2">
                            {draftPlan.plan.acceptanceChecks.slice(0, 5).map((check) => (
                              <div key={check} className="flex gap-2 rounded-[1rem] bg-emerald-50 p-3 text-sm text-emerald-900">
                                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                                <span>{check}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              }
              if (tab === "code") {
                return <EmptyTab icon="code" title="Code view" body="Inline code browsing arrives in a future release." />
              }
              if (tab === "files") {
                return <EmptyTab icon="folder_open" title="Files" body="File tree and downloads are coming soon." />
              }
              return (
                <div className="px-4 py-6 sm:px-6 lg:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <BuilderWorkspace
                      project={project}
                      planView={draftPlan}
                      buildRuns={buildRuns}
                      busyAction={busyAction}
                      error={workspaceError}
                      onApprovePlan={handleApprovePlan}
                      onRegeneratePlan={handleRegeneratePlan}
                      onStartBuild={handleStartBuild}
                      onCancelBuild={handleCancelBuild}
                      onApplyBuildEdit={handleApplyBuildEdit}
                    />
                </div>
              )
            }}
          />
        </div>
      </div>
    </div>
  )
}
