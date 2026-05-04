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
    pending: "border-white/[0.08] bg-[#20201f] text-[#8f8f8f]",
    active: "border-[#3454ff]/80 bg-[#20201f] text-[#f1f1f1] shadow-[0_0_0_1px_rgba(52,84,255,0.55),0_20px_48px_-38px_rgba(52,84,255,0.85)]",
    done: "border-white/[0.08] bg-[#20201f] text-[#d8d8d8]",
    failed: "border-red-400/35 bg-[#241b1b] text-red-200",
  };

  const iconStyles: Record<StepStatus, string> = {
    pending: "border-[#6a6a6a] bg-transparent text-transparent",
    active: "border-[#7f7f7f] bg-transparent text-transparent",
    done: "border-[#7f7f7f] bg-transparent text-[#d8d8d8]",
    failed: "border-red-300 bg-red-400/10 text-red-200",
  };

  return (
    <div className={`overflow-hidden rounded-[1.1rem] border transition ${statusStyles[status]}`}>
      <button
        type="button"
        onClick={() => hasBody && setExpanded((v) => !v)}
        disabled={!hasBody}
        className="flex w-full items-center gap-3 px-4 py-3 text-left disabled:cursor-default"
      >
        <span
          className={`flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px] ${iconStyles[status]}`}
        >
          <span
            className={`material-symbols-outlined text-[13px] ${
              status === "active" ? "animate-pulse" : ""
            }`}
          >
            {status === "done" ? "check" : status === "failed" ? "error" : icon}
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium leading-5">{title}</p>
          {subtitle ? (
            <p className="mt-1 truncate text-xs text-[#8f8f8f]">{subtitle}</p>
          ) : null}
        </div>
        {duration ? (
          <span className="shrink-0 text-[11px] font-medium text-[#8f8f8f]">{duration}</span>
        ) : null}
        <span className="material-symbols-outlined shrink-0 text-[18px] text-[#8f8f8f]">bookmark</span>
        {hasBody ? (
          <span
            className={`material-symbols-outlined shrink-0 text-[18px] text-[#8f8f8f] transition ${
              expanded ? "rotate-180" : ""
            }`}
          >
            expand_more
          </span>
        ) : null}
      </button>

      {expanded && hasBody ? (
        <div className="border-t border-white/[0.08] px-3 py-3">
          {details && preview ? (
            <div className="mb-3 grid grid-cols-2 gap-2 text-sm">
              <button
                type="button"
                onClick={() => setTab("details")}
                className={`min-h-11 rounded-[0.7rem] border px-3 font-medium transition ${
                  tab === "details" ? "border-white/[0.1] bg-[#252524] text-[#e1e1df]" : "border-white/[0.08] bg-[#30302e] text-[#bcbcb9]"
                }`}
              >
                Details
              </button>
              <button
                type="button"
                onClick={() => setTab("preview")}
                className={`min-h-11 rounded-[0.7rem] border px-3 font-medium transition ${
                  tab === "preview" ? "border-white/[0.1] bg-[#252524] text-[#e1e1df]" : "border-white/[0.08] bg-[#30302e] text-[#bcbcb9]"
                }`}
              >
                Preview
              </button>
            </div>
          ) : null}
          <div className="text-sm leading-6 text-[#b8b8b5]">
            {tab === "preview" && preview ? preview : details}
          </div>
        </div>
      ) : null}
    </div>
  );
}
