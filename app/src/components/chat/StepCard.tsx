"use client";

import { useState, type ReactNode } from "react";

export type StepStatus = "pending" | "active" | "done" | "failed";

export interface StepCardProps {
  icon: string;
  title: string;
  subtitle?: string;
  durationMs?: number;
  status: StepStatus;
  details?: ReactNode;
  preview?: ReactNode;
  defaultExpanded?: boolean;
}

function formatDuration(ms?: number): string | null {
  if (!ms || ms < 1000) return null;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return rem ? `${minutes}m ${rem}s` : `${minutes}m`;
}

export default function StepCard({
  icon,
  title,
  subtitle,
  durationMs,
  status,
  details,
  preview,
  defaultExpanded,
}: StepCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? status === "active");
  const [tab, setTab] = useState<"details" | "preview">("details");

  const hasBody = Boolean(details || preview);
  const duration = formatDuration(durationMs);

  const statusStyles: Record<StepStatus, string> = {
    pending: "border-[#e8e0d6] bg-white/60 text-slate-400 dark:border-white/[0.06] dark:bg-[#1A1A1D]/60 dark:text-white/[0.4]",
    active: "border-[#bfd8ff] bg-[#f8fbff] text-slate-900 shadow-[0_8px_24px_-18px_rgba(47,143,255,0.4)] dark:border-[#5B8DEF]/20 dark:bg-[#5B8DEF]/5 dark:text-white/[0.9] dark:shadow-[0_8px_24px_-18px_rgba(91,141,239,0.15)]",
    done: "border-[#d8e7d8] bg-white text-slate-700 dark:border-emerald-500/20 dark:bg-[#141416] dark:text-white/[0.7]",
    failed: "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-900/10 dark:text-red-400",
  };

  const iconStyles: Record<StepStatus, string> = {
    pending: "bg-slate-100 text-slate-400 dark:bg-[#1E1E22] dark:text-white/[0.4]",
    active: "bg-[#edf5ff] text-[#2f8fff] dark:bg-[#5B8DEF]/10 dark:text-[#5B8DEF]",
    done: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
    failed: "bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400",
  };

  return (
    <div className={`rounded-[1.1rem] border transition ${statusStyles[status]}`}>
      <button
        type="button"
        onClick={() => hasBody && setExpanded((v) => !v)}
        disabled={!hasBody}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left disabled:cursor-default"
      >
        <span
          className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${iconStyles[status]}`}
        >
          <span
            className={`material-symbols-outlined text-[16px] ${
              status === "active" ? "animate-pulse" : ""
            }`}
          >
            {status === "done" ? "check" : status === "failed" ? "error" : icon}
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{title}</p>
          {subtitle ? (
            <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-white/[0.5]">{subtitle}</p>
          ) : null}
        </div>
        {duration ? (
          <span className="shrink-0 text-[11px] font-medium text-slate-400 dark:text-white/[0.4]">{duration}</span>
        ) : null}
        {hasBody ? (
          <span
            className={`material-symbols-outlined shrink-0 text-[18px] text-slate-400 transition dark:text-white/[0.4] ${
              expanded ? "rotate-180" : ""
            }`}
          >
            expand_more
          </span>
        ) : null}
      </button>

      {expanded && hasBody ? (
        <div className="border-t border-[#ece5da] px-3 py-3 dark:border-white/[0.06]">
          {details && preview ? (
            <div className="mb-3 inline-flex rounded-full border border-[#e2ddd5] bg-white p-0.5 text-xs dark:border-white/[0.06] dark:bg-[#141416]">
              <button
                type="button"
                onClick={() => setTab("details")}
                className={`rounded-full px-3 py-1 font-medium transition ${
                  tab === "details" ? "bg-[#edf5ff] text-[#2f8fff] dark:bg-[#5B8DEF]/10 dark:text-[#5B8DEF]" : "text-slate-500 dark:text-white/[0.5]"
                }`}
              >
                Details
              </button>
              <button
                type="button"
                onClick={() => setTab("preview")}
                className={`rounded-full px-3 py-1 font-medium transition ${
                  tab === "preview" ? "bg-[#edf5ff] text-[#2f8fff] dark:bg-[#5B8DEF]/10 dark:text-[#5B8DEF]" : "text-slate-500 dark:text-white/[0.5]"
                }`}
              >
                Preview
              </button>
            </div>
          ) : null}
          <div className="text-sm leading-6 text-slate-600 dark:text-white/[0.6]">
            {tab === "preview" && preview ? preview : details}
          </div>
        </div>
      ) : null}
    </div>
  );
}
