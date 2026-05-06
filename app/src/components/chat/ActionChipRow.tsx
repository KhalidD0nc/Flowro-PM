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
    <div className="mt-4 flex flex-wrap gap-2">
      {chips.map((chip) => (
        <button
          key={chip}
          type="button"
          onClick={() => onPick(chip)}
          className="min-h-10 rounded-[0.7rem] border border-white/[0.065] bg-[#2a2a29] px-3 py-2 text-sm font-medium text-[#e1e1df] transition hover:border-white/[0.12] hover:bg-[#333331] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4169ff]"
        >
          {chip}
        </button>
      ))}
    </div>
  );
}
