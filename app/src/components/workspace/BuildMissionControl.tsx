"use client"

import type { BuildRun } from "@/lib/project-plan/schema"

export const BUILD_TERMINAL_STATUSES = new Set(["success", "failed", "canceled"])

export const BUILD_PHASES: Array<{ key: NonNullable<BuildRun["phase"]>; label: string; icon: string }> = [
  { key: "queued", label: "Queued", icon: "hourglass_top" },
  { key: "planning", label: "Planning", icon: "route" },
  { key: "generating", label: "Generating", icon: "auto_fix_high" },
  { key: "installing", label: "Installing", icon: "deployed_code" },
  { key: "building", label: "Building", icon: "construction" },
  { key: "repairing", label: "Repairing", icon: "build" },
  { key: "preview", label: "Preview", icon: "smart_display" },
]

export function isBuildRunning(build: BuildRun | null) {
  return Boolean(build && !BUILD_TERMINAL_STATUSES.has(build.status))
}

export function mergeBuildRun(current: BuildRun[], nextRun: BuildRun): BuildRun[] {
  const existingIndex = current.findIndex((run) => run.id === nextRun.id)
  if (existingIndex === -1) return [nextRun, ...current]
  return current.map((run, index) => index === existingIndex ? nextRun : run)
}

export function formatElapsed(ms?: number) {
  if (!ms) return "00:00"
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0")
  const seconds = (totalSeconds % 60).toString().padStart(2, "0")
  return `${minutes}:${seconds}`
}

export function getBuildProgress(build: BuildRun | null) {
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

export function ActionButton({
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

export function StatusPill({ active, label }: { active: boolean; label: string }) {
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

export function BuildMissionControl({
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
