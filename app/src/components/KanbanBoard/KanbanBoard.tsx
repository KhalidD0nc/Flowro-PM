"use client"

import { useState, useCallback } from "react"
import {
    DndContext,
    DragOverlay,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
    closestCorners,
    PointerSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core"
import { arrayMove } from "@dnd-kit/sortable"
import KanbanColumn, { KanbanColumnData } from "./KanbanColumn"
import KanbanTaskCard, { Task } from "./KanbanTaskCard"

interface KanbanBoardProps {
    projectId: string
    tasks: Task[]
    columns: KanbanColumnData[]
    onTaskClick?: (task: Task) => void
    onAddTask?: (columnId: string) => void
    onTaskMove?: (taskId: string, newStatus: string, newOrder: number) => Promise<void>
}

export default function KanbanBoard({
    projectId,
    tasks,
    columns,
    onTaskClick,
    onAddTask,
    onTaskMove,
}: KanbanBoardProps) {
    const [localTasks, setLocalTasks] = useState<Task[]>(tasks)
    const [activeTask, setActiveTask] = useState<Task | null>(null)

    // Update local tasks when prop changes
    useState(() => {
        setLocalTasks(tasks)
    })

    // Configure sensors for drag detection
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // 8px movement required before drag starts
            },
        })
    )

    // Get tasks for a specific column
    const getColumnTasks = useCallback(
        (columnId: string) => {
            return localTasks
                .filter((t) => t.status === columnId)
                .sort((a, b) => (a.columnOrder ?? 0) - (b.columnOrder ?? 0))
        },
        [localTasks]
    )

    // Find which column a task belongs to
    const findTaskColumn = useCallback(
        (taskId: string): string | null => {
            const task = localTasks.find((t) => t.id === taskId)
            return task?.status ?? null
        },
        [localTasks]
    )

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event
        const task = localTasks.find((t) => t.id === active.id)
        if (task) {
            setActiveTask(task)
        }
    }

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event
        if (!over) return

        const activeId = active.id as string
        const overId = over.id as string

        // Find the column of the active and over items
        const activeColumn = findTaskColumn(activeId)
        let overColumn: string | null = null

        // Check if dropping over a column directly
        if (columns.find((c) => c.id === overId)) {
            overColumn = overId
        } else {
            // Dropping over another task
            overColumn = findTaskColumn(overId)
        }

        if (!activeColumn || !overColumn || activeColumn === overColumn) {
            return
        }

        // Moving to a different column
        setLocalTasks((prev) => {
            const activeIndex = prev.findIndex((t) => t.id === activeId)
            if (activeIndex === -1) return prev

            const updatedTasks = [...prev]
            updatedTasks[activeIndex] = {
                ...updatedTasks[activeIndex],
                status: overColumn,
            }

            return updatedTasks
        })
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event
        setActiveTask(null)

        if (!over) return

        const activeId = active.id as string
        const overId = over.id as string

        const activeColumn = findTaskColumn(activeId)
        let overColumn: string | null = null
        let overIndex = 0

        // Check if dropping over a column directly
        if (columns.find((c) => c.id === overId)) {
            overColumn = overId
            overIndex = getColumnTasks(overId).length
        } else {
            // Dropping over another task
            overColumn = findTaskColumn(overId)
            if (overColumn) {
                const columnTasks = getColumnTasks(overColumn)
                overIndex = columnTasks.findIndex((t) => t.id === overId)
                if (overIndex === -1) overIndex = columnTasks.length
            }
        }

        if (!activeColumn || !overColumn) return

        // Update local state
        setLocalTasks((prev) => {
            if (activeColumn === overColumn) {
                // Reordering within the same column
                const columnTasks = prev.filter((t) => t.status === activeColumn)
                const otherTasks = prev.filter((t) => t.status !== activeColumn)

                const activeIndex = columnTasks.findIndex((t) => t.id === activeId)
                const overIndex = columnTasks.findIndex((t) => t.id === overId)

                if (activeIndex !== -1 && overIndex !== -1) {
                    const reordered = arrayMove(columnTasks, activeIndex, overIndex)
                    // Update columnOrder for reordered tasks
                    const updated = reordered.map((t, idx) => ({
                        ...t,
                        columnOrder: idx,
                    }))
                    return [...otherTasks, ...updated]
                }
            } else {
                // Moving to a different column (already handled in dragOver)
                const activeIndex = prev.findIndex((t) => t.id === activeId)
                if (activeIndex !== -1) {
                    const updated = [...prev]
                    updated[activeIndex] = {
                        ...updated[activeIndex],
                        status: overColumn,
                        columnOrder: overIndex,
                    }
                    return updated
                }
            }
            return prev
        })

        // Call the API to persist the change
        if (onTaskMove) {
            try {
                await onTaskMove(activeId, overColumn, overIndex)
            } catch (error) {
                console.error("Failed to move task:", error)
                // Revert to original tasks on error
                setLocalTasks(tasks)
            }
        }
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 min-h-[400px] sm:min-h-[500px] snap-x snap-mandatory sm:snap-none">
                {columns.map((column) => (
                    <div key={column.id} className="snap-start">
                        <KanbanColumn
                            column={column}
                            tasks={getColumnTasks(column.id)}
                            onTaskClick={onTaskClick}
                            onAddTask={onAddTask}
                        />
                    </div>
                ))}
            </div>

            {/* Drag overlay - shows the dragged item */}
            <DragOverlay>
                {activeTask && (
                    <div className="rotate-2 scale-105 opacity-90">
                        <KanbanTaskCard task={activeTask} />
                    </div>
                )}
            </DragOverlay>
        </DndContext>
    )
}

// Re-export types for convenience
export type { Task, KanbanColumnData }
