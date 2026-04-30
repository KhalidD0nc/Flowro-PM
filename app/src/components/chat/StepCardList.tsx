"use client";

import StepCard, { type StepStatus } from "./StepCard";

const PHASES: Array<{ key: string; icon: string; title: string; subtitle: string }> = [
  { key: "thinking", icon: "psychology", title: "Thinking", subtitle: "Reading your brief and project context" },
  { key: "planning", icon: "route", title: "Planning the response", subtitle: "Mapping the steps Flowro will take" },
  { key: "generating", icon: "auto_fix_high", title: "Generating output", subtitle: "Drafting plan, screens, or proposal" },
  { key: "verifying", icon: "task_alt", title: "Verifying", subtitle: "Checking schema and constraints" },
  { key: "finalizing", icon: "flag", title: "Finalizing", subtitle: "Saving updates to your workspace" },
];

interface StepCardListProps {
  thinkingPhase?: number;
}

export default function StepCardList({ thinkingPhase }: StepCardListProps) {
  const activeIndex = thinkingPhase ?? 0;

  return (
    <div className="flex flex-col gap-2">
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
          />
        );
      })}
    </div>
  );
}
