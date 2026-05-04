"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { authGet } from "@/lib/authFetch";
import type { ProjectView } from "@/lib/types/views";

interface ChatHeaderProps {
  project: ProjectView;
  user?: User;
  onOpenBlueprint?: () => void;
  onProjectSelect?: (projectId: string) => void;
  onGoHome?: () => void;
}

interface RecentProject {
  id: string;
  name?: string;
  projectName?: string;
  updatedAt: string;
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

export default function ChatHeader({ project, user, onProjectSelect, onGoHome }: ChatHeaderProps) {
  const status = statusForProject(project);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const savedLabel = project.updatedAt || project.createdAt
    ? `Previewing last saved version · ${new Date(project.updatedAt || project.createdAt!).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`
    : "Previewing last saved version";

  const fetchRecentProjects = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoadingProjects(true);
      const response = await authGet("/api/projects", user);
      if (!response.ok) return;
      const data = await response.json();
      const sortedProjects = ((data.projects || []) as RecentProject[])
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5);
      setRecentProjects(sortedProjects);
    } finally {
      setIsLoadingProjects(false);
    }
  }, [user]);

  useEffect(() => {
    if (!isMenuOpen) return;
    void fetchRecentProjects();
  }, [fetchRecentProjects, isMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isMenuOpen]);

  const handleProjectSelect = (projectId: string) => {
    setIsMenuOpen(false);
    if (projectId !== project.id) {
      onProjectSelect?.(projectId);
    }
  };

  return (
    <header className="relative shrink-0 border-b border-white/[0.055] bg-[#191919]" ref={menuRef}>
      <div className="flex min-h-[86px] w-full min-w-0 items-start gap-3 rounded-b-[1.65rem] border-b border-white/[0.055] bg-[#1b1b1b] px-5 py-4 shadow-[0_18px_32px_-30px_rgba(0,0,0,0.85)]">
        <button
          type="button"
          onClick={() => setIsMenuOpen((current) => !current)}
          aria-expanded={isMenuOpen}
          aria-haspopup="menu"
          className="flex min-w-0 flex-1 items-start gap-3 rounded-xl text-left transition hover:bg-white/[0.035] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4169ff]"
        >
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl">
            <Image src="/logo.png" alt="" width={20} height={20} className="h-5 w-5 object-contain" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <p className="truncate text-[17px] font-semibold leading-6 text-[#efefef]">{project.projectName}</p>
              <span className={`material-symbols-outlined shrink-0 text-[17px] text-[#7f7f7f] transition ${isMenuOpen ? "rotate-180" : ""}`}>
                keyboard_arrow_down
              </span>
            </div>
            <p className="mt-0.5 truncate text-sm leading-5 text-[#a0a0a0]">{savedLabel}</p>
          </div>
        </button>
        <span className={`mt-1 shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${TONE_STYLES[status.tone]}`}>
          {status.label}
        </span>
      </div>

      {isMenuOpen ? (
        <div className="absolute left-4 right-4 top-[78px] z-50 overflow-hidden rounded-[1.1rem] border border-white/[0.09] bg-[#242423] shadow-[0_24px_58px_-30px_rgba(0,0,0,0.95)]" role="menu">
          <button
            type="button"
            onClick={() => {
              setIsMenuOpen(false);
              onGoHome?.();
            }}
            className="flex min-h-12 w-full items-center gap-3 border-b border-white/[0.08] px-4 py-3 text-left text-sm font-medium text-[#f0f0ed] transition hover:bg-white/[0.055]"
            role="menuitem"
          >
            <span className="material-symbols-outlined text-[18px] text-[#a8a8a5]">home</span>
            Back to home
          </button>

          <div className="px-3 py-2">
            <p className="px-1 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8f8f8b]">Recent projects</p>
            {isLoadingProjects ? (
              <div className="px-1 py-3 text-sm text-[#a8a8a5]">Loading projects...</div>
            ) : recentProjects.length ? (
              recentProjects.map((recentProject) => {
                const isActive = recentProject.id === project.id;
                const projectName = recentProject.projectName || recentProject.name || "Untitled Project";

                return (
                  <button
                    key={recentProject.id}
                    type="button"
                    onClick={() => handleProjectSelect(recentProject.id)}
                    className={`flex min-h-12 w-full items-center gap-3 rounded-[0.8rem] px-3 py-2 text-left transition ${
                      isActive ? "bg-[#4169ff]/14 text-[#dce4ff]" : "text-[#d8d8d5] hover:bg-white/[0.055]"
                    }`}
                    role="menuitem"
                  >
                    <span className={`material-symbols-outlined text-[18px] ${isActive ? "text-[#9fb0ff]" : "text-[#8f8f8b]"}`}>description</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{projectName}</span>
                      <span className="mt-0.5 block text-xs text-[#8f8f8b]">{new Date(recentProject.updatedAt).toLocaleDateString()}</span>
                    </span>
                    {isActive ? <span className="material-symbols-outlined text-[17px] text-[#9fb0ff]">check</span> : null}
                  </button>
                );
              })
            ) : (
              <div className="px-1 py-3 text-sm text-[#a8a8a5]">No recent projects found.</div>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
