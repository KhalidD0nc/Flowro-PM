/**
 * Phase 3 — Fully Functional Command Center
 *
 * Command Center main content layout.
 * Fetches real projects from API.
 */

"use client";

import VisionInput from "./VisionInput";
import type { ProjectType } from "@/lib/slides/schema";

interface CommandCenterProps {
  onProjectCreated?: (projectId: string, initialMessage: string, projectType: ProjectType) => void;
  defaultProjectType?: ProjectType;
}

export default function CommandCenter({ onProjectCreated, defaultProjectType = "app" }: CommandCenterProps) {
  return (
    <main className="command-center-bg relative flex flex-1 flex-col overflow-hidden p-3 text-white sm:p-4">
      <div className="relative flex min-h-full flex-1 flex-col overflow-hidden rounded-[1.65rem] bg-[#1b1b1b] shadow-[0_34px_120px_-72px_rgba(0,0,0,0.95)]">
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-24 pt-16 sm:px-6">
          <div className="mb-7 hidden items-center gap-2 rounded-full border border-white/[0.08] bg-[#20242d]/80 px-3.5 py-2 text-sm font-semibold text-white/88 shadow-[0_18px_40px_-28px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:flex">
            <span>Build apps and slides from one prompt</span>
            <span className="material-symbols-outlined text-[18px] text-white/65">arrow_forward</span>
          </div>

          <div className="relative z-10 flex w-full max-w-4xl flex-col items-center gap-8">
            <h1 className="text-center font-[family-name:var(--font-display)] text-[2.15rem] font-semibold leading-[1.08] tracking-[-0.02em] text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.22)] sm:text-5xl">
              What&apos;s on your mind?
            </h1>

            <VisionInput onProjectCreated={onProjectCreated} defaultProjectType={defaultProjectType} />
          </div>
        </div>
      </div>
    </main>
  );
}
