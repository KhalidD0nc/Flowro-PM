"use client";

import { useState, type ReactNode } from "react";

export type StageStatus = "locked" | "active" | "complete";

interface StageCardProps {
  step: number;
  title: string;
  description?: string;
  status: StageStatus;
  autoExpanded?: boolean;
  statusLabel?: string;
  children: ReactNode;
}

const STATUS_PILL: Record<StageStatus, string> = {
  locked: "border-white/[0.08] bg-white/[0.035] text-slate-500",
  active: "border-[#2f8fff]/30 bg-[#2f8fff]/10 text-[#8fc5ff]",
  complete: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
};

export default function StageCard({
  step,
  title,
  description,
  status,
  autoExpanded,
  statusLabel,
  children,
}: StageCardProps) {
  const [override, setOverride] = useState<boolean | null>(null);
  const expanded = override ?? (autoExpanded ?? status === "active");
  const toggle = () => setOverride(!expanded);

  const pillLabel =
    statusLabel ?? (status === "locked" ? "Locked" : status === "complete" ? "Complete" : "In progress");

  return (
    <section className="overflow-hidden rounded-[1.15rem] border border-white/[0.08] bg-[#12151b]/95 shadow-[0_22px_58px_-46px_rgba(0,0,0,0.95)]">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-white/[0.025]"
      >
        <span
          className={`flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
            status === "complete"
              ? "bg-emerald-500 text-white"
              : status === "active"
                ? "bg-[#2f8fff] text-white"
                : "bg-white/[0.05] text-slate-500"
          }`}
        >
          {status === "complete" ? (
            <span className="material-symbols-outlined text-[18px]">check</span>
          ) : (
            step
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-semibold tracking-tight text-slate-100">{title}</h3>
            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${STATUS_PILL[status]}`}>
              {pillLabel}
            </span>
          </div>
          {description ? (
            <p className="mt-1 truncate text-xs text-slate-500">{description}</p>
          ) : null}
        </div>
        <span
          className={`material-symbols-outlined shrink-0 text-[20px] text-slate-500 transition ${
            expanded ? "rotate-180" : ""
          }`}
        >
          expand_more
        </span>
      </button>
      {expanded ? <div className="border-t border-white/[0.07] p-5">{children}</div> : null}
    </section>
  );
}
