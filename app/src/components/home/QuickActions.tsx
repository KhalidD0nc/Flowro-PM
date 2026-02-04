/**
 * Phase 3.B — UI Only
 *
 * Quick action buttons for common templates.
 * Buttons log to console only - no real functionality.
 */

"use client";

import { useState } from "react";

interface QuickAction {
  id: string;
  title: string;
  label: string;
  icon: string;
  iconColor: string;
}

// Static placeholder actions - no business logic
const PLACEHOLDER_ACTIONS: QuickAction[] = [
  {
    id: "task-manager",
    title: "Build Task Manager App",
    label: "Build a task manager app with user authentication, task priorities, due dates, and a simple dashboard.",
    icon: "task_alt",
    iconColor: "text-cyan-400",
  },
  {
    id: "warehouse-mgmt",
    title: "Warehouse Inventory System",
    label: "Design a warehouse management system with real-time inventory tracking, multi-location support, and barcode scanning.",
    icon: "inventory_2",
    iconColor: "text-violet-400",
  },
  {
    id: "healthcare-portal",
    title: "Healthcare Patient Portal",
    label: "Create a healthcare patient portal with secure messaging, appointment scheduling, medical record access, and prescription refills.",
    icon: "medical_services",
    iconColor: "text-orange-400",
  },
];

export default function QuickActions() {
  // Local hover state for visual feedback
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Placeholder handler - logs and dispatches event for dynamic placeholder
  const handleActionClick = (action: QuickAction) => {
    console.log(`[Phase 3.B] Quick action clicked: ${action.title}`);
    window.dispatchEvent(new CustomEvent('flowro:set-placeholder', { detail: action.label }));
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
      {PLACEHOLDER_ACTIONS.map((action) => (
        <button
          key={action.id}
          type="button"
          onClick={() => handleActionClick(action)}
          onMouseEnter={() => setHoveredId(action.id)}
          onMouseLeave={() => setHoveredId(null)}
          className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-all ${hoveredId === action.id
            ? "border-white/10 bg-white/10 text-white"
            : "border-white/5 bg-white/5 text-slate-300"
            }`}
        >
          <span className={`material-symbols-outlined text-[18px] ${action.iconColor}`}>
            {action.icon}
          </span>
          {action.title}
        </button>
      ))}
    </div>
  );
}
