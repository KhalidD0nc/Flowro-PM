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
    pending: "border-white/[0.06] bg-white/[0.025] text-slate-500",
    active: "border-[#2f8fff]/30 bg-[#2f8fff]/10 text-slate-100 shadow-[0_14px_34px_-28px_rgba(47,143,255,0.9)]",
    done: "border-emerald-400/18 bg-emerald-400/[0.05] text-slate-300",
    failed: "border-red-400/25 bg-red-400/10 text-red-300",
  };

  const iconStyles: Record<StepStatus, string> = {
    pending: "bg-white/[0.04] text-slate-500",
    active: "bg-[#2f8fff]/15 text-[#8fc5ff]",
    done: "bg-emerald-400/10 text-emerald-300",
    failed: "bg-red-400/10 text-red-300",
  };

  return (
    <div className={`rounded-xl border transition ${statusStyles[status]}`}>
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
            <p className="mt-0.5 truncate text-xs text-slate-500">{subtitle}</p>
          ) : null}
        </div>
        {duration ? (
          <span className="shrink-0 text-[11px] font-medium text-slate-500">{duration}</span>
        ) : null}
        {hasBody ? (
          <span
            className={`material-symbols-outlined shrink-0 text-[18px] text-slate-500 transition ${
              expanded ? "rotate-180" : ""
            }`}
          >
            expand_more
          </span>
        ) : null}
      </button>

      {expanded && hasBody ? (
        <div className="border-t border-white/[0.06] px-3 py-3">
          {details && preview ? (
            <div className="mb-3 inline-flex rounded-full border border-white/[0.08] bg-white/[0.03] p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setTab("details")}
                className={`rounded-full px-3 py-1 font-medium transition ${
                  tab === "details" ? "bg-[#2f8fff]/15 text-[#8fc5ff]" : "text-slate-500"
                }`}
              >
                Details
              </button>
              <button
                type="button"
                onClick={() => setTab("preview")}
                className={`rounded-full px-3 py-1 font-medium transition ${
                  tab === "preview" ? "bg-[#2f8fff]/15 text-[#8fc5ff]" : "text-slate-500"
                }`}
              >
                Preview
              </button>
            </div>
          ) : null}
          <div className="text-sm leading-6 text-slate-400">
            {tab === "preview" && preview ? preview : details}
          </div>
        </div>
      ) : null}
    </div>
  );
}
