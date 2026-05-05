import type { BuildRun } from "@/lib/project-plan/schema"

type PreviewRunCandidate = Pick<BuildRun, "status" | "previewAvailable" | "previewUrl" | "targetWorkspacePath">

export function findLatestSuccessfulPreviewRun<T extends PreviewRunCandidate>(runs: T[]): T | null {
    return runs.find((run) => run.status === "success" && run.previewAvailable && Boolean(run.previewUrl)) ?? null
}

export function findLatestRelaunchablePreviewRun<T extends PreviewRunCandidate>(runs: T[]): T | null {
    return runs.find((run) => run.status === "success" && run.previewAvailable && Boolean(run.targetWorkspacePath)) ?? null
}

export function findLatestRecoverablePreviewRun<T extends PreviewRunCandidate>(runs: T[]): T | null {
    return runs.find((run) => Boolean(run.targetWorkspacePath)) ?? null
}
