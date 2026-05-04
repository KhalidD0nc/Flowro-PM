"use client";

import { type ReactNode } from "react";
import { useAtom } from "jotai";
import { workspaceTabAtom } from "@/atoms/workspaceAtoms";

export type WorkspaceTabKey = "preview" | "code" | "files";

interface TabDef {
  key: WorkspaceTabKey;
  label: string;
  icon: string;
}

interface WorkspaceTabsProps {
  renderTab: (tab: WorkspaceTabKey) => ReactNode;
}

export default function WorkspaceTabs({ renderTab }: WorkspaceTabsProps) {
  const [active, setActive] = useAtom(workspaceTabAtom);
  const effectiveActive: WorkspaceTabKey =
    active === "code" || active === "files" ? active : "preview";

  const tabs: TabDef[] = [
    { key: "preview", label: "Preview and build status", icon: "web_asset" },
    { key: "code", label: "Code", icon: "code" },
    { key: "files", label: "Files", icon: "folder" },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="sticky top-0 z-10 flex shrink-0 justify-end px-4 pt-4">
        <div className="inline-flex items-center gap-1 rounded-[1.15rem] border border-[#e7e4dc] bg-white/90 p-1 shadow-[0_18px_34px_-30px_rgba(17,17,17,0.22)] backdrop-blur-xl">
        {tabs.map((tab) => {
          const isActive = effectiveActive === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActive(tab.key)}
              title={tab.label}
              aria-label={tab.label}
              className={`inline-flex size-10 items-center justify-center rounded-xl transition ${
                isActive
                  ? "bg-[#111111] text-white shadow-[0_14px_24px_-20px_rgba(17,17,17,0.55)]"
                  : "text-[#6b7280] hover:bg-[#f4f4f1] hover:text-[#111111]"
              }`}
            >
              <span className="material-symbols-outlined text-[19px]">{tab.icon}</span>
            </button>
          );
        })}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {renderTab(effectiveActive)}
      </div>
    </div>
  );
}
