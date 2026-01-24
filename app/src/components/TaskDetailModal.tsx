"use client"

import { useState, useEffect, useRef } from "react"
import { Task } from "./KanbanBoard/KanbanTaskCard"

interface TaskDetailModalProps {
    isOpen: boolean
    task?: Task | null
    defaultStatus?: string
    onClose: () => void
    onSave: (data: TaskFormData) => Promise<void>
    onDelete?: (taskId: string) => Promise<void>
}

export interface TaskFormData {
    title: string
    description: string
    status: string
    priority: "low" | "medium" | "high" | "critical"
    dueDate: string
    tags: string[]
}

const priorityOptions = [
    { value: "low", label: "Low", color: "bg-slate-400", icon: "remove" },
    { value: "medium", label: "Medium", color: "bg-amber-400", icon: "drag_handle" },
    { value: "high", label: "High", color: "bg-orange-500", icon: "priority_high" },
    { value: "critical", label: "Critical", color: "bg-red-500", icon: "warning" },
]

const statusOptions = [
    { value: "planning", label: "Planning", color: "#9dabb9", icon: "edit_note" },
    { value: "in_progress", label: "In Progress", color: "#137fec", icon: "play_circle" },
    { value: "launched", label: "Launched", color: "#10b981", icon: "check_circle" },
]

export default function TaskDetailModal({
    isOpen,
    task,
    defaultStatus = "planning",
    onClose,
    onSave,
    onDelete,
}: TaskDetailModalProps) {
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [status, setStatus] = useState(defaultStatus)
    const [priority, setPriority] = useState<TaskFormData["priority"]>("medium")
    const [showDetails, setShowDetails] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const titleInputRef = useRef<HTMLInputElement>(null)
    const modalRef = useRef<HTMLDivElement>(null)

    const isEditing = !!task

    // Reset form when modal opens/closes or task changes
    useEffect(() => {
        if (isOpen) {
            if (task) {
                setTitle(task.title)
                setDescription(task.description || "")
                setStatus(task.status)
                setPriority(task.priority)
                setShowDetails(true) // Show details when editing
            } else {
                setTitle("")
                setDescription("")
                setStatus(defaultStatus)
                setPriority("medium")
                setShowDetails(false)
            }
            setError(null)
            setIsLoading(false)
            setIsDeleting(false)
            // Focus title input after a brief delay
            setTimeout(() => titleInputRef.current?.focus(), 100)
        }
    }, [isOpen, task, defaultStatus])

    // Handle ESC key to close modal
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen && !isLoading && !isDeleting) {
                onClose()
            }
        }

        document.addEventListener("keydown", handleKeyDown)
        return () => document.removeEventListener("keydown", handleKeyDown)
    }, [isOpen, isLoading, isDeleting, onClose])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        const trimmedTitle = title.trim()
        if (!trimmedTitle) {
            setError("Please enter a task title.")
            return
        }

        setIsLoading(true)

        try {
            await onSave({
                title: trimmedTitle,
                description: description.trim(),
                status,
                priority,
                dueDate: "",
                tags: [],
            })
            onClose()
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save task")
            setIsLoading(false)
        }
    }

    const handleQuickAdd = async () => {
        const trimmedTitle = title.trim()
        if (!trimmedTitle || isLoading) return

        setIsLoading(true)
        setError(null)

        try {
            await onSave({
                title: trimmedTitle,
                description: "",
                status: defaultStatus,
                priority: "medium",
                dueDate: "",
                tags: [],
            })
            // Clear and keep modal open for another task
            setTitle("")
            setIsLoading(false)
            titleInputRef.current?.focus()
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to add task")
            setIsLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!task || !onDelete) return

        if (!confirm("Delete this task?")) {
            return
        }

        setIsDeleting(true)
        try {
            await onDelete(task.id)
            onClose()
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete task")
            setIsDeleting(false)
        }
    }

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget && !isLoading && !isDeleting) {
            onClose()
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.shiftKey && !showDetails) {
            e.preventDefault()
            handleQuickAdd()
        }
    }

    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={handleBackdropClick}
        >
            <div
                ref={modalRef}
                className="relative w-full sm:max-w-md mx-0 sm:mx-4 rounded-t-2xl sm:rounded-2xl border border-[#283039] bg-[#18212b] p-4 sm:p-6 shadow-2xl shadow-black/50 max-h-[85vh] overflow-y-auto animate-slide-up"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    disabled={isLoading || isDeleting}
                    className="absolute top-3 right-3 rounded-lg p-1.5 text-[#9dabb9] transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
                    aria-label="Close modal"
                >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                </button>

                {/* Header */}
                <div className="mb-4">
                    <h2 id="modal-title" className="text-lg font-semibold text-white">
                        {isEditing ? "Edit Task" : "Add Task"}
                    </h2>
                    {task?.source.type === "ai_generated" && (
                        <p className="text-xs text-[#137fec] flex items-center gap-1 mt-1">
                            <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                            AI Generated
                        </p>
                    )}
                </div>

                {/* Quick Add Form */}
                <form onSubmit={handleSubmit}>
                    {/* Title Input - Always visible */}
                    <div className="relative mb-3">
                        <input
                            ref={titleInputRef}
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="What needs to be done?"
                            className="w-full rounded-xl border border-[#283039] bg-[#101922] px-4 py-3 text-base text-white placeholder-[#9dabb9]/50 transition-all focus:border-[#137fec] focus:ring-2 focus:ring-[#137fec]/20 focus:outline-none"
                            disabled={isLoading}
                            autoComplete="off"
                        />
                        {!isEditing && !showDetails && title.trim() && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                <span className="text-xs text-[#9dabb9]/50">Press Enter</span>
                            </div>
                        )}
                    </div>

                    {/* Toggle Details Button */}
                    {!isEditing && (
                        <button
                            type="button"
                            onClick={() => setShowDetails(!showDetails)}
                            className="flex items-center gap-1.5 text-sm text-[#9dabb9] hover:text-white transition-colors mb-3"
                        >
                            <span className="material-symbols-outlined text-[16px]">
                                {showDetails ? "expand_less" : "tune"}
                            </span>
                            {showDetails ? "Hide options" : "Add details"}
                        </button>
                    )}

                    {/* Expanded Details */}
                    {(showDetails || isEditing) && (
                        <div className="space-y-4 animate-fade-in">
                            {/* Description */}
                            <div>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Add a description (optional)"
                                    rows={2}
                                    className="w-full rounded-xl border border-[#283039] bg-[#101922] px-4 py-3 text-sm text-white placeholder-[#9dabb9]/50 transition-all focus:border-[#137fec] focus:ring-2 focus:ring-[#137fec]/20 focus:outline-none resize-none"
                                    disabled={isLoading}
                                />
                            </div>

                            {/* Status Pills */}
                            <div>
                                <label className="text-xs font-medium text-[#9dabb9] mb-2 block">Status</label>
                                <div className="flex gap-2 flex-wrap">
                                    {statusOptions.map((opt) => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setStatus(opt.value)}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                                status === opt.value
                                                    ? "bg-white/10 text-white ring-1 ring-white/20"
                                                    : "bg-[#101922] text-[#9dabb9] hover:bg-white/5 hover:text-white"
                                            }`}
                                            disabled={isLoading}
                                        >
                                            <span
                                                className="material-symbols-outlined text-[16px]"
                                                style={{ color: opt.color }}
                                            >
                                                {opt.icon}
                                            </span>
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Priority Pills */}
                            <div>
                                <label className="text-xs font-medium text-[#9dabb9] mb-2 block">Priority</label>
                                <div className="flex gap-2 flex-wrap">
                                    {priorityOptions.map((opt) => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setPriority(opt.value as TaskFormData["priority"])}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                                priority === opt.value
                                                    ? "bg-white/10 text-white ring-1 ring-white/20"
                                                    : "bg-[#101922] text-[#9dabb9] hover:bg-white/5 hover:text-white"
                                            }`}
                                            disabled={isLoading}
                                        >
                                            <div className={`w-2 h-2 rounded-full ${opt.color}`} />
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400 mt-3">
                            <span className="material-symbols-outlined text-[16px]">error</span>
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#283039]/50">
                        {/* Delete button (only for existing tasks) */}
                        {isEditing && onDelete && (
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={isLoading || isDeleting}
                                className="flex items-center gap-1 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                            >
                                {isDeleting ? (
                                    <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                                ) : (
                                    <span className="material-symbols-outlined text-[16px]">delete</span>
                                )}
                            </button>
                        )}

                        <div className="flex items-center gap-2 ml-auto">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isLoading || isDeleting}
                                className="px-4 py-2 text-sm font-medium text-[#9dabb9] hover:text-white transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading || isDeleting || !title.trim()}
                                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-[#137fec] to-blue-600 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-blue-500/40 hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 disabled:shadow-none"
                            >
                                {isLoading ? (
                                    <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                                ) : (
                                    <span className="material-symbols-outlined text-[16px]">check</span>
                                )}
                                {isEditing ? "Save" : "Add Task"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {/* Animation styles */}
            <style jsx>{`
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .animate-slide-up {
                    animation: slideUp 0.2s ease-out;
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fade-in {
                    animation: fadeIn 0.2s ease-out;
                }
            `}</style>
        </div>
    )
}
