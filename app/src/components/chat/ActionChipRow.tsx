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
    <div className="mt-3 flex flex-wrap gap-2">
      {chips.map((chip) => (
        <button
          key={chip}
          type="button"
          onClick={() => onPick(chip)}
          className="rounded-full border border-[#e2ddd5] bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-[#bfd8ff] hover:bg-[#f8fbff] hover:text-[#2f8fff]"
        >
          {chip}
        </button>
      ))}
    </div>
  );
}
