"use client";

import { useEffect, useState, type ReactNode } from "react";

export type WorkspaceTabKey = "preview" | "plan" | "code" | "files" | "ui";

interface TabDef {
  key: WorkspaceTabKey;
  label: string;
  icon: string;
  disabled?: boolean;
  disabledHint?: string;
}

interface WorkspaceTabsProps {
  previewAvailable: boolean;
  uiViewsCount: number;
  renderTab: (tab: WorkspaceTabKey) => ReactNode;
}

const STORAGE_KEY = "flowro_workspace_tab";

export default function WorkspaceTabs({ previewAvailable, uiViewsCount, renderTab }: WorkspaceTabsProps) {
  const [active, setActive] = useState<WorkspaceTabKey>(() => {
    if (typeof window === "undefined") return "plan";
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "preview" || stored === "plan" || stored === "code" || stored === "files" || stored === "ui") {
      return stored;
    }
    return "plan";
  });

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, active);
  }, [active]);

  const effectiveActive: WorkspaceTabKey = active === "preview" && !previewAvailable ? "plan" : active;

  const tabs: TabDef[] = [
    { key: "preview", label: "Preview", icon: "visibility", disabled: !previewAvailable, disabledHint: "Run a build to see the live preview" },
    { key: "plan", label: "Plan", icon: "checklist" },
    { key: "ui", label: "UI Views", icon: "grid_view", disabled: uiViewsCount === 0, disabledHint: "Generate screens to see UI views" },
    { key: "code", label: "Code", icon: "code" },
    { key: "files", label: "Files", icon: "folder" },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="sticky top-0 z-10 flex shrink-0 items-center gap-1 border-b border-[#e8e0d6] bg-[#fbf7f1]/92 px-3 py-2 backdrop-blur-md">
        {tabs.map((tab) => {
          const isActive = effectiveActive === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => !tab.disabled && setActive(tab.key)}
              disabled={tab.disabled}
              title={tab.disabled ? tab.disabledHint : undefined}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                isActive
                  ? "bg-white text-slate-900 shadow-[0_4px_14px_-8px_rgba(29,41,65,0.25)]"
                  : tab.disabled
                    ? "cursor-not-allowed text-slate-300"
                    : "text-slate-500 hover:bg-white/60 hover:text-slate-900"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
              {tab.label}
            </button>
          );
        })}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {renderTab(effectiveActive)}
      </div>
    </div>
  );
}
