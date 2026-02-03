/**
 * Phase 3 — Fully Functional Command Center
 *
 * Command Center main content layout.
 * Fetches real projects from API.
 */

"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/Providers";
import { authGet } from "@/lib/authFetch";
import VisionInput from "./VisionInput";
import QuickActions from "./QuickActions";
import RecentProjects, { type ProjectData } from "./RecentProjects";

// Icon mappings for project cards
const ICON_OPTIONS = [
  { icon: "shopping_cart", from: "from-violet-500/10", to: "to-fuchsia-500/10", color: "text-violet-300" },
  { icon: "security", from: "from-blue-500/10", to: "to-cyan-500/10", color: "text-blue-300" },
  { icon: "view_kanban", from: "from-orange-500/10", to: "to-amber-500/10", color: "text-orange-300" },
  { icon: "chat", from: "from-emerald-500/10", to: "to-teal-500/10", color: "text-emerald-300" },
  { icon: "code", from: "from-pink-500/10", to: "to-rose-500/10", color: "text-pink-300" },
  { icon: "api", from: "from-indigo-500/10", to: "to-purple-500/10", color: "text-indigo-300" },
];

// Format relative time
function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  } catch {
    return "Recently";
  }
}

interface CommandCenterProps {
  onProjectCreated?: (projectId: string, initialMessage: string) => void;
}

export default function CommandCenter({ onProjectCreated }: CommandCenterProps) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch projects on mount
  useEffect(() => {
    const fetchProjects = async () => {
      if (!user) return;

      try {
        setIsLoading(true);
        setError(null);

        const response = await authGet("/api/projects", user);
        if (!response.ok) {
          throw new Error("Failed to fetch projects");
        }

        const data = await response.json();
        const rawProjects = data.projects || [];

        // Sort by updatedAt (most recent first) and transform to ProjectData format with icons
        const transformedProjects: ProjectData[] = rawProjects
          .sort((a: { updatedAt: string }, b: { updatedAt: string }) => {
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          })
          .map((project: { id: string; name: string; updatedAt: string }, index: number) => {
            const iconSet = ICON_OPTIONS[index % ICON_OPTIONS.length];
            return {
              id: project.id,
              title: project.name || "Untitled Project",
              subtitle: formatRelativeTime(project.updatedAt),
              icon: iconSet.icon,
              iconGradient: { from: iconSet.from, to: iconSet.to },
              iconColor: iconSet.color,
            };
          });

        setProjects(transformedProjects);
      } catch (err) {
        console.error("Error fetching projects:", err);
        setError("Unable to load projects");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, [user]);

  // Get user's first name for greeting
  const getFirstName = () => {
    if (user?.displayName) {
      return user.displayName.split(" ")[0];
    }
    return user?.email?.split("@")[0] || "there";
  };

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden">
      {/* Background Gradient Orbs */}
      <div className="absolute top-[-20%] left-[20%] w-[500px] h-[500px] bg-violet-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[10%] w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Content */}
      <div className="z-10 flex w-full max-w-3xl flex-col items-center gap-8 px-6 pb-20">
        {/* Hero Section */}
        <div className="flex flex-col items-center gap-4 text-center">
          {/* Status Badge */}
          <div className="inline-flex items-center rounded-full border border-cyan-500/30 bg-cyan-500/5 px-3 py-1 text-xs font-medium text-cyan-300 backdrop-blur-sm">
            <span className="mr-1.5 relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
            </span>
            System Online v2.4
          </div>

          {/* Headline */}
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-gray-400">
            What&apos;s the vision, {getFirstName()}?
          </h1>

          {/* Subheadline */}
          <p className="text-lg text-slate-400 max-w-lg">
            Describe your product idea, paste a spec document, or start with a
            template to generate a Unified Blueprint instantly.
          </p>
        </div>

        {/* Phase 3.B: Interactive Vision Input */}
        <VisionInput onProjectCreated={onProjectCreated} />

        {/* Phase 3.B: Quick Action Buttons */}
        <QuickActions />
      </div>
    </main>
  );
}
