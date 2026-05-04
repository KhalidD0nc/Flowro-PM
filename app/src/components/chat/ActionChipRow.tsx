"use client";

import type { Intent } from "@/lib/types/views";

const CHIPS_BY_INTENT: Record<Intent, string[]> = {
  initial: [
    "Refine the project plan",
    "Add another screen",
    "Tighten the build tasks",
    "Suggest a different template",
  ],
  proposal: [
    "Apply these changes",
    "Show me alternatives",
    "Explain the trade-offs",
  ],
  clarification: [],
  discussion: [
    "Draft a project plan",
    "Brainstorm features",
    "Identify risks",
  ],
};

interface ActionChipRowProps {
  intent: Intent;
  onPick: (message: string) => void;
}

export default function ActionChipRow({ intent, onPick }: ActionChipRowProps) {
  const chips = CHIPS_BY_INTENT[intent];
  if (!chips?.length) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-2 border-t border-white/[0.06] pt-3">
      {chips.map((chip) => (
        <button
          key={chip}
          type="button"
          onClick={() => onPick(chip)}
          className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:border-[#2f8fff]/30 hover:bg-[#2f8fff]/10 hover:text-[#9dccff]"
        >
          {chip}
        </button>
      ))}
    </div>
  );
}
