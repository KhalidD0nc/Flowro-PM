"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  previewRoutes?: Array<{ path: string; name: string }>;
  selectedPreviewPath?: string;
  onPreviewPathChange?: (path: string) => void;
}

export default function WorkspaceTabs({
  renderTab,
  previewRoutes,
  selectedPreviewPath = "/",
  onPreviewPathChange,
}: WorkspaceTabsProps) {
  const [active, setActive] = useAtom(workspaceTabAtom);
  const [isRouteMenuOpen, setIsRouteMenuOpen] = useState(false);
  const routeMenuRef = useRef<HTMLDivElement>(null);
  const effectiveActive: WorkspaceTabKey =
    active === "code" || active === "files" ? active : "preview";

  const tabs: TabDef[] = [
    { key: "preview", label: "Preview", icon: "language" },
    { key: "files", label: "Files", icon: "description" },
    { key: "code", label: "Code", icon: "code" },
  ];

  const secondaryActions = [
    { icon: "more_horiz", label: "More" },
  ];
  const activeTab = tabs.find((tab) => tab.key === effectiveActive) || tabs[0];
  const routes = useMemo(() => {
    const normalized = (previewRoutes?.length ? previewRoutes : [{ path: "/", name: "Home" }])
      .map((route) => ({ ...route, path: route.path.startsWith("/") ? route.path : `/${route.path}` }));
    const hasHome = normalized.some((route) => route.path === "/");
    return hasHome ? normalized : [{ path: "/", name: "Home" }, ...normalized];
  }, [previewRoutes]);

  useEffect(() => {
    if (!isRouteMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (routeMenuRef.current && !routeMenuRef.current.contains(event.target as Node)) {
        setIsRouteMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isRouteMenuOpen]);

  const handleRoutePick = (path: string) => {
    onPreviewPathChange?.(path);
    setIsRouteMenuOpen(false);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#111111]">
      <div className="sticky top-0 z-20 flex min-h-[67px] shrink-0 items-center gap-2 border-b border-white/[0.07] bg-[#171717]/96 px-3 py-2 backdrop-blur-xl">
        <div className="flex items-center gap-1">
          {tabs.map((tab) => {
            const isActive = effectiveActive === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActive(tab.key)}
                title={tab.label}
                aria-label={tab.label}
                className={`inline-flex h-10 items-center justify-center gap-2 rounded-[0.85rem] border px-3 text-sm font-medium transition ${
                  isActive
                    ? "border-[#3454ff]/55 bg-[#1e2b58] text-[#7fa2ff] shadow-[0_14px_24px_-20px_rgba(52,84,255,0.85)]"
                    : "border-white/[0.08] bg-[#1f1f1f] text-[#c9c9c6] hover:bg-[#282828] hover:text-white"
                }`}
              >
                <span className="material-symbols-outlined text-[19px]">{tab.icon}</span>
                {isActive ? <span className="hidden sm:inline">{tab.label}</span> : null}
              </button>
            );
          })}
          {secondaryActions.map((action) => (
            <button
              key={action.label}
              type="button"
              aria-label={action.label}
              title={action.label}
              className="inline-flex size-10 items-center justify-center rounded-[0.85rem] border border-white/[0.08] bg-[#1f1f1f] text-[#c9c9c6] transition hover:bg-[#282828] hover:text-white"
            >
              <span className="material-symbols-outlined text-[19px]">{action.icon}</span>
            </button>
          ))}
        </div>

        <div className="mx-1 hidden h-7 w-px bg-white/[0.08] md:block" />

        <div className="relative hidden min-w-0 flex-1 items-center gap-2 rounded-[0.85rem] border border-white/[0.08] bg-[#1d1d1c] px-3 py-2 text-sm text-[#d8d8d5] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] md:flex" ref={routeMenuRef}>
          <span className="material-symbols-outlined text-[18px] text-[#9a9a96]">desktop_windows</span>
          {effectiveActive === "preview" ? (
            <button
              type="button"
              onClick={() => setIsRouteMenuOpen((current) => !current)}
              aria-haspopup="menu"
              aria-expanded={isRouteMenuOpen}
              className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 text-left transition hover:bg-white/[0.045] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4169ff]"
            >
              <span className="min-w-0 flex-1 truncate font-medium text-[#f0f0ed]">{selectedPreviewPath}</span>
              <span className="material-symbols-outlined text-[18px] text-[#9a9a96]">keyboard_arrow_down</span>
            </button>
          ) : (
            <>
              <span className="shrink-0 text-[#f0f0ed]">/</span>
              <span className="min-w-0 flex-1 truncate text-[#a8a8a5]">{activeTab.label === "Code" ? "Read-only generated code" : "Flowro preview workspace"}</span>
            </>
          )}
          <button type="button" aria-label="Open preview" className="ml-auto flex size-7 items-center justify-center rounded-md text-[#c9c9c6] transition hover:bg-white/[0.06] hover:text-white">
            <span className="material-symbols-outlined text-[17px]">open_in_new</span>
          </button>
          <button type="button" aria-label="Refresh preview" className="flex size-7 items-center justify-center rounded-md text-[#c9c9c6] transition hover:bg-white/[0.06] hover:text-white">
            <span className="material-symbols-outlined text-[17px]">refresh</span>
          </button>
          {isRouteMenuOpen && effectiveActive === "preview" ? (
            <div className="absolute left-10 top-[calc(100%+0.45rem)] z-50 w-[22rem] overflow-hidden rounded-[0.9rem] border border-white/[0.09] bg-[#1c1c1b] p-2 shadow-[0_24px_58px_-28px_rgba(0,0,0,0.95)]" role="menu">
              {routes.map((route) => {
                const isSelected = route.path === selectedPreviewPath;
                return (
                  <button
                    key={route.path}
                    type="button"
                    onClick={() => handleRoutePick(route.path)}
                    className={`flex min-h-11 w-full items-center gap-3 rounded-[0.65rem] px-3 text-left text-[15px] font-semibold transition ${
                      isSelected ? "bg-[#293753] text-[#dce8ff]" : "text-[#e2e2df] hover:bg-white/[0.055]"
                    }`}
                    role="menuitem"
                  >
                    <span className="min-w-0 flex-1 truncate">{route.path}</span>
                    {isSelected ? <span className="material-symbols-outlined text-[18px] text-[#b7c8ff]">check</span> : null}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button type="button" aria-label="Comments" className="hidden size-10 items-center justify-center rounded-full bg-[#2a2a29] text-[#d8d8d5] transition hover:bg-[#333331] sm:flex">
            <span className="material-symbols-outlined text-[19px]">chat_bubble</span>
          </button>
          <button type="button" className="min-h-10 rounded-[0.7rem] bg-[#4169ff] px-4 text-sm font-semibold text-white shadow-[0_16px_28px_-22px_rgba(65,105,255,0.95)] transition hover:bg-[#587cff]">
            Publish
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {renderTab(effectiveActive)}
      </div>
    </div>
  );
}
