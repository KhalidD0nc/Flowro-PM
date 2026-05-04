"use client"

import type { ReactNode } from "react"
import type { BuildRun } from "@/lib/project-plan/schema"

export const BUILD_TERMINAL_STATUSES = new Set(["success", "failed", "canceled"])

export function isBuildRunning(build: BuildRun | null) {
  return Boolean(build && !BUILD_TERMINAL_STATUSES.has(build.status))
}

export function mergeBuildRun(current: BuildRun[], nextRun: BuildRun): BuildRun[] {
  const existingIndex = current.findIndex((run) => run.id === nextRun.id)
  if (existingIndex === -1) return [nextRun, ...current]
  return current.map((run, index) => index === existingIndex ? nextRun : run)
}

export function ActionButton({
  children,
  onClick,
  disabled,
  tone = "primary",
}: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  tone?: "primary" | "secondary" | "danger"
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
        tone === "primary"
          ? "bg-[#111111] text-white shadow-[0_16px_30px_-22px_rgba(17,17,17,0.45)] hover:bg-[#2a2a2a]"
          : tone === "danger"
            ? "border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
            : "border border-[#eceae4] bg-white text-[#3d3d3d] hover:bg-[#f7f7f4]"
      }`}
    >
      {children}
    </button>
  )
}
