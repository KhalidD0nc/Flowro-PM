"use client"

import { Task } from "@/app/api/tasks/service"
import { useMemo } from "react"

interface BacklogBoardProps {
    tasks: Task[]
}

const COLUMNS = [
    { id: "backlog", label: "Backlog", color: "bg-purple-500/10 border-purple-500/20 text-purple-400" },
    { id: "in_progress", label: "In Progress", color: "bg-blue-500/10 border-blue-500/20 text-blue-400" },
    { id: "launched", label: "Launched", color: "bg-green-500/10 border-green-500/20 text-green-400" },
]

export default function BacklogBoard({ tasks }: BacklogBoardProps) {
    const columns = useMemo(() => {
        const cols: Record<string, Task[]> = {}
        COLUMNS.forEach(col => cols[col.id] = [])

        tasks.forEach(task => {
            const status = task.status || "planning"
            if (!cols[status]) cols[status] = []
            cols[status].push(task)
        })

        return cols
    }, [tasks])

    return (
        <div className="flex h-full gap-4 overflow-x-auto p-4 custom-scrollbar">
            {COLUMNS.map(column => (
                <div key={column.id} className="flex-none w-80 flex flex-col gap-3">
                    {/* Column Header */}
                    <div className="flex items-center justify-between px-1">
                        <div className={`flex items-center gap-2 px-2.5 py-1 rounded-md border text-xs font-bold uppercase tracking-wide ${column.color}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {column.label}
                        </div>
                        <span className="text-[#9dabb9] text-xs font-mono">
                            {columns[column.id]?.length || 0}
                        </span>
                    </div>

                    {/* Task List */}
                    <div className="flex-1 flex flex-col gap-3 min-h-[100px]">
                        {columns[column.id]?.map(task => (
                            <div
                                key={task.id}
                                className="bg-[#18212b] border border-[#283039] p-3 rounded-lg shadow-sm hover:border-[#137fec]/50 hover:shadow-md transition-all group cursor-pointer"
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${task.priority === 'critical' ? 'bg-red-500/20 text-red-400' :
                                        task.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                                            task.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                                'bg-slate-500/20 text-slate-400'
                                        }`}>
                                        {task.priority || 'Low'}
                                    </span>
                                    {task.source?.type === 'ai_generated' && (
                                        <span className="material-symbols-outlined text-[#137fec] text-[16px]" title="AI Generated">
                                            smart_toy
                                        </span>
                                    )}
                                </div>
                                <h4 className="text-sm font-medium text-white mb-2 leading-snug group-hover:text-[#137fec] transition-colors">
                                    {task.title}
                                </h4>
                                {task.description && (
                                    <p className="text-[#9dabb9] text-xs line-clamp-2 mb-3">
                                        {task.description}
                                    </p>
                                )}
                                <div className="flex items-center justify-between text-[#9dabb9] text-xs border-t border-[#283039] pt-2">
                                    <span>#{task.source?.sectionId || 'task'}</span>
                                    <div className="flex -space-x-1.5">
                                        {/* Placeholder avatars */}
                                        <div className="size-5 rounded-full bg-[#283039] border border-[#18212b]" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}
