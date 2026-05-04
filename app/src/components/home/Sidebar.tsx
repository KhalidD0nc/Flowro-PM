"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  LogOut,
  Moon,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Sparkles,
  Sun,
  Trash2,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/components/Providers";
import { useTheme } from "@/components/ThemeProvider";
import { signOutUser } from "@/app/auth/actions";
import { authDelete, authGet, authPatch } from "@/lib/authFetch";
import PricingModal from "@/components/PricingModal";
import RenameProjectModal from "@/components/RenameProjectModal";
import DeleteProjectModal from "@/components/DeleteProjectModal";

const SIDEBAR_COLLAPSED_KEY = "flowro_sidebar_collapsed";

interface RecentProject {
  id: string;
  name: string;
  updatedAt: string;
}

interface SidebarProps {
  onProjectSelect?: (projectId: string) => void;
  onNewChat?: () => void;
  activeProjectId?: string | null;
}

export default function Sidebar({ onProjectSelect, onNewChat, activeProjectId }: SidebarProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [openProjectMenuId, setOpenProjectMenuId] = useState<string | null>(null);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameProjectId, setRenameProjectId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const profileMenuRef = useRef<HTMLDivElement>(null);
  const projectMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (stored === "true") setIsCollapsed(true);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      return next;
    });
  }, []);

  const fetchRecentProjects = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoadingProjects(true);
      const response = await authGet("/api/projects", user);
      if (response.ok) {
        const data = await response.json();
        const sortedProjects = (data.projects || []).sort((a: RecentProject, b: RecentProject) => {
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
        setRecentProjects(sortedProjects);
      }
    } catch {
      // Fetch failed. The sidebar keeps a quiet empty state.
    } finally {
      setIsLoadingProjects(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchRecentProjects();
  }, [fetchRecentProjects]);

  useEffect(() => {
    if (activeProjectId === null) void fetchRecentProjects();
  }, [activeProjectId, fetchRecentProjects]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
      if (projectMenuRef.current && !projectMenuRef.current.contains(event.target as Node)) {
        setOpenProjectMenuId(null);
      }
    };

    if (isProfileMenuOpen || openProjectMenuId) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isProfileMenuOpen, openProjectMenuId]);

  const handleLogout = async () => {
    try {
      await signOutUser();
      router.push("/");
    } catch {
      // Sign-out failed. Keep the user in the current session.
    }
  };

  const getUserInitials = () => {
    if (!user?.displayName) return user?.email?.charAt(0).toUpperCase() || "U";
    return user.displayName
      .split(" ")
      .map((name) => name.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const openRenameModal = (project: RecentProject) => {
    setRenameProjectId(project.id);
    setRenameValue(project.name);
    setRenameModalOpen(true);
    setOpenProjectMenuId(null);
  };

  const openDeleteModal = (projectId: string) => {
    setDeleteProjectId(projectId);
    setDeleteModalOpen(true);
    setOpenProjectMenuId(null);
  };

  const handleDeleteProject = async () => {
    if (!user || !deleteProjectId) return;

    setIsDeleting(true);
    try {
      const response = await authDelete(`/api/projects/${deleteProjectId}`, user);

      if (response.ok) {
        setRecentProjects((prev) => prev.filter((project) => project.id !== deleteProjectId));
        setDeleteModalOpen(false);
        setDeleteProjectId(null);

        if (activeProjectId === deleteProjectId && onNewChat) onNewChat();
      }
    } catch {
      // Delete failed. Project list remains unchanged.
    } finally {
      setIsDeleting(false);
    }
  };

  const goHome = () => {
    if (onNewChat) {
      onNewChat();
    } else {
      router.push("/app");
    }
  };

  const sidebarWidth = isCollapsed ? "md:w-[76px]" : "md:w-[292px]";
  const iconButton =
    "flex size-11 items-center justify-center rounded-2xl text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#2f8fff]/55";

  return (
    <aside
      className={`relative z-20 hidden shrink-0 flex-col justify-between border-r border-white/[0.07] bg-[#090b10]/96 px-3 py-4 text-white shadow-[24px_0_70px_-60px_rgba(0,0,0,0.95)] backdrop-blur-xl transition-[width] duration-300 md:flex ${sidebarWidth}`}
    >
      <div className="min-h-0 flex-1">
        <div className={`flex items-center gap-3 ${isCollapsed ? "justify-center" : "justify-between"}`}>
          <button
            onClick={goHome}
            className={`flex min-w-0 items-center gap-3 rounded-2xl text-left focus:outline-none focus:ring-2 focus:ring-[#2f8fff]/55 ${isCollapsed ? "justify-center" : ""}`}
            aria-label="Go to app home"
          >
            <img src="/logo.svg" alt="Flowro" className="h-9 w-9 shrink-0 object-contain" />
            {!isCollapsed ? (
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-white">Flowro</span>
              </span>
            ) : null}
          </button>

          {!isCollapsed ? (
            <button onClick={toggleCollapsed} className={iconButton} title="Collapse sidebar" aria-label="Collapse sidebar">
              <PanelLeftClose size={18} />
            </button>
          ) : null}
        </div>

        {isCollapsed ? (
          <button onClick={toggleCollapsed} className={`${iconButton} mx-auto mt-4`} title="Expand sidebar" aria-label="Expand sidebar">
            <PanelLeftOpen size={18} />
          </button>
        ) : null}

        {!isCollapsed ? (
          <section className="mt-6 min-h-0 rounded-[1.35rem] border border-white/[0.07] bg-white/[0.035] p-2">
            <div className="flex items-center justify-between px-2.5 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Recents</p>
              <span className="rounded-full bg-white/[0.06] px-2 py-1 text-[11px] text-slate-400">
                {recentProjects.length}
              </span>
            </div>

            <div className="mt-1 max-h-[calc(100vh-290px)] space-y-1 overflow-y-auto pr-1">
              {isLoadingProjects ? (
                <div className="px-3 py-4 text-sm text-slate-500">Loading projects...</div>
              ) : recentProjects.length > 0 ? (
                recentProjects.map((project) => {
                  const isActive = activeProjectId === project.id;
                  const isMenuOpen = openProjectMenuId === project.id;

                  return (
                    <div key={project.id} className="group relative" ref={isMenuOpen ? projectMenuRef : null}>
                      <button
                        onClick={() => {
                          if (onProjectSelect) {
                            onProjectSelect(project.id);
                          } else {
                            router.push(`/app/${project.id}`);
                          }
                        }}
                        className={`flex min-h-14 w-full items-center gap-2.5 rounded-2xl border px-2.5 py-2 text-left text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#2f8fff]/55 ${
                          isActive
                            ? "border-[#2f8fff]/35 bg-[#2f8fff]/12 text-white"
                            : "border-transparent text-slate-400 hover:bg-white/[0.055] hover:text-white"
                        }`}
                      >
                        <span
                          className={`flex size-8 shrink-0 items-center justify-center rounded-xl ${
                            isActive ? "bg-[#2f8fff]/16 text-[#8fc1ff]" : "bg-white/[0.055] text-slate-500"
                          }`}
                        >
                          <FileText size={16} />
                        </span>
                        <span className="min-w-0 flex-1 pr-7">
                          <span className="block truncate font-medium leading-tight">{project.name}</span>
                          <span className="mt-1 block text-[11px] text-slate-600">
                            {new Date(project.updatedAt).toLocaleDateString()}
                          </span>
                        </span>
                      </button>

                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          setOpenProjectMenuId(isMenuOpen ? null : project.id);
                        }}
                        className={`absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-white/[0.08] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#2f8fff]/55 ${
                          isMenuOpen ? "bg-white/[0.08] opacity-100" : "opacity-0 group-hover:opacity-100"
                        }`}
                        title="Project options"
                        aria-label="Project options"
                      >
                        <MoreHorizontal size={18} />
                      </button>

                      {isMenuOpen ? (
                        <div className="absolute right-0 top-12 z-50 w-44 overflow-hidden rounded-2xl border border-white/[0.09] bg-[#151922] shadow-[0_26px_60px_-28px_rgba(0,0,0,0.9)]">
                          <button
                            onClick={() => openRenameModal(project)}
                            className="flex w-full items-center gap-2 px-4 py-3 text-sm text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white"
                          >
                            <Pencil size={15} />
                            Rename
                          </button>
                          <button
                            onClick={() => openDeleteModal(project.id)}
                            className="flex w-full items-center gap-2 px-4 py-3 text-sm text-red-300 transition-colors hover:bg-red-500/10 hover:text-red-200"
                          >
                            <Trash2 size={15} />
                            Delete
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <div className="px-3 py-4 text-sm leading-6 text-slate-500">
                  No projects yet. Start a new chat to generate your first project plan.
                </div>
              )}
            </div>
          </section>
        ) : null}
      </div>

      <div className="space-y-3 pt-4">
        <button
          onClick={toggleTheme}
          className={`flex h-11 w-full items-center gap-2 rounded-2xl px-3 text-sm text-slate-400 transition-colors hover:bg-white/[0.055] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#2f8fff]/55 ${isCollapsed ? "justify-center px-0" : ""}`}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          {!isCollapsed ? <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span> : null}
        </button>

        <div className="relative" ref={profileMenuRef}>
          {isProfileMenuOpen && user ? (
            <div
              className="absolute bottom-full left-0 z-50 mb-3 w-64 overflow-hidden rounded-[1.35rem] border border-white/[0.09] bg-[#151922] shadow-[0_26px_60px_-28px_rgba(0,0,0,0.9)]"
              style={{ minWidth: isCollapsed ? "256px" : "100%" }}
            >
              <div className="border-b border-white/[0.07] px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Account</p>
                <p className="mt-2 truncate text-sm text-slate-300">{user.email || "user@example.com"}</p>
              </div>

              <div className="py-2">
                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    setIsPricingModalOpen(true);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  <Sparkles size={18} className="text-[#8fc1ff]" />
                  View all plans
                </button>
              </div>

              <div className="border-t border-white/[0.07] py-2">
                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    void handleLogout();
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  <LogOut size={18} className="text-slate-500" />
                  Log out
                </button>
              </div>
            </div>
          ) : null}

          {user ? (
            <button
              onClick={() => setIsProfileMenuOpen((prev) => !prev)}
              className={`flex min-h-14 w-full items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.035] p-2.5 transition-colors hover:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-[#2f8fff]/55 ${isCollapsed ? "justify-center" : ""}`}
              title="Profile menu"
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="size-9 rounded-full object-cover" />
              ) : (
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#2f8fff]/13 text-xs font-bold text-[#8fc1ff]">
                  {getUserInitials()}
                </span>
              )}

              {!isCollapsed ? (
                <>
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-sm font-medium text-white">
                      {user.displayName || user.email?.split("@")[0] || "User"}
                    </span>
                    <span className="block truncate text-xs text-slate-500">Builder Plan</span>
                  </span>
                  <UserRound size={17} className="text-slate-600" />
                </>
              ) : null}
            </button>
          ) : null}
        </div>
      </div>

      <RenameProjectModal
        isOpen={renameModalOpen}
        onClose={() => {
          setRenameModalOpen(false);
          setRenameProjectId(null);
          setRenameValue("");
        }}
        onRename={async (newName) => {
          if (!user || !renameProjectId) return;
          setIsRenaming(true);
          try {
            const response = await authPatch(`/api/projects/${renameProjectId}`, user, { name: newName });
            if (response.ok) {
              setRecentProjects((prev) =>
                prev.map((p) => (p.id === renameProjectId ? { ...p, name: newName } : p))
              );
              setRenameModalOpen(false);
              setRenameProjectId(null);
              setRenameValue("");
            }
          } finally {
            setIsRenaming(false);
          }
        }}
        currentName={renameValue}
        isRenaming={isRenaming}
      />

      <DeleteProjectModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeleteProjectId(null);
        }}
        onDelete={handleDeleteProject}
        projectName={recentProjects.find((p) => p.id === deleteProjectId)?.name ?? ""}
        isDeleting={isDeleting}
      />

      <PricingModal isOpen={isPricingModalOpen} onClose={() => setIsPricingModalOpen(false)} />
    </aside>
  );
}
