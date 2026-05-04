/**
 * Phase 3 — Fully Functional Command Center
 *
 * Command Center main content layout.
 * Fetches real projects from API.
 */

"use client";

import VisionInput from "./VisionInput";

interface CommandCenterProps {
  onProjectCreated?: (projectId: string, initialMessage: string) => void;
}

const TEMPLATE_PREVIEWS = [
  "Landing page",
  "SaaS dashboard",
  "Marketplace",
  "Internal tool",
];

export default function CommandCenter({ onProjectCreated }: CommandCenterProps) {
  return (
    <main className="command-center-bg relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-8 text-white sm:px-6">
      <div className="relative z-10 flex w-full max-w-4xl flex-col items-center gap-7">
        <h1 className="text-center font-[family-name:var(--font-display)] text-3xl font-semibold text-white sm:text-5xl">
          What are we building today?
        </h1>

        <VisionInput onProjectCreated={onProjectCreated} />

        <section className="w-full rounded-[1.5rem] border border-white/[0.08] bg-white/[0.035] p-4 shadow-[0_24px_70px_-48px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-white/88">Templates</h2>
            <span className="rounded-full border border-[#2f8fff]/25 bg-[#2f8fff]/10 px-2.5 py-1 text-[11px] font-medium text-[#8fc1ff]">
              Coming soon
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TEMPLATE_PREVIEWS.map((template) => (
              <button
                key={template}
                type="button"
                disabled
                className="min-h-20 cursor-not-allowed rounded-2xl border border-white/[0.07] bg-white/[0.035] px-3 py-4 text-left text-sm font-medium text-white/42 opacity-80"
              >
                {template}
              </button>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
