/**
 * Phase 3.C — Read-Only Component
 *
 * Display-only rendering of recent projects.
 * Receives data via props only - no fetching, mutations, or side effects.
 * Defensive rendering for all edge cases.
 */

import ProjectCard, { type ProjectCardProps } from "./ProjectCard";

/**
 * Project data shape - minimal assumptions
 * All fields optional for defensive handling
 */
export interface ProjectData {
  id?: string;
  title?: string;
  subtitle?: string;
  icon?: string;
  iconGradient?: {
    from: string;
    to: string;
  };
  iconColor?: string;
}

export interface RecentProjectsProps {
  /** Array of projects to display - handles undefined, null, empty */
  projects?: ProjectData[] | null;
  /** Loading state indicator */
  isLoading?: boolean;
  /** Error message to display - presence indicates error state */
  error?: string | null;
  /** Optional section title */
  title?: string;
  /** Optional "view all" label */
  viewAllLabel?: string;
}

/**
 * Empty State Component
 * Displayed when no projects are available
 */
function EmptyState() {
  return (
    <div className="glass-panel rounded-xl p-8 text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-full bg-slate-500/10 text-slate-400">
          <span className="material-symbols-outlined text-[24px]">
            folder_off
          </span>
        </div>
        <div>
          <p className="text-sm text-slate-400">
            No projects yet. Start by creating a new one.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Loading State Component
 * Displayed while projects are being fetched
 */
function LoadingState() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Render 4 skeleton cards */}
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="glass-panel rounded-xl p-4 animate-pulse"
        >
          <div className="flex items-center gap-4">
            <div className="size-10 rounded-lg bg-slate-700/50" />
            <div className="flex flex-col gap-2 flex-1">
              <div className="h-4 w-3/4 rounded bg-slate-700/50" />
              <div className="h-3 w-1/2 rounded bg-slate-700/30" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Error State Component
 * Displayed when an error occurs (display only, no retry logic)
 */
function ErrorState({ message }: { message: string }) {
  // Defensive: ensure message is a string
  const safeMessage =
    typeof message === "string" && message.trim()
      ? message.trim()
      : "Unable to load projects";

  return (
    <div className="glass-panel rounded-xl p-6 border-red-500/20">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-red-500/10 text-red-400">
          <span className="material-symbols-outlined text-[20px]">
            error_outline
          </span>
        </div>
        <div>
          <h3 className="text-sm font-medium text-white">
            Something went wrong
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">{safeMessage}</p>
        </div>
      </div>
    </div>
  );
}

export default function RecentProjects({
  projects,
  isLoading = false,
  error = null,
  title = "Jump Back In",
  viewAllLabel = "View all history",
}: RecentProjectsProps) {
  // Defensive: normalize projects array
  const safeProjects: ProjectData[] = Array.isArray(projects)
    ? projects.filter((p): p is ProjectData => p != null && typeof p === "object")
    : [];

  // Defensive: normalize title and label
  const safeTitle = typeof title === "string" && title.trim() ? title.trim() : "Jump Back In";
  const safeViewAllLabel =
    typeof viewAllLabel === "string" && viewAllLabel.trim()
      ? viewAllLabel.trim()
      : "View all history";

  // Determine which state to render
  const renderContent = () => {
    // Priority 1: Loading state
    if (isLoading) {
      return <LoadingState />;
    }

    // Priority 2: Error state
    if (error) {
      return <ErrorState message={error} />;
    }

    // Priority 3: Empty state
    if (safeProjects.length === 0) {
      return <EmptyState />;
    }

    // Priority 4: Render project cards
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {safeProjects.map((project, index) => {
          // Use id if available, fallback to index for key
          const key = project.id?.trim() || `project-${index}`;

          return (
            <ProjectCard
              key={key}
              title={project.title}
              subtitle={project.subtitle}
              icon={project.icon}
              iconGradient={project.iconGradient}
              iconColor={project.iconColor}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* Content Area */}
      {renderContent()}
    </div>
  );
}
