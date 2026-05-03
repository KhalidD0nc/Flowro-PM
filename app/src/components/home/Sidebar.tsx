"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/Providers";
import { useTheme } from "@/components/ThemeProvider";
import { signOutUser } from "@/app/auth/actions";
import { authGet, authDelete, authPatch } from "@/lib/authFetch";
import PricingModal from "@/components/PricingModal";
import RenameProjectModal from "@/components/RenameProjectModal";
import DeleteProjectModal from "@/components/DeleteProjectModal";
import { Button } from "@/components/ui/button";

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
    if (stored === "true") {
      setIsCollapsed(true);
    }
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
      // Fetch failed — sidebar shows empty state
    } finally {
      setIsLoadingProjects(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRecentProjects();
  }, [fetchRecentProjects]);

  useEffect(() => {
    if (activeProjectId === null) {
      fetchRecentProjects();
    }
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

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isProfileMenuOpen, openProjectMenuId]);

  const handleLogout = async () => {
    try {
      await signOutUser();
      router.push("/");
    } catch {
      // Sign-out failed — user stays on current page
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

  const handleRenameProject = async () => {
    if (!user || !renameProjectId || !renameValue.trim()) return;

    setIsRenaming(true);
    try {
      const response = await authPatch(`/api/projects/${renameProjectId}`, user, {
        name: renameValue.trim(),
      });

      if (response.ok) {
        setRecentProjects((prev) =>
          prev.map((project) =>
            project.id === renameProjectId ? { ...project, name: renameValue.trim() } : project
          )
        );
        setRenameModalOpen(false);
        setRenameProjectId(null);
        setRenameValue("");
      }
    } catch {
      // Rename failed — project name unchanged
    } finally {
      setIsRenaming(false);
    }
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

        if (activeProjectId === deleteProjectId && onNewChat) {
          onNewChat();
        }
      }
    } catch {
      // Delete failed — project list unchanged
    } finally {
      setIsDeleting(false);
    }
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

  const shellButton =
    "inline-flex items-center gap-2 rounded-2xl border border-[#dfd7cc] bg-white/82 px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:border-[#bfd3ef] hover:bg-white hover:text-slate-900";

  return (
    <aside
      className={`relative z-20 flex shrink-0 flex-col justify-between border-r border-[#e4ddd4] bg-[#fbf7f1]/92 px-3 py-4 backdrop-blur-xl transition-all duration-300 dark:border-white/[0.06] dark:bg-[#141416]/92 ${
        isCollapsed ? "w-18" : "w-full md:w-72"
      }`}
    >
      <div className="flex flex-col gap-5">
        <div className={`flex items-center ${isCollapsed ? "justify-center" : "justify-between"} gap-2 px-1`}>
          <button
            onClick={() => {
              if (onNewChat) {
                onNewChat();
              } else {
                router.push("/app");
              }
            }}
            className={`flex items-center gap-3 ${isCollapsed ? "justify-center" : ""}`}
            aria-label="Go to app home"
          >
            <div className="flex size-11 items-center justify-center rounded-2xl border border-[#d9e8fb] bg-white shadow-[0_12px_24px_-18px_rgba(47,143,255,0.4)] dark:border-white/[0.06] dark:bg-[#1A1A1D]">
              <img src="/logo.png" alt="Flowro Logo" className="h-7 w-7 object-contain" />
            </div>
            {!isCollapsed ? (
              <div className="text-left">
                <p className="font-medium text-slate-900 dark:text-white/[0.9]">Flowro</p>
                <p className="text-xs text-slate-500 dark:text-white/[0.5]">Product workspace</p>
              </div>
            ) : null}
          </button>

          {!isCollapsed ? (
            <button
              onClick={toggleCollapsed}
              className="rounded-xl p-2 text-slate-400 transition hover:bg-white hover:text-slate-700 dark:hover:bg-[#1E1E22] dark:hover:text-white/[0.7]"
              title="Collapse sidebar"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
          ) : (
            <button
              onClick={toggleCollapsed}
              className="rounded-xl p-2 text-slate-400 transition hover:bg-white hover:text-slate-700 dark:hover:bg-[#1E1E22] dark:hover:text-white/[0.7]"
              title="Expand sidebar"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          )}
        </div>

        <button
          onClick={() => {
            if (onNewChat) {
              onNewChat();
            } else {
              router.push("/app");
            }
          }}
          className={`${shellButton} ${isCollapsed ? "justify-center px-0" : "justify-center"} bg-[#2f8fff] text-white shadow-[0_18px_28px_-18px_rgba(47,143,255,0.65)] hover:bg-[#267ce6] hover:text-white`}
          title="New Chat"
        >
          <span className="material-symbols-outlined text-[18px]">edit_square</span>
          {!isCollapsed ? <span>New Chat</span> : null}
        </button>

        {!isCollapsed ? (
          <section className="rounded-[1.5rem] border border-[#e5ddd3] bg-white/72 p-2 shadow-[0_20px_38px_-34px_rgba(34,51,84,0.28)] dark:border-white/[0.06] dark:bg-[#1A1A1D]/60">
            <div className="flex items-center justify-between px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-white/[0.5]">Recents</p>
              <span className="rounded-full bg-[#f4efe8] px-2 py-1 text-[11px] text-slate-500 dark:bg-[#1E1E22] dark:text-white/[0.5]">
                {recentProjects.length}
              </span>
            </div>

            <div className="mt-1 space-y-1">
              {isLoadingProjects ? (
                <div className="px-3 py-4 text-sm text-slate-500 dark:text-white/[0.5]">Loading projects...</div>
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
                        className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition ${
                          isActive
                            ? "border border-[#bfd8ff] bg-[#edf5ff] text-slate-900 dark:border-[#5B8DEF]/30 dark:bg-[#5B8DEF]/10 dark:text-white/[0.9]"
                            : "border border-transparent text-slate-600 hover:bg-[#faf6f0] hover:text-slate-900 dark:text-white/[0.5] dark:hover:bg-[#1E1E22] dark:hover:text-white/[0.9]"
                        }`}
                      >
                        <div
                          className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${
                            isActive ? "bg-white text-[#2f8fff] dark:bg-[#0C0C0E] dark:text-[#5B8DEF]" : "bg-[#f4efe8] text-slate-400 dark:bg-[#1E1E22] dark:text-white/[0.4]"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[15px]">description</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium leading-tight">{project.name}</p>
                          <p className="mt-0.5 text-[11px] text-slate-400">
                            {new Date(project.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </button>

                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          setOpenProjectMenuId(isMenuOpen ? null : project.id);
                        }}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-xl p-2 transition ${
                          isMenuOpen ? "bg-white opacity-100 dark:bg-[#1A1A1D]" : "opacity-0 group-hover:opacity-100 hover:bg-white dark:hover:bg-[#1E1E22]"
                        }`}
                        title="Project options"
                      >
                        <span className="material-symbols-outlined text-[18px] text-slate-400">more_horiz</span>
                      </button>

                      {isMenuOpen ? (
                        <div className="absolute left-full top-0 z-50 ml-3 w-44 overflow-hidden rounded-2xl border border-[#e4ddd4] bg-white shadow-[0_24px_48px_-26px_rgba(20,27,44,0.28)] dark:border-white/[0.06] dark:bg-[#1A1A1D]">
                          <button
                            onClick={() => openRenameModal(project)}
                            className="flex w-full items-center gap-2 px-4 py-3 text-sm text-slate-700 transition hover:bg-[#f8fafc] dark:text-white/[0.7] dark:hover:bg-[#242428]"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                            Rename
                          </button>
                          <button
                            onClick={() => openDeleteModal(project.id)}
                            className="flex w-full items-center gap-2 px-4 py-3 text-sm text-red-500 transition hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                            Delete
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <div className="px-3 py-4 text-sm text-slate-500 dark:text-white/[0.5]">
                  No projects yet. Start a new chat to generate your first project plan.
                </div>
              )}
            </div>
          </section>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 pt-2">
        <button
          onClick={toggleTheme}
          className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground transition hover:bg-accent hover:text-accent-foreground ${isCollapsed ? "justify-center" : ""}`}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          <span className="material-symbols-outlined text-[18px]">
            {theme === "dark" ? "light_mode" : "dark_mode"}
          </span>
          {!isCollapsed && <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>}
        </button>
      </div>

      <div className="relative pt-2" ref={profileMenuRef}>
        {isProfileMenuOpen && user ? (
          <div
            className="absolute bottom-full left-0 z-50 mb-3 w-64 overflow-hidden rounded-[1.5rem] border border-[#e4ddd4] bg-white shadow-[0_24px_48px_-26px_rgba(20,27,44,0.28)] dark:border-white/[0.06] dark:bg-[#1A1A1D]"
            style={{ minWidth: isCollapsed ? "256px" : "100%" }}
          >
            <div className="border-b border-[#ece4d9] px-4 py-4 dark:border-white/[0.06]">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400 dark:text-white/[0.4]">Account</p>
              <p className="mt-2 truncate text-sm text-slate-700 dark:text-white/[0.7]">{user.email || "user@example.com"}</p>
            </div>

            <div className="py-2">
              <button
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  setIsPricingModalOpen(true);
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-sm text-slate-700 transition hover:bg-[#f8fafc] dark:text-white/[0.7] dark:hover:bg-[#242428]"
              >
                <span className="material-symbols-outlined text-[20px] text-slate-400 dark:text-white/[0.4]">tune</span>
                View all plans
              </button>
            </div>

            <div className="border-t border-[#ece4d9] py-2 dark:border-white/[0.06]">
              <button
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  handleLogout();
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-sm text-slate-700 transition hover:bg-[#f8fafc] dark:text-white/[0.7] dark:hover:bg-[#242428]"
              >
                <span className="material-symbols-outlined text-[20px] text-slate-400 dark:text-white/[0.4]">logout</span>
                Log out
              </button>
            </div>
          </div>
        ) : null}

        {user ? (
          <button
            onClick={() => setIsProfileMenuOpen((prev) => !prev)}
            className={`flex w-full items-center gap-3 rounded-[1.5rem] border border-[#e4ddd4] bg-white/82 p-3 shadow-[0_20px_38px_-34px_rgba(34,51,84,0.28)] transition hover:bg-white dark:border-white/[0.06] dark:bg-[#1A1A1D]/82 dark:hover:bg-[#1E1E22] ${
              isCollapsed ? "justify-center" : ""
            }`}
            title="Profile menu"
          >
            {user.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="size-9 rounded-full object-cover" />
            ) : (
              <div className="flex size-9 items-center justify-center rounded-full bg-[#edf5ff] text-xs font-bold text-[#2f8fff] dark:bg-[#5B8DEF]/10 dark:text-[#5B8DEF]">
                {getUserInitials()}
              </div>
            )}

            {!isCollapsed ? (
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-white/[0.9]">
                  {user.displayName || user.email?.split("@")[0] || "User"}
                </p>
                <p className="truncate text-xs text-slate-500 dark:text-white/[0.5]">Builder Plan</p>
              </div>
            ) : null}
          </button>
        ) : null}
      </div>

      <RenameProjectModal
        isOpen={renameModalOpen}
        onClose={() => { setRenameModalOpen(false); setRenameProjectId(null); setRenameValue(""); }}
        onRename={async (newName) => {
          if (!user || !renameProjectId) return;
          setIsRenaming(true);
          try {
            const response = await authPatch(`/api/projects/${renameProjectId}`, user, { name: newName });
            if (response.ok) {
              setRecentProjects((prev) =>
                prev.map((p) => p.id === renameProjectId ? { ...p, name: newName } : p)
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
        onClose={() => { setDeleteModalOpen(false); setDeleteProjectId(null); }}
        onDelete={handleDeleteProject}
        projectName={recentProjects.find((p) => p.id === deleteProjectId)?.name ?? ""}
        isDeleting={isDeleting}
      />

      <PricingModal isOpen={isPricingModalOpen} onClose={() => setIsPricingModalOpen(false)} />
    </aside>
  );
}
