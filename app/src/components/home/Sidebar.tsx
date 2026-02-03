/**
 * Phase 3 — Fully Functional Sidebar
 *
 * Collapsible sidebar with:
 * - Persistent state via localStorage
 * - Real user data
 * - Navigation to settings, logout
 * - Recent projects from API
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/Providers";
import { signOutUser } from "@/app/auth/actions";
import { authGet } from "@/lib/authFetch";

const SIDEBAR_COLLAPSED_KEY = "flowro_sidebar_collapsed";

interface RecentProject {
  id: string;
  name: string;
  updatedAt: string;
}

export default function Sidebar() {
  const router = useRouter();
  const { user } = useAuth();

  // Sidebar collapsed state - persisted in localStorage
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

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

  // Fetch recent projects
  useEffect(() => {
    const fetchRecentProjects = async () => {
      if (!user) return;

      try {
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
    };

    fetchRecentProjects();
  }, [user]);

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

  return (
    <aside
      className={`flex flex-col justify-between border-r border-white/5 bg-[#050507]/90 backdrop-blur-xl p-4 shrink-0 z-20 transition-all duration-300 ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Top Section */}
      <div className="flex flex-col gap-6">
        {/* Logo / Brand with Toggle */}
        <div className="flex items-center justify-between px-1 py-2">
          <Link href="/app" className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-lg bg-white/5 p-1.5 ring-1 ring-white/10">
              <div className="size-7 rounded bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <span className="material-symbols-outlined text-white text-[18px]">
                  hourglass_top
                </span>
              </div>
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <h1 className="text-base font-bold leading-none tracking-tight text-white">
                  Flowro AI
                </h1>
                <p className="text-[10px] font-medium text-slate-400 mt-1 tracking-wide uppercase opacity-70">
                  Unified Blueprints
                </p>
              </div>
            )}
          </Link>

          {/* Collapse Toggle */}
          <button
            onClick={toggleCollapsed}
            className={`p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors ${
              isCollapsed ? "mx-auto" : ""
            }`}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <span className="material-symbols-outlined text-[18px]">
              {isCollapsed ? "chevron_right" : "chevron_left"}
            </span>
          </button>
        </div>

        {/* New Chat Button */}
        <Link
          href="/app"
          className={`flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500/10 to-violet-500/10 px-3 py-2.5 text-sm font-medium text-white ring-1 ring-white/10 hover:from-cyan-500/20 hover:to-violet-500/20 transition-all ${
            isCollapsed ? "justify-center px-2" : "justify-start"
          }`}
          title="New Chat"
        >
          <span className="material-symbols-outlined text-cyan-400">
            add_circle
          </span>
          {!isCollapsed && <span>New Chat</span>}
        </Link>



        {/* Projects Section */}
        {!isCollapsed && (
          <div className="flex flex-col gap-1 mt-2">
            <div className="px-3 pb-2 pt-1">
              <p className="text-xs font-semibold text-slate-400/60 uppercase tracking-wider">
                Projects
              </p>
            </div>

            {isLoadingProjects ? (
              <div className="px-3 py-2 text-slate-500 text-sm">Loading...</div>
            ) : recentProjects.length > 0 ? (
              recentProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/chat/${project.id}`}
                  className="flex items-center gap-3 truncate rounded-lg px-3 py-1.5 text-slate-400 text-sm hover:bg-white/5 hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px] opacity-70">
                    history
                  </span>
                  <span className="truncate">{project.name}</span>
                </Link>
              ))
            ) : (
              <div className="px-3 py-2 text-slate-500 text-sm">
                No projects yet. Start by creating a new one.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Section */}
      <div className="flex flex-col gap-1 border-t border-white/5 pt-4">
        {/* Settings */}
        <Link
          href="/settings"
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-slate-400 hover:bg-white/5 hover:text-white transition-colors ${
            isCollapsed ? "justify-center" : ""
          }`}
          title="Settings"
        >
          <span className="material-symbols-outlined text-[20px]">
            settings
          </span>
          {!isCollapsed && <p className="text-sm font-medium">Settings</p>}
        </Link>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-slate-400 hover:bg-white/5 hover:text-white transition-colors ${
            isCollapsed ? "justify-center" : ""
          }`}
          title="Logout"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          {!isCollapsed && <p className="text-sm font-medium">Logout</p>}
        </button>

        {/* User Profile Card */}
        {user && (
          <div
            className={`mt-2 flex items-center gap-3 rounded-lg bg-white/5 p-2 ring-1 ring-white/5 ${
              isCollapsed ? "justify-center" : ""
            }`}
          >
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt="Profile"
                className="size-8 rounded-full object-cover"
              />
            ) : (
              <div className="size-8 rounded bg-gradient-to-tr from-violet-500 to-fuchsia-500 flex items-center justify-center text-xs font-bold text-white">
                {getUserInitials()}
              </div>
            )}
            {!isCollapsed && (
              <div className="flex flex-col overflow-hidden">
                <p className="truncate text-sm font-medium text-white">
                  {user.displayName || user.email?.split("@")[0] || "User"}
                </p>
                <p className="truncate text-xs text-slate-400">Free Plan</p>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
