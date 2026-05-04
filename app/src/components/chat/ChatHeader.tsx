"use client";

import Image from "next/image";
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
  draft: "border-white/[0.08] bg-white/[0.04] text-slate-400",
  active: "border-[#2f8fff]/30 bg-[#2f8fff]/10 text-[#78b7ff]",
  approved: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
  built: "border-violet-400/25 bg-violet-400/10 text-violet-300",
};

export default function ChatHeader({ project, onOpenBlueprint }: ChatHeaderProps) {
  const status = statusForProject(project);

  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-white/[0.07] bg-[#111216]/92 px-4 py-3 backdrop-blur-xl">
      <button
        type="button"
        onClick={onOpenBlueprint}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-1 text-left transition hover:bg-white/[0.04]"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.05]">
          <Image src="/logo.png" alt="" width={20} height={20} className="h-5 w-5 object-contain" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-100">{project.projectName}</p>
          {project.updatedAt || project.createdAt ? (
            <p className="truncate text-[11px] text-slate-500">
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
