"use client"

import { useState } from "react"
import type { BuildRun } from "@/lib/project-plan/schema"
import type { ProjectView } from "@/lib/types/views"
import StageCard, { type StageStatus } from "@/components/workspace/StageCard"
import { ActionButton, StatusPill, BuildMissionControl, isBuildRunning } from "@/components/workspace/BuildMissionControl"

export type PlanView = NonNullable<ProjectView["latestPlan"]>

export function EmptyTab({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="flex h-full items-center justify-center px-6 py-12">
      <div className="max-w-sm text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-white shadow-[0_18px_36px_-26px_rgba(29,41,65,0.25)] dark:bg-[#1A1A1D]">
          <span className="material-symbols-outlined text-[26px] text-[#2f8fff]">{icon}</span>
        </div>
        <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white/[0.9]">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-white/[0.5]">{body}</p>
        <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#fef3c7] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          Coming soon
        </span>
      </div>
    </div>
  )
}

export function BuilderWorkspace({
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
      <section className="rounded-[2rem] border border-[#e4ddd4] bg-[#111827] p-6 text-white shadow-[0_32px_80px_-42px_rgba(17,24,39,0.65)] dark:border-white/[0.06] dark:bg-[#141416]">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-200/70 dark:text-[#5B8DEF]/70">Plan-to-app pipeline</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight dark:text-white/[0.9]">{plan?.metadata.productName || project.projectName}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 dark:text-white/[0.6]">
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
        <div className="rounded-[1.5rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-900/10 dark:text-red-400">
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
          <div className="rounded-[1.5rem] border border-dashed border-[#d9d1c6] bg-[#faf8f4] p-6 text-sm leading-7 text-slate-600 dark:border-white/[0.06] dark:bg-[#1A1A1D] dark:text-white/[0.6]">
            Flowro is still collecting the initial context. Answer the setup questions in chat to generate the first project plan.
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2 rounded-[1.5rem] border border-[#ebe4db] bg-[#fcfaf7] p-5 dark:border-white/[0.06] dark:bg-[#1A1A1D]">
                <p className="text-sm font-semibold text-slate-900 dark:text-white/[0.9]">{plan.appSummary}</p>
                <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-white/[0.6]">{plan.problem}</p>
              </div>
              <div className="rounded-[1.5rem] border border-[#d8e7fb] bg-[#f8fbff] p-5 dark:border-[#5B8DEF]/15 dark:bg-[#5B8DEF]/5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-white/[0.4]">Template</p>
                <p className="mt-2 text-base font-semibold text-slate-900 dark:text-white/[0.9]">{plan.templateId}</p>
                <p className="mt-2 text-sm text-slate-500 dark:text-white/[0.5]">Template-first generation; the AI cannot invent the base stack.</p>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-[1.5rem] border border-[#ebe4db] bg-white p-5 dark:border-white/[0.06] dark:bg-[#141416]">
                <h3 className="font-semibold text-slate-900 dark:text-white/[0.9]">Routes <span className="text-xs font-normal text-slate-400 dark:text-white/[0.4]">({plan.routes.length} planned)</span></h3>
                <div className="mt-4 space-y-3">
                  {plan.routes.map((route) => (
                    <div key={route.path} className="rounded-[1rem] bg-[#faf8f4] p-4 dark:bg-[#1A1A1D]">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white/[0.9]">{route.name} <span className="text-slate-400 dark:text-white/[0.4]">{route.path}</span></p>
                      <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-white/[0.6]">{route.purpose}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-[#ebe4db] bg-white p-5 dark:border-white/[0.06] dark:bg-[#141416]">
                <h3 className="font-semibold text-slate-900 dark:text-white/[0.9]">Build Tasks</h3>
                <div className="mt-4 space-y-3">
                  {plan.buildTasks.map((task) => (
                    <div key={task.id} className="rounded-[1rem] bg-[#faf8f4] p-4 dark:bg-[#1A1A1D]">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white/[0.9]">{task.id}: {task.title}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-white/[0.6]">{task.description}</p>
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
                <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
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
          <div className="rounded-[1.5rem] border border-dashed border-[#d9d1c6] bg-[#faf8f4] p-6 text-sm text-slate-600 dark:border-white/[0.06] dark:bg-[#1A1A1D] dark:text-white/[0.6]">
            Approve the project plan to generate the internal build contract.
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-[1.5rem] border border-[#d8e7fb] bg-[#f8fbff] p-5 dark:border-[#5B8DEF]/15 dark:bg-[#5B8DEF]/5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-white/[0.4]">Design guardrails</p>
              <div className="mt-4 space-y-2">
                {plan.uiRequirements.slice(0, 5).map((item) => (
                  <div key={item} className="rounded-[1rem] bg-white px-4 py-3 text-sm text-slate-700 dark:bg-[#0C0C0E] dark:text-white/[0.7]">{item}</div>
                ))}
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-[#ebe4db] bg-white p-5 dark:border-white/[0.06] dark:bg-[#141416]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-white/[0.4]">Agent guardrails</p>
              <div className="mt-4 grid gap-3">
                {["Use template components first", "Keep secrets out of client code", "Use local mock data unless integrations are approved", "Verify acceptance checks after build"].map((item) => (
                  <div key={item} className="flex gap-3 rounded-[1rem] bg-[#faf8f4] p-4 text-sm text-slate-700 dark:bg-[#1A1A1D] dark:text-white/[0.7]">
                    <span className="material-symbols-outlined mt-0.5 text-[18px] text-[#2f8fff] dark:text-[#5B8DEF]">verified</span>
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
          <div className="rounded-[1.5rem] border border-dashed border-[#d9d1c6] bg-[#faf8f4] p-6 text-sm text-slate-600 dark:border-white/[0.06] dark:bg-[#1A1A1D] dark:text-white/[0.6]">
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
                      className="rounded-[1.5rem] border border-[#d8e7fb] bg-[#f8fbff] p-4 dark:border-[#5B8DEF]/15 dark:bg-[#5B8DEF]/5"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                        <div className="min-w-0 flex-1">
                          <label htmlFor="targeted-build-edit" className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-white/[0.4]">
                            Targeted preview edit
                          </label>
                          <input
                            id="targeted-build-edit"
                            value={editInstruction}
                            onChange={(event) => setEditInstruction(event.target.value)}
                            disabled={busyAction !== null || isBuildRunning(latestBuild)}
                            placeholder="Example: change the dashboard title to Team Command Center"
                            className="mt-2 w-full rounded-2xl border border-[#d7e4f8] bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#2f8fff] focus:ring-4 focus:ring-[#2f8fff]/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[0.06] dark:bg-[#0C0C0E] dark:text-white/[0.9] dark:placeholder:text-white/[0.4] dark:focus:border-[#5B8DEF] dark:focus:ring-[#5B8DEF]/10"
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
                      <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-white/[0.5]">
                        P0 edits modify one existing generated file at a time. New pages, dependencies, and config changes are blocked.
                      </p>
                    </form>

                    <div className="overflow-hidden rounded-[1.5rem] border border-[#d8e7fb] bg-white dark:border-white/[0.06] dark:bg-[#141416]">
                      <div className="flex items-center justify-between border-b border-[#e4ddd4] bg-[#faf8f4] px-5 py-3 dark:border-white/[0.06] dark:bg-[#1A1A1D]">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-white/[0.4]">Live Preview</p>
                        <a
                          href={latestBuild.previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-bold uppercase tracking-[0.16em] text-[#2f8fff] hover:underline dark:text-[#5B8DEF]"
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
              <div className="rounded-[1.5rem] border border-dashed border-[#d9d1c6] bg-[#faf8f4] p-6 text-sm text-slate-600 dark:border-white/[0.06] dark:bg-[#1A1A1D] dark:text-white/[0.6]">
                No build run yet. The first run creates generated app files from the approved build contract.
              </div>
            )}
          </div>
        )}
      </StageCard>
    </div>
  )
}
