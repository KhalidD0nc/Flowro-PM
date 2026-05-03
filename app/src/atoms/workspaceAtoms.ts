import { atom } from "jotai"
import { atomWithStorage } from "jotai/utils"
import type { WorkspaceTabKey } from "@/components/workspace/WorkspaceTabs"
import type { BuildRun } from "@/lib/project-plan/schema"

// Persisted split percentage for the chat/workspace pane divider
export const chatSplitAtom = atomWithStorage<number>(
  "flowro_builder_chat_split",
  34
)

// Active workspace tab
export const workspaceTabAtom = atomWithStorage<WorkspaceTabKey>(
  "flowro_workspace_tab",
  "plan"
)

// Current build run state — not persisted (reset on mount)
export const buildRunAtom = atom<BuildRun | null>(null)

// Whether a build is currently in progress
export const buildInProgressAtom = atom((get) => {
  const run = get(buildRunAtom)
  if (!run) return false
  const phase: string = run.phase ?? "queued"
  return !["completed", "failed", "preview"].includes(phase)
})
