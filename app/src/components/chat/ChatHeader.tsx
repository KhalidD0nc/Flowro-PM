"use client";

import type { ProjectView } from "@/lib/types/views";

interface ChatHeaderProps {
  project: ProjectView;
  onOpenBlueprint?: () => void;
}

function statusForProject(project: ProjectView): { label: string; tone: "draft" | "active" | "approved" | "built" } {
  if (project.buildRuns?.some((run) => run.status === "success")) return { label: "Built", tone: "built" };
  if (project.latestPlan?.status === "approved") return { label: "Plan approved", tone: "approved" };
  if (project.latestPlan) return { label: "Plan draft", tone: "active" };
  return { label: "Drafting", tone: "draft" };
}

const TONE_STYLES: Record<"draft" | "active" | "approved" | "built", string> = {
  draft: "border-[#e8e0d6] bg-white text-slate-500 dark:border-white/[0.06] dark:bg-[#1A1A1D] dark:text-white/[0.5]",
  active: "border-[#bfd8ff] bg-[#edf5ff] text-[#2f8fff] dark:border-[#5B8DEF]/30 dark:bg-[#5B8DEF]/10 dark:text-[#5B8DEF]",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400",
  built: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-400",
};

export default function ChatHeader({ project, onOpenBlueprint }: ChatHeaderProps) {
  const status = statusForProject(project);

  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-[#e8e0d6] bg-white/85 px-4 py-3 backdrop-blur-md dark:border-white/[0.06] dark:bg-[#0C0C0E]/85">
      <button
        type="button"
        onClick={onOpenBlueprint}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-1 text-left transition hover:bg-[#fbf7f1] dark:hover:bg-[#1E1E22]"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-[#e8e0d6] bg-white dark:border-white/[0.06] dark:bg-[#1A1A1D]">
          <img src="/logo.png" alt="" className="h-5 w-5 object-contain" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white/[0.9]">{project.projectName}</p>
          {project.updatedAt || project.createdAt ? (
            <p className="truncate text-[11px] text-slate-500 dark:text-white/[0.5]">
              Updated {new Date(project.updatedAt || project.createdAt!).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
            </p>
          ) : null}
        </div>
      </button>

      <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${TONE_STYLES[status.tone]}`}>
        {status.label}
      </span>
    </header>
  );
}
