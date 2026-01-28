"use client"

import { Task } from "@/app/api/tasks/service"
import { useMemo, useState } from "react"
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
    defaultDropAnimationSideEffects,
    DropAnimation,
} from "@dnd-kit/core"
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useAuth } from "./Providers"

interface BacklogBoardProps {
    tasks: Task[]
    onTasksUpdate?: (tasks: Task[]) => void
}

const COLUMNS = [
    { id: "backlog", label: "Backlog", color: "bg-purple-500/10 border-purple-500/20 text-purple-400" },
    { id: "in_progress", label: "In Progress", color: "bg-blue-500/10 border-blue-500/20 text-blue-400" },
    { id: "launched", label: "Launched", color: "bg-green-500/10 border-green-500/20 text-green-400" },
]

// Sortable Task Item Component
function SortableTask({ task }: { task: Task }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: task.id, data: { task } })

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
    }

    if (isDragging) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className="bg-[#18212b] border border-[#137fec] p-2.5 sm:p-3 rounded-lg opacity-40 h-[100px]"
            />
        )
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="bg-[#18212b] border border-[#283039] p-2.5 sm:p-3 rounded-lg shadow-sm hover:border-[#137fec]/50 hover:shadow-md transition-all group cursor-grab active:cursor-grabbing"
        >
            <div className="flex items-start justify-between mb-1.5 sm:mb-2">
                <span className={`text-[9px] sm:text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${task.priority === 'critical' ? 'bg-red-500/20 text-red-400' :
                    task.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                        task.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-slate-500/20 text-slate-400'
                    }`}>
                    {task.priority || 'Low'}
                </span>
                {task.source?.type === 'ai_generated' && (
                    <span className="material-symbols-outlined text-[#137fec] text-[14px] sm:text-[16px]" title="AI Generated">
                        auto_awesome
                    </span>
                )}
            </div>
            <h4 className="text-xs sm:text-sm font-medium text-white mb-1.5 sm:mb-2 leading-snug group-hover:text-[#137fec] transition-colors">
                {task.title}
            </h4>
            {task.description && (
                <p className="text-[#9dabb9] text-[10px] sm:text-xs line-clamp-2 mb-2 sm:mb-3">
                    {task.description}
                </p>
            )}
            <div className="flex items-center justify-between text-[#9dabb9] text-[10px] sm:text-xs border-t border-[#283039] pt-1.5 sm:pt-2">
                <span>#{task.source?.sectionId || 'task'}</span>
                <div className="flex -space-x-1.5">
                    <div className="size-4 sm:size-5 rounded-full bg-[#283039] border border-[#18212b]" />
                </div>
            </div>
        </div>
    )
}

export default function BacklogBoard({ tasks, onTasksUpdate }: BacklogBoardProps) {
    const { user } = useAuth()
    const [activeTask, setActiveTask] = useState<Task | null>(null)

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const columns = useMemo(() => {
        const cols: Record<string, Task[]> = {}
        COLUMNS.forEach(col => cols[col.id] = [])
        // Sort tasks by order if available, otherwise by index
        const sortedTasks = [...tasks].sort((a, b) => (a.columnOrder || 0) - (b.columnOrder || 0))

        sortedTasks.forEach(task => {
            const status = task.status || "backlog" // Default to backlog if undefined
            // Normalize status to match column IDs
            const normalizedStatus = status === "planning" ? "backlog" : status

            if (cols[normalizedStatus]) {
                cols[normalizedStatus].push(task)
            } else if (cols["backlog"]) {
                // Fallback for unknown statuses
                cols["backlog"].push(task)
            }
        })
        return cols
    }, [tasks])

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event
        const task = tasks.find(t => t.id === active.id)
        if (task) setActiveTask(task)
    }

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event
        if (!over) return

        const activeId = active.id
        const overId = over.id

        // Find the containers
        const findContainer = (id: string) => {
            if (Object.keys(columns).includes(id as string)) return id as string
            return tasks.find(t => t.id === id)?.status === "planning" ? "backlog" : tasks.find(t => t.id === id)?.status || null
        }

        const activeContainer = findContainer(activeId as string)
        const overContainer = findContainer(overId as string)

        if (!activeContainer || !overContainer || activeContainer === overContainer) {
            return
        }

        // Optimistic UI update for drag over across columns would go here
        // But for simplicity we'll handle the actual move in DragEnd
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event

        if (!over) {
            setActiveTask(null)
            return
        }

        const activeId = active.id as string
        const overId = over.id as string

        const activeTask = tasks.find(t => t.id === activeId)
        if (!activeTask) return

        // Determine destination status and index
        let newStatus = activeTask.status || "backlog"
        if (newStatus === "planning") newStatus = "backlog"

        let newIndex = 0

        // If dropped on a column container directly
        if (Object.keys(columns).includes(overId)) {
            newStatus = overId
            newIndex = columns[overId].length // Append to end
        } else {
            // Dropped on another task
            const overTask = tasks.find(t => t.id === overId)
            if (overTask) {
                newStatus = overTask.status === "planning" ? "backlog" : overTask.status || "backlog"
                const overTaskIndex = columns[newStatus].findIndex(t => t.id === overId)
                // If moving down in same list, index is +1, otherwise same
                const isBelow = over.rect && active.rect.current.translated && active.rect.current.translated.top > over.rect.top + over.rect.height
                newIndex = overTaskIndex + (isBelow ? 1 : 0)
            }
        }

        // Optimistic update
        if (onTasksUpdate) {
            const updatedTasks = tasks.map(t => {
                if (t.id === activeId) {
                    return { ...t, status: newStatus }
                }
                return t
            })
            // Fix locally for smoother UI - real sorting happens on re-render with new data
            onTasksUpdate(updatedTasks)
        }

        setActiveTask(null)

        // API Call
        try {
            const token = await user?.getIdToken()
            if (!token) return

            await fetch(`/api/tasks/${activeId}/move`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    newStatus: newStatus === "backlog" ? "planning" : newStatus, // Map back 'backlog' to 'planning' if needed by backend, or just use column id if backend supports it. Assuming backend supports 'planning', 'in_progress', 'launched'
                    newOrder: newIndex,
                }),
            })
            // In a real app we might refetch tasks here to confirm order
        } catch (error) {
            console.error("Failed to move task:", error)
        }
    }

    const dropAnimation: DropAnimation = {
        sideEffects: defaultDropAnimationSideEffects({
            styles: {
                active: {
                    opacity: '0.4',
                },
            },
        }),
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="relative h-full">
                {/* Scroll hint gradient - left */}
                <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-[#101922] to-transparent pointer-events-none z-10 md:hidden" />
                {/* Scroll hint gradient - right */}
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#101922] via-[#101922]/80 to-transparent pointer-events-none z-10 md:hidden" />

                <div className="flex h-full gap-3 sm:gap-4 overflow-x-auto p-3 sm:p-4 custom-scrollbar scroll-smooth snap-x snap-mandatory md:snap-none">
                    {COLUMNS.map(column => (
                        <div key={column.id} className="flex-none w-[280px] sm:w-80 flex flex-col gap-2 sm:gap-3 snap-start bg-[#101922]/50 rounded-xl">
                            {/* Column Header */}
                            <div className="flex items-center justify-between px-1">
                                <div className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1 rounded-md border text-[10px] sm:text-xs font-bold uppercase tracking-wide ${column.color}`}>
                                    <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-current" />
                                    {column.label}
                                </div>
                                <span className="text-[#9dabb9] text-[10px] sm:text-xs font-mono">
                                    {columns[column.id]?.length || 0}
                                </span>
                            </div>

                            {/* Droppable Area */}
                            <SortableContext
                                id={column.id}
                                items={columns[column.id].map(t => t.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="flex-1 flex flex-col gap-2 sm:gap-3 min-h-[100px]">
                                    {columns[column.id].map(task => (
                                        <SortableTask key={task.id} task={task} />
                                    ))}
                                </div>
                            </SortableContext>
                        </div>
                    ))}
                </div>
            </div>

            <DragOverlay dropAnimation={dropAnimation}>
                {activeTask ? <SortableTask task={activeTask} /> : null}
            </DragOverlay>
        </DndContext>
    )
}
