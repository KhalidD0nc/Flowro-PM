/**
 * Phase 3 — Fully Functional Sidebar
 *
 * Collapsible sidebar with:
 * - Persistent state via localStorage
 * - Real user data
 * - Profile popup menu with settings, logout
 * - Recent projects from API with 3-dot menu for actions
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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

  // Sidebar collapsed state - persisted in localStorage
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  // Profile menu state
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Project actions menu state
  const [openProjectMenuId, setOpenProjectMenuId] = useState<string | null>(null);
  const projectMenuRef = useRef<HTMLDivElement>(null);

  // Pricing modal state
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);

  // Rename modal state
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameProjectId, setRenameProjectId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

  // Delete confirmation state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (stored === "true") {
      setIsCollapsed(true);
    }
  }, []);

  // Persist collapsed state to localStorage
  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => {
      const newValue = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(newValue));
      return newValue;
    });
  }, []);

  // Fetch recent projects function
  const fetchRecentProjects = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoadingProjects(true);
      const response = await authGet("/api/projects", user);
      if (response.ok) {
        const data = await response.json();
        // Sort all projects by last updated (most recent first)
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

  // Fetch on mount
  useEffect(() => {
    fetchRecentProjects();
  }, [fetchRecentProjects]);

  // Refetch when returning to Command Center (activeProjectId becomes null)
  useEffect(() => {
    if (activeProjectId === null) {
      fetchRecentProjects();
    }
  }, [activeProjectId, fetchRecentProjects]);

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOutUser();
      router.push("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Get user initials
  const getUserInitials = () => {
    if (!user?.displayName) return user?.email?.charAt(0).toUpperCase() || "U";
    const names = user.displayName.split(" ");
    return names
      .map((n) => n.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Close profile menu when clicking outside
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

  // Handle rename project
  const handleRenameProject = async () => {
    if (!user || !renameProjectId || !renameValue.trim()) return;

    setIsRenaming(true);
    try {
      const response = await authPatch(`/api/projects/${renameProjectId}`, user, {
        name: renameValue.trim(),
      });

      if (response.ok) {
        setRecentProjects((prev) =>
          prev.map((p) =>
            p.id === renameProjectId ? { ...p, name: renameValue.trim() } : p
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

  // Handle delete project
  const handleDeleteProject = async () => {
    if (!user || !deleteProjectId) return;

    setIsDeleting(true);
    try {
      const response = await authDelete(`/api/projects/${deleteProjectId}`, user);

      if (response.ok) {
        setRecentProjects((prev) => prev.filter((p) => p.id !== deleteProjectId));
        setDeleteModalOpen(false);
        setDeleteProjectId(null);

        // If the deleted project was active, go back to command center
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

  // Open rename modal
  const openRenameModal = (project: RecentProject) => {
    setRenameProjectId(project.id);
    setRenameValue(project.name);
    setRenameModalOpen(true);
    setOpenProjectMenuId(null);
  };

  // Open delete confirmation
  const openDeleteModal = (projectId: string) => {
    setDeleteProjectId(projectId);
    setDeleteModalOpen(true);
    setOpenProjectMenuId(null);
  };

  return (
    <aside
      className={`flex flex-col justify-between border-r border-white/10 bg-[#0a0d12] p-4 shrink-0 z-20 transition-all duration-300 ${isCollapsed ? "w-16" : "w-full md:w-64"
        }`}
    >
      {/* Top Section */}
      <div className="flex flex-col gap-6">
        {/* Logo / Brand with Toggle */}
        <div className="flex items-center justify-between px-1 py-2">
          <button
            onClick={() => {
              if (onNewChat) {
                onNewChat();
              } else {
                router.push("/app");
              }
            }}
            className="flex items-center gap-3"
          >
            <img
              src="/logo.png"
              alt="Flowro Logo"
              className={`transition-all duration-300 ${isCollapsed ? "hidden md:block size-10" : "h-10 w-auto"}`}
            />
          </button>

          {/* Collapse Toggle */}
          <button
            onClick={toggleCollapsed}
            className={`p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors ${isCollapsed ? "mx-auto" : ""
              }`}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <span className="material-symbols-outlined text-[18px]">
              {isCollapsed ? "chevron_right" : "chevron_left"}
            </span>
          </button>
        </div>

        {/* New Chat Button */}
        <button
          onClick={() => {
            if (onNewChat) {
              onNewChat();
            } else {
              router.push("/app");
            }
          }}
          className={`flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2.5 text-sm font-semibold text-white hover:bg-white/15 transition-all ${isCollapsed ? "justify-center px-2" : "justify-start"
            }`}
          title="New Chat"
        >
          <span className="material-symbols-outlined text-slate-300">
            edit
          </span>
          {!isCollapsed && <span>New Chat</span>}
        </button>



        {/* Projects Section */}
        {!isCollapsed && (
          <div className="flex flex-col gap-1 mt-2">
            <div className="px-3 pb-2 pt-1">
              <p className="text-xs font-semibold text-slate-300/70 uppercase tracking-wider">
                Projects
              </p>
            </div>

            {isLoadingProjects ? (
              <div className="px-3 py-2 text-slate-500 text-sm">Loading...</div>
            ) : recentProjects.length > 0 ? (
              recentProjects.map((project) => {
                const isActive = activeProjectId === project.id;
                const isMenuOpen = openProjectMenuId === project.id;
                return (
                  <div key={project.id} className="relative group" ref={isMenuOpen ? projectMenuRef : null}>
                    <button
                      onClick={() => {
                        if (onProjectSelect) {
                          onProjectSelect(project.id);
                        } else {
                          router.push(`/app/${project.id}`);
                        }
                      }}
                      className={`flex items-center gap-3 truncate rounded-lg px-3 py-2 text-sm transition-colors w-full text-left ${isActive
                        ? "bg-white/10 text-white"
                        : "text-slate-300 hover:bg-white/5 hover:text-white"
                        }`}
                    >
                      <span className={`material-symbols-outlined text-[16px] ${isActive ? "text-cyan-400" : "opacity-70"}`}>
                        description
                      </span>
                      <span className="truncate flex-1">{project.name}</span>
                    </button>

                    {/* 3-dot menu button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenProjectMenuId(isMenuOpen ? null : project.id);
                      }}
                      className={`absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-md transition-opacity ${isMenuOpen ? "opacity-100 bg-white/10" : "opacity-0 group-hover:opacity-100 hover:bg-white/10"}`}
                      title="Project options"
                    >
                      <span className="material-symbols-outlined text-[16px] text-slate-400">
                        more_vert
                      </span>
                    </button>

                    {/* Project actions dropdown */}
                    {isMenuOpen && (
                      <div className="absolute left-full top-0 ml-2 w-40 rounded-lg bg-[#0f141a] shadow-xl overflow-hidden z-50 py-1">
                        <button
                          onClick={() => openRenameModal(project)}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                          Rename
                        </button>
                        <button
                          onClick={() => openDeleteModal(project.id)}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="px-3 py-2 text-slate-500 text-sm">
                No projects yet. Start by creating a new one.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Section - Profile Menu */}
      <div className="relative pt-4" ref={profileMenuRef}>
        {/* Profile Menu Popup */}
        {isProfileMenuOpen && user && (
          <div
            className="absolute bottom-full left-0 mb-2 w-64 rounded-xl bg-[#0f141a] shadow-xl overflow-hidden z-50"
            style={{ minWidth: isCollapsed ? '256px' : '100%' }}
          >
            {/* User Email */}
            <div className="px-4 py-3 border-b border-white/10">
              <p className="text-sm text-[#9dabb8] truncate">
                {user.email || "user@example.com"}
              </p>
            </div>

            {/* Menu Items */}
            <div className="py-1">
              <button
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  setIsPricingModalOpen(true);
                }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-[#c5ccd4] hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px] opacity-70">tune</span>
                <span className="text-sm">View all plans</span>
              </button>
            </div>

            {/* Logout */}
            <div className="py-1 border-t border-white/10">
              <button
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  handleLogout();
                }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-[#c5ccd4] hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px] opacity-70">logout</span>
                <span className="text-sm">Log out</span>
              </button>
            </div>
          </div>
        )}

        {/* User Profile Button */}
        {user && (
          <button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className={`w-full flex items-center gap-3 rounded-lg bg-white/5 p-2 hover:bg-white/10 transition-colors cursor-pointer ${isCollapsed ? "justify-center" : ""
              }`}
            title="Profile menu"
          >
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt="Profile"
                className="size-8 rounded-full object-cover ring-2 ring-violet-500/30"
              />
            ) : (
              <div className="size-8 rounded-full bg-gradient-to-tr from-cyan-500 to-violet-500 flex items-center justify-center text-xs font-bold text-white">
                {getUserInitials()}
              </div>
            )}
            {!isCollapsed && (
              <div className="flex flex-col overflow-hidden text-left flex-1">
                <p className="truncate text-sm font-medium text-white">
                  {user.displayName || user.email?.split("@")[0] || "User"}
                </p>
                <p className="truncate text-xs text-cyan-400 font-medium">Builder Plan</p>
              </div>
            )}
          </button>
        )}
      </div>

      {/* Rename Modal */}
      {renameModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-[#0f141a] p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-4">Rename Project</h3>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="w-full rounded-lg bg-white/5 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 mb-4"
              placeholder="Project name"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRenameProject();
                if (e.key === "Escape") {
                  setRenameModalOpen(false);
                  setRenameProjectId(null);
                }
              }}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setRenameModalOpen(false);
                  setRenameProjectId(null);
                }}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRenameProject}
                disabled={isRenaming || !renameValue.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-cyan-500 to-violet-500 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isRenaming ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-[#0f141a] p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex size-10 items-center justify-center rounded-full bg-red-500/10 text-red-400">
                <span className="material-symbols-outlined">warning</span>
              </div>
              <h3 className="text-lg font-semibold text-white">Delete Project</h3>
            </div>
            <p className="text-slate-400 mb-6">
              Are you sure you want to delete this project? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setDeleteModalOpen(false);
                  setDeleteProjectId(null);
                }}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProject}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pricing Modal */}
      <PricingModal 
        isOpen={isPricingModalOpen}
        onClose={() => setIsPricingModalOpen(false)}
      />
    </aside>
  );
}
