"use client";

import StepCard, { type StepStatus } from "./StepCard";

const PHASES: Array<{ key: string; icon: string; title: string; subtitle: string }> = [
  { key: "thinking", icon: "psychology", title: "Read project context", subtitle: "Understanding the brief and current workspace" },
  { key: "planning", icon: "route", title: "Plan the response", subtitle: "Mapping the steps Flowro will take" },
  { key: "generating", icon: "auto_fix_high", title: "Generate output", subtitle: "Drafting plan, screens, or proposal" },
  { key: "verifying", icon: "task_alt", title: "Verify constraints", subtitle: "Checking schema and build requirements" },
  { key: "finalizing", icon: "flag", title: "Save updates", subtitle: "Finalizing changes in your workspace" },
];

interface StepCardListProps {
  thinkingPhase?: number;
}

export default function StepCardList({ thinkingPhase }: StepCardListProps) {
  const activeIndex = thinkingPhase ?? 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="mb-1 rounded-[1.1rem] border border-white/[0.08] bg-[#20201f] p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[15px] font-semibold text-[#f0f0ed]">Flowro is working</h3>
          <span className="material-symbols-outlined text-[18px] text-[#8f8f8f]">bookmark</span>
        </div>
        <p className="mt-2 text-sm leading-6 text-[#a8a8a5]">Tracking the same build-style checklist while the response streams in.</p>
      </div>
      {PHASES.map((phase, index) => {
        let status: StepStatus = "pending";
        if (index < activeIndex) status = "done";
        else if (index === activeIndex) status = "active";

        return (
          <StepCard
            key={phase.key}
            icon={phase.icon}
            title={phase.title}
            subtitle={phase.subtitle}
            status={status}
            details={<span>{phase.subtitle}</span>}
            preview={<span>{status === "done" ? "Completed" : status === "active" ? "In progress" : "Queued"}</span>}
          />
        );
      })}
    </div>
  );
}
