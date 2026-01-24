"use client"

import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import KanbanTaskCard, { Task } from "./KanbanTaskCard"

export interface KanbanColumnData {
    id: string
    name: string
    color: string
}

interface KanbanColumnProps {
    column: KanbanColumnData
    tasks: Task[]
    onTaskClick?: (task: Task) => void
    onAddTask?: (columnId: string) => void
}

export default function KanbanColumn({
    column,
    tasks,
    onTaskClick,
    onAddTask,
}: KanbanColumnProps) {
    const { setNodeRef, isOver } = useDroppable({
        id: column.id,
        data: {
            type: "column",
            column,
        },
    })

    const taskIds = tasks.map((t) => t.id)

    return (
        <div className="flex flex-col h-full min-w-[260px] w-[260px] sm:min-w-[280px] sm:w-[280px] md:min-w-[300px] md:w-[300px]">
            {/* Column Header */}
            <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                    <div
                        className="h-2.5 w-2.5 rounded-full ring-2 ring-offset-2 ring-offset-[#101922]"
                        style={{ backgroundColor: column.color, boxShadow: `0 0 8px ${column.color}40` }}
                    />
                    <h3 className="text-sm font-semibold text-white">
                        {column.name}
                    </h3>
                    <span className="flex items-center justify-center min-w-[22px] h-5 px-2 text-xs font-semibold text-[#9dabb9] bg-[#283039]/80 rounded-full">
                        {tasks.length}
                    </span>
                </div>
                {onAddTask && (
                    <button
                        onClick={() => onAddTask(column.id)}
                        className="p-1.5 rounded-lg text-[#9dabb9] hover:text-white hover:bg-white/10 transition-all hover:scale-110"
                        title={`Add task to ${column.name}`}
                    >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                    </button>
                )}
            </div>

            {/* Column Body - Droppable area */}
            <div
                ref={setNodeRef}
                className={`
                    flex-1 rounded-xl border-2 border-dashed p-2 transition-all duration-200 overflow-y-auto
                    ${isOver
                        ? "border-[#137fec]/60 bg-[#137fec]/5 scale-[1.01]"
                        : "border-[#283039]/50 bg-[#101922]/30 hover:border-[#283039]/80"
                    }
                `}
                style={{
                    minHeight: '200px',
                }}
            >
                <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                    <div className="flex flex-col gap-2">
                        {tasks.map((task) => (
                            <KanbanTaskCard
                                key={task.id}
                                task={task}
                                onClick={onTaskClick}
                            />
                        ))}
                    </div>
                </SortableContext>

                {/* Empty state */}
                {tasks.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="flex size-12 items-center justify-center rounded-xl bg-[#283039]/30 mb-3">
                            <span className="material-symbols-outlined text-[24px] text-[#9dabb9]/40">
                                {column.id === 'planning' ? 'edit_note' : column.id === 'in_progress' ? 'play_circle' : 'check_circle'}
                            </span>
                        </div>
                        <p className="text-xs text-[#9dabb9]/50 font-medium">
                            No tasks yet
                        </p>
                        {onAddTask && (
                            <button
                                onClick={() => onAddTask(column.id)}
                                className="mt-2 text-xs text-[#137fec] hover:text-blue-400 transition-colors flex items-center gap-1"
                            >
                                <span className="material-symbols-outlined text-[14px]">add</span>
                                Add task
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
