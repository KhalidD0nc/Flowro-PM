/**
 * Phase 3 — Fully Functional Command Center
 *
 * Command Center main content layout.
 * Fetches real projects from API.
 */

"use client";

import { useAuth } from "@/components/Providers";
import VisionInput from "./VisionInput";
import QuickActions from "./QuickActions";

interface CommandCenterProps {
  onProjectCreated?: (projectId: string, initialMessage: string) => void;
}

export default function CommandCenter({ onProjectCreated }: CommandCenterProps) {
  const { user } = useAuth();

  // Get user's first name for greeting
  const getFirstName = () => {
    if (user?.displayName) {
      return user.displayName.split(" ")[0];
    }
    return user?.email?.split("@")[0] || "there";
  };

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden">
      {/* Background Gradient Orbs */}
      <div className="pointer-events-none absolute left-[16%] top-[-12%] h-[420px] w-[420px] rounded-full bg-[#d9e8ff] blur-[110px]" />
      <div className="pointer-events-none absolute bottom-[-10%] right-[8%] h-[360px] w-[360px] rounded-full bg-[#f1dfca] blur-[100px]" />

      {/* Main Content */}
      <div className="z-10 flex w-full max-w-3xl flex-col items-center gap-8 px-6 pb-20">
        {/* Hero Section */}
        <div className="flex flex-col items-center gap-4 text-center">
          {/* Headline */}
          <p className="rounded-full border border-[#dfd7cc] bg-white/70 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500 shadow-[0_14px_26px_-22px_rgba(30,41,59,0.25)]">
            Flowro Workspace
          </p>
          <h1 className="bg-gradient-to-r from-slate-900 via-slate-700 to-[#2f8fff] bg-clip-text font-[family-name:var(--font-display)] text-4xl tracking-tight text-transparent sm:text-5xl lg:text-6xl">
            What&apos;s the vision, {getFirstName()}?
          </h1>

          {/* Subheadline */}
          <p className="max-w-2xl text-lg leading-8 text-slate-600">
            Describe your product idea, paste a spec document, or start with a
            template to kick off a short clarification flow before Flowro generates the PRD.
          </p>
        </div>

        {/* Phase 3.B: Interactive Vision Input */}
        <VisionInput onProjectCreated={onProjectCreated} />

        {/* Phase 3.B: Quick Action Buttons */}
        <QuickActions />
      </div>
    </main>
  );
}
