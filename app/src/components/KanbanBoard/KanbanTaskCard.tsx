"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

export interface Task {
    id: string
    projectId: string
    title: string
    description?: string
    status: string
    priority: "low" | "medium" | "high" | "critical"
    assigneeId?: string
    dueDate?: string
    source: {
        type: "manual" | "ai_generated"
        blueprintId?: string
        sectionType?: string
        sectionId?: string
    }
    columnOrder: number
    tags?: string[]
    createdAt: string
    updatedAt: string
}

interface KanbanTaskCardProps {
    task: Task
    onClick?: (task: Task) => void
}

const priorityConfig = {
    critical: { color: "bg-red-500", ring: "ring-red-500/30", label: "Critical" },
    high: { color: "bg-orange-500", ring: "ring-orange-500/30", label: "High" },
    medium: { color: "bg-amber-400", ring: "ring-amber-400/30", label: "Medium" },
    low: { color: "bg-slate-400", ring: "ring-slate-400/30", label: "Low" },
}

export default function KanbanTaskCard({ task, onClick }: KanbanTaskCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: task.id,
        data: {
            type: "task",
            task,
        },
    })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    }

    const handleClick = (e: React.MouseEvent) => {
        // Only trigger click if not dragging
        if (!isDragging && onClick) {
            onClick(task)
        }
    }

    const priority = priorityConfig[task.priority]

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={handleClick}
            className={`
                group cursor-pointer rounded-xl border bg-gradient-to-br from-[#18212b] to-[#1a252f] p-3
                transition-all duration-200
                hover:border-[#3d4a56] hover:shadow-lg hover:shadow-black/20 hover:scale-[1.02]
                ${isDragging
                    ? "opacity-60 shadow-2xl ring-2 ring-[#137fec] scale-105 rotate-2"
                    : "border-[#283039]/80"
                }
            `}
        >
            {/* Title with priority indicator */}
            <div className="flex items-start gap-2.5">
                <div
                    className={`mt-1 h-2.5 w-2.5 rounded-full flex-shrink-0 ${priority.color} ring-2 ${priority.ring}`}
                    title={priority.label}
                />
                <h4 className="text-sm font-medium text-white leading-snug line-clamp-2 flex-1">
                    {task.title}
                </h4>
            </div>

            {/* Description preview */}
            {task.description && (
                <p className="text-xs text-[#9dabb9]/70 line-clamp-2 mt-2 ml-5">
                    {task.description}
                </p>
            )}

            {/* Footer indicators */}
            <div className="flex items-center gap-2 mt-3 ml-5">
                {/* AI Generated badge */}
                {task.source.type === "ai_generated" && (
                    <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#137fec]/10 text-[#137fec] border border-[#137fec]/20"
                        title="AI Generated"
                    >
                        <span className="material-symbols-outlined text-[12px]">auto_awesome</span>
                        AI
                    </span>
                )}

                {/* Spacer */}
                <div className="flex-1" />

                {/* Edit hint on hover */}
                <span className="text-[10px] text-[#9dabb9]/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    Click to edit
                </span>
            </div>
        </div>
    )
}
