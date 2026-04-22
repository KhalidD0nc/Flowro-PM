/**
 * Phase 3.B — UI Only
 *
 * Pure presentational component for project cards.
 * Props-based rendering with no internal logic.
 */

export interface ProjectCardProps {
  /** Project title - defaults to "Untitled Project" if empty */
  title?: string;
  /** Status or timestamp text - defaults to empty string */
  subtitle?: string;
  /** Material icon name - defaults to "folder" */
  icon?: string;
  /** Gradient colors for icon background */
  iconGradient?: {
    from: string;
    to: string;
  };
  /** Icon text color - defaults to slate-300 */
  iconColor?: string;
}

// Default gradient for defensive rendering
const DEFAULT_GRADIENT = {
  from: "from-slate-500/10",
  to: "to-slate-500/10",
};

export default function ProjectCard({
  title,
  subtitle,
  icon,
  iconGradient,
  iconColor,
}: ProjectCardProps) {
  // Defensive defaults for all props
  const safeTitle = title?.trim() || "Untitled Project";
  const safeSubtitle = subtitle?.trim() || "";
  const safeIcon = icon?.trim() || "folder";
  const safeGradient = iconGradient || DEFAULT_GRADIENT;
  const safeIconColor = iconColor?.trim() || "text-slate-300";

  return (
    <div className="glass-panel group relative flex items-center gap-4 rounded-xl p-4 transition-all hover:bg-white/5 hover:border-white/10 hover:-translate-y-1 cursor-pointer">
      {/* Icon Container */}
      <div
        className={`flex size-10 items-center justify-center rounded-lg bg-gradient-to-br ${safeGradient.from} ${safeGradient.to} ${safeIconColor} ring-1 ring-white/10`}
      >
        <span className="material-symbols-outlined">{safeIcon}</span>
      </div>

      {/* Text Content */}
      <div className="flex flex-col min-w-0 flex-1">
        <h3 className="truncate text-sm font-bold text-slate-100 group-hover:text-cyan-200 transition-colors">
          {safeTitle}
        </h3>
        {safeSubtitle && (
          <p className="truncate text-xs text-slate-400">{safeSubtitle}</p>
        )}
      </div>

      {/* Hover Action Icon */}
      <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="material-symbols-outlined text-slate-400 text-[18px]">
          open_in_new
        </span>
      </div>
    </div>
  );
}
