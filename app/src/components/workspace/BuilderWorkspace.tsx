"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import type { User } from "firebase/auth"
import type { BuildRun } from "@/lib/project-plan/schema"
import type { ProjectView } from "@/lib/types/views"
import { ActionButton, isBuildRunning } from "@/components/workspace/BuildMissionControl"
import { authPost } from "@/lib/authFetch"

export type PlanView = NonNullable<ProjectView["latestPlan"]>

const SHIPPER_STEPS = [
  "Setting up environment",
  "Loading dependencies",
  "Configuring workspace",
  "Building project",
]

export function EmptyTab({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="flex h-full items-center justify-center px-6 py-12">
      <div className="max-w-sm text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-[#eceae4] bg-white shadow-[0_18px_34px_-30px_rgba(17,17,17,0.25)]">
          <span className="material-symbols-outlined text-[26px] text-[#3d3d3d]">{icon}</span>
        </div>
        <h3 className="mt-4 text-lg font-semibold text-[#111111]">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-[#6b7280]">{body}</p>
      </div>
    </div>
  )
}

function PlanApprovalView({
  project,
  planView,
  busyAction,
  onApprovePlan,
  onRegeneratePlan,
}: {
  project: ProjectView
  planView: PlanView | null
  busyAction: string | null
  onApprovePlan: () => void
  onRegeneratePlan: () => void
}) {
  const plan = planView?.plan ?? null

  return (
    <section className="mx-auto max-w-5xl rounded-[1.65rem] border border-[#eceae4] bg-white p-6 text-[#111111] shadow-[0_28px_70px_-56px_rgba(17,17,17,0.35)]">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6b7280]">Project plan</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            {plan?.metadata.productName || project.projectName}
          </h1>
          <p className="mt-3 text-sm leading-7 text-[#5f5f5d]">
            Review the plan. Approval starts building automatically.
          </p>
        </div>
        <span className="rounded-full bg-[#f4f4f1] px-3 py-1.5 text-xs font-medium text-[#5f5f5d]">
          {plan ? "Ready" : "Waiting"}
        </span>
      </div>

      {!plan ? (
        <div className="mt-6 rounded-2xl border border-dashed border-[#dedbd3] bg-[#fafaf8] p-6 text-sm leading-7 text-[#6b7280]">
          Flowro is still collecting context. Answer the setup questions in chat to generate the first plan.
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          <div className="rounded-2xl bg-[#f7f7f4] p-5">
            <p className="text-base font-semibold leading-7">{plan.appSummary}</p>
            <p className="mt-3 text-sm leading-7 text-[#5f5f5d]">{plan.problem}</p>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-2xl bg-[#f7f7f4] p-5">
              <h2 className="text-sm font-semibold">Screens</h2>
              <div className="mt-4 space-y-3">
                {plan.routes.map((route) => (
                  <div key={route.path} className="rounded-2xl bg-white px-4 py-3">
                    <p className="text-sm font-semibold">
                      {route.name} <span className="font-normal text-[#6b7280]">{route.path}</span>
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[#5f5f5d]">{route.purpose}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-[#f7f7f4] p-5">
              <h2 className="text-sm font-semibold">Implementation notes</h2>
              <div className="mt-4 space-y-2">
                {plan.uiRequirements.slice(0, 4).map((item) => (
                  <div key={item} className="rounded-2xl bg-white px-4 py-3 text-sm leading-6 text-[#3d3d3d]">{item}</div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <ActionButton onClick={onApprovePlan} disabled={busyAction !== null}>
              <span className="material-symbols-outlined text-[18px]">task_alt</span>
              Approve and build
            </ActionButton>
            <ActionButton onClick={onRegeneratePlan} disabled={busyAction !== null} tone="secondary">
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              Regenerate plan
            </ActionButton>
          </div>
        </div>
      )}
    </section>
  )
}

function getActiveBuildStep(build: BuildRun | null) {
  if (!build) return 0
  const phase = build.phase || "queued"
  if (phase === "queued" || phase === "planning") return 0
  if (phase === "installing") return 1
  if (phase === "generating") return 2
  return 3
}

function BuildingView({
  build,
  busyAction,
  onCancelBuild,
  onRetryBuild,
}: {
  build: BuildRun | null
  busyAction: string | null
  onCancelBuild: () => void
  onRetryBuild: () => void
}) {
  const running = isBuildRunning(build)
  const failed = build?.status === "failed" || build?.status === "canceled"
  const activeStep = getActiveBuildStep(build)
  const heroImage = activeStep <= 1 ? "/puzzle.png" : "/Laptop.png"

  return (
    <section className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
      <div className="relative flex min-h-[72vh] w-full max-w-6xl items-center justify-center overflow-hidden rounded-[1.65rem] border border-[#e7e4dc] bg-white shadow-[0_30px_80px_-60px_rgba(17,17,17,0.35)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(30,154,128,0.08),transparent_26rem)]" />
        <div className="relative flex w-full max-w-xl flex-col items-center px-6 py-12 text-center">
          <Image
            src={heroImage}
            alt=""
            width={190}
            height={150}
            priority
            className="h-36 w-auto object-contain opacity-80"
          />
          <h1 className="mt-10 text-2xl font-semibold tracking-tight text-[#111111]">
            {failed ? "Build needs attention" : "Building Application"}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-[#3d3d3d]">
            {failed
              ? "The local build stopped before the preview was ready."
              : "Running build commands and compiling your app. This may take a moment..."}
          </p>

          {failed ? (
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <ActionButton onClick={onRetryBuild} disabled={busyAction !== null}>
                <span className="material-symbols-outlined text-[18px]">refresh</span>
                Retry
              </ActionButton>
            </div>
          ) : (
            <div className="mt-10 w-full max-w-sm space-y-5 text-left">
              {SHIPPER_STEPS.map((step, index) => {
                const active = index === activeStep
                const complete = index < activeStep
                return (
                  <div
                    key={step}
                    className={`flex items-center gap-5 transition duration-300 ${
                      active ? "opacity-100" : complete ? "opacity-55" : "opacity-25"
                    }`}
                  >
                    <span
                      className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
                        active
                          ? "bg-[#f4f4f1] text-[#1e9a80] shadow-[0_14px_30px_-24px_rgba(30,154,128,0.8)]"
                          : complete
                            ? "bg-[#e9f6f2] text-[#1e9a80]"
                            : "bg-[#f4f4f1] text-[#6b7280]"
                      }`}
                    >
                      <span className={`material-symbols-outlined text-[19px] ${active && running ? "animate-pulse" : ""}`}>
                        {complete ? "check_circle" : index <= 1 ? "deployed_code" : "code_blocks"}
                      </span>
                    </span>
                    <span className="text-base font-medium text-[#3d3d3d]">{step}</span>
                  </div>
                )
              })}
            </div>
          )}

          {running ? (
            <button
              type="button"
              onClick={onCancelBuild}
              disabled={busyAction !== null}
              className="mt-10 rounded-full px-4 py-2 text-sm font-medium text-[#6b7280] transition hover:bg-[#f4f4f1] hover:text-[#111111] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Stop build
            </button>
          ) : null}
        </div>
      </div>
    </section>
  )
}

function PreviewOnly({ projectId, previewUrl, user }: { projectId: string; previewUrl: string; user: User }) {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let canceled = false
    async function ensureRunning() {
      try {
        const res = await authPost(`/api/projects/${projectId}/build/relaunch`, user, {})
        if (!res.ok) {
          const data = await res.json()
          if (!canceled) setError(data.error || "Failed to start preview server")
          return
        }
        if (!canceled) setReady(true)
      } catch {
        if (!canceled) setError("Could not reach preview server")
      }
    }
    void ensureRunning()
    return () => { canceled = true }
  }, [projectId, user])

  if (error) {
    return (
      <div className="flex h-full min-h-screen items-center justify-center">
        <p className="text-sm text-[#6b7280]">{error}</p>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="flex h-full min-h-screen items-center justify-center">
        <p className="text-sm text-[#6b7280]">Starting preview…</p>
      </div>
    )
  }

  return (
    <iframe
      src={previewUrl}
      title="Generated app preview"
      className="h-full min-h-screen w-full border-0 bg-white"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
    />
  )
}

export function BuilderWorkspace({
  project,
  planView,
  buildRuns,
  busyAction,
  error,
  user,
  onApprovePlan,
  onRegeneratePlan,
  onStartBuild,
  onCancelBuild,
}: {
  project: ProjectView
  planView: PlanView | null
  buildRuns: BuildRun[]
  busyAction: string | null
  error: string | null
  user: User
  onApprovePlan: () => void
  onRegeneratePlan: () => void
  onStartBuild: () => void
  onCancelBuild: () => void
  onApplyBuildEdit: (instruction: string) => void
}) {
  const approvedPlan = planView?.status === "approved"
  const latestBuild = buildRuns[0] ?? null

  if (!approvedPlan) {
    return (
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6 lg:px-8">
        {error ? (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        ) : null}
        <PlanApprovalView
          project={project}
          planView={planView}
          busyAction={busyAction}
          onApprovePlan={onApprovePlan}
          onRegeneratePlan={onRegeneratePlan}
        />
      </div>
    )
  }

  if (latestBuild?.previewAvailable && latestBuild.previewUrl) {
    return <PreviewOnly projectId={project.id} previewUrl={latestBuild.previewUrl} user={user} />
  }

  return (
    <>
      {error ? (
        <div className="mx-4 mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 sm:mx-6 lg:mx-8">
          {error}
        </div>
      ) : null}
      <BuildingView
        build={latestBuild}
        busyAction={busyAction}
        onCancelBuild={onCancelBuild}
        onRetryBuild={onStartBuild}
      />
    </>
  )
}
