"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/Providers";
import { signOutUser } from "@/app/auth/actions";
import { authGet, authDelete, authPatch } from "@/lib/authFetch";
import PricingModal from "@/components/PricingModal";

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
    } catch (error) {
      console.error("Error fetching recent projects:", error);
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
    } catch (error) {
      console.error("Error signing out:", error);
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
    } catch (error) {
      console.error("Error renaming project:", error);
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
    } catch (error) {
      console.error("Error deleting project:", error);
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
      className={`relative z-20 flex shrink-0 flex-col justify-between border-r border-[#e4ddd4] bg-[#fbf7f1]/92 px-3 py-4 backdrop-blur-xl transition-all duration-300 ${
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
            <div className="flex size-11 items-center justify-center rounded-2xl border border-[#d9e8fb] bg-white shadow-[0_12px_24px_-18px_rgba(47,143,255,0.4)]">
              <img src="/logo.png" alt="Flowro Logo" className="h-7 w-7 object-contain" />
            </div>
            {!isCollapsed ? (
              <div className="text-left">
                <p className="font-medium text-slate-900">Flowro</p>
                <p className="text-xs text-slate-500">Product workspace</p>
              </div>
            ) : null}
          </button>

          {!isCollapsed ? (
            <button
              onClick={toggleCollapsed}
              className="rounded-xl p-2 text-slate-400 transition hover:bg-white hover:text-slate-700"
              title="Collapse sidebar"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
          ) : (
            <button
              onClick={toggleCollapsed}
              className="rounded-xl p-2 text-slate-400 transition hover:bg-white hover:text-slate-700"
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
          <section className="rounded-[1.5rem] border border-[#e5ddd3] bg-white/72 p-2 shadow-[0_20px_38px_-34px_rgba(34,51,84,0.28)]">
            <div className="flex items-center justify-between px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Recents</p>
              <span className="rounded-full bg-[#f4efe8] px-2 py-1 text-[11px] text-slate-500">
                {recentProjects.length}
              </span>
            </div>

            <div className="mt-1 space-y-1">
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
                        className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition ${
                          isActive
                            ? "border border-[#bfd8ff] bg-[#edf5ff] text-slate-900"
                            : "border border-transparent text-slate-600 hover:bg-[#faf6f0] hover:text-slate-900"
                        }`}
                      >
                        <div
                          className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${
                            isActive ? "bg-white text-[#2f8fff]" : "bg-[#f4efe8] text-slate-400"
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
                          isMenuOpen ? "bg-white opacity-100" : "opacity-0 group-hover:opacity-100 hover:bg-white"
                        }`}
                        title="Project options"
                      >
                        <span className="material-symbols-outlined text-[18px] text-slate-400">more_horiz</span>
                      </button>

                      {isMenuOpen ? (
                        <div className="absolute left-full top-0 z-50 ml-3 w-44 overflow-hidden rounded-2xl border border-[#e4ddd4] bg-white shadow-[0_24px_48px_-26px_rgba(20,27,44,0.28)]">
                          <button
                            onClick={() => openRenameModal(project)}
                            className="flex w-full items-center gap-2 px-4 py-3 text-sm text-slate-700 transition hover:bg-[#f8fafc]"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                            Rename
                          </button>
                          <button
                            onClick={() => openDeleteModal(project.id)}
                            className="flex w-full items-center gap-2 px-4 py-3 text-sm text-red-500 transition hover:bg-red-50"
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
                <div className="px-3 py-4 text-sm text-slate-500">
                  No projects yet. Start a new chat to generate your first project plan.
                </div>
              )}
            </div>
          </section>
        ) : null}
      </div>

      <div className="relative pt-4" ref={profileMenuRef}>
        {isProfileMenuOpen && user ? (
          <div
            className="absolute bottom-full left-0 z-50 mb-3 w-64 overflow-hidden rounded-[1.5rem] border border-[#e4ddd4] bg-white shadow-[0_24px_48px_-26px_rgba(20,27,44,0.28)]"
            style={{ minWidth: isCollapsed ? "256px" : "100%" }}
          >
            <div className="border-b border-[#ece4d9] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Account</p>
              <p className="mt-2 truncate text-sm text-slate-700">{user.email || "user@example.com"}</p>
            </div>

            <div className="py-2">
              <button
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  setIsPricingModalOpen(true);
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-sm text-slate-700 transition hover:bg-[#f8fafc]"
              >
                <span className="material-symbols-outlined text-[20px] text-slate-400">tune</span>
                View all plans
              </button>
            </div>

            <div className="border-t border-[#ece4d9] py-2">
              <button
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  handleLogout();
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-sm text-slate-700 transition hover:bg-[#f8fafc]"
              >
                <span className="material-symbols-outlined text-[20px] text-slate-400">logout</span>
                Log out
              </button>
            </div>
          </div>
        ) : null}

        {user ? (
          <button
            onClick={() => setIsProfileMenuOpen((prev) => !prev)}
            className={`flex w-full items-center gap-3 rounded-[1.5rem] border border-[#e4ddd4] bg-white/82 p-3 shadow-[0_20px_38px_-34px_rgba(34,51,84,0.28)] transition hover:bg-white ${
              isCollapsed ? "justify-center" : ""
            }`}
            title="Profile menu"
          >
            {user.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="size-9 rounded-full object-cover" />
            ) : (
              <div className="flex size-9 items-center justify-center rounded-full bg-[#edf5ff] text-xs font-bold text-[#2f8fff]">
                {getUserInitials()}
              </div>
            )}

            {!isCollapsed ? (
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-medium text-slate-900">
                  {user.displayName || user.email?.split("@")[0] || "User"}
                </p>
                <p className="truncate text-xs text-slate-500">Builder Plan</p>
              </div>
            ) : null}
          </button>
        ) : null}
      </div>

      {renameModalOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/45 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[1.75rem] border border-[#e4ddd4] bg-white p-6 shadow-[0_36px_80px_-40px_rgba(20,27,44,0.35)]">
            <h3 className="text-lg font-semibold text-slate-900">Rename Project</h3>
            <p className="mt-1 text-sm text-slate-500">Update the project name shown in your workspace rail.</p>
            <input
              type="text"
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              className="mt-5 w-full rounded-2xl border border-[#d8e0eb] bg-[#faf8f4] px-4 py-3 text-slate-900 outline-none transition focus:border-[#2f8fff] focus:bg-white focus:ring-4 focus:ring-[#2f8fff]/10"
              placeholder="Project name"
              autoFocus
              onKeyDown={(event) => {
                if (event.key === "Enter") handleRenameProject();
                if (event.key === "Escape") {
                  setRenameModalOpen(false);
                  setRenameProjectId(null);
                }
              }}
            />
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setRenameModalOpen(false);
                  setRenameProjectId(null);
                }}
                className="rounded-full px-4 py-2 text-sm text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleRenameProject}
                disabled={isRenaming || !renameValue.trim()}
                className="rounded-full bg-[#2f8fff] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#267ce6] disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isRenaming ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteModalOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/45 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[1.75rem] border border-[#e4ddd4] bg-white p-6 shadow-[0_36px_80px_-40px_rgba(20,27,44,0.35)]">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-red-50 text-red-500">
                <span className="material-symbols-outlined">warning</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Delete Project</h3>
                <p className="text-sm text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="mt-5 text-sm leading-6 text-slate-600">
              Are you sure you want to delete this project and remove it from your workspace list?
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setDeleteModalOpen(false);
                  setDeleteProjectId(null);
                }}
                className="rounded-full px-4 py-2 text-sm text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProject}
                disabled={isDeleting}
                className="rounded-full bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-red-300"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <PricingModal isOpen={isPricingModalOpen} onClose={() => setIsPricingModalOpen(false)} />
    </aside>
  );
}
