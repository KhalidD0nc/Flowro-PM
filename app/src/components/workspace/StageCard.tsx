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
  locked: "border-[#e8e0d6] bg-white text-slate-400",
  active: "border-[#bfd8ff] bg-[#edf5ff] text-[#2f8fff]",
  complete: "border-emerald-200 bg-emerald-50 text-emerald-700",
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
    <section className="rounded-[1.5rem] border border-[#e4ddd4] bg-white/95 shadow-[0_18px_44px_-32px_rgba(29,41,65,0.18)]">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center gap-4 px-5 py-4 text-left"
      >
        <span
          className={`flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
            status === "complete"
              ? "bg-emerald-500 text-white"
              : status === "active"
                ? "bg-[#2f8fff] text-white"
                : "bg-[#f0e9dc] text-slate-500"
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
            <h3 className="truncate text-base font-semibold tracking-tight text-slate-900">{title}</h3>
            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${STATUS_PILL[status]}`}>
              {pillLabel}
            </span>
          </div>
          {description ? (
            <p className="mt-1 truncate text-xs text-slate-500">{description}</p>
          ) : null}
        </div>
        <span
          className={`material-symbols-outlined shrink-0 text-[20px] text-slate-400 transition ${
            expanded ? "rotate-180" : ""
          }`}
        >
          expand_more
        </span>
      </button>
      {expanded ? <div className="border-t border-[#ece5da] p-5">{children}</div> : null}
    </section>
  );
}
