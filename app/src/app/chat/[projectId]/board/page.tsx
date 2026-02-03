"use client"

import { useAuth } from "@/components/Providers"
import { useRouter, useParams } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import { KanbanBoard, Task, KanbanColumnData } from "@/components/KanbanBoard"
import TaskDetailModal, { TaskFormData } from "@/components/TaskDetailModal"

interface Project {
    id: string
    projectName: string
    description?: string
}

// Default Launch Plan columns
const DEFAULT_COLUMNS: KanbanColumnData[] = [
    { id: "planning", name: "Planning", color: "#9dabb9" },
    { id: "in_progress", name: "In Progress", color: "#137fec" },
    { id: "launched", name: "Launched", color: "#10b981" },
]

export default function BoardPage() {
    const { user, loading } = useAuth()
    const router = useRouter()
    const params = useParams()
    const projectId = params.projectId as string

    const [project, setProject] = useState<Project | null>(null)
    const [tasks, setTasks] = useState<Task[]>([])
    const [loadingData, setLoadingData] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedTask, setSelectedTask] = useState<Task | null>(null)
    const [defaultStatus, setDefaultStatus] = useState<string>("planning")

    // Redirect if not logged in
    useEffect(() => {
        if (!loading && !user) {
            router.push("/auth")
        }
    }, [user, loading, router])

    // Fetch project and tasks
    useEffect(() => {
        async function fetchData() {
            if (!user || !projectId) return

            try {
                const token = await user.getIdToken()

                // Fetch project info
                const projectRes = await fetch(`/api/projects/${projectId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                })

                if (!projectRes.ok) {
                    throw new Error("Project not found")
                }

                const projectData = await projectRes.json()
                setProject(projectData)

                // Fetch tasks
                const tasksRes = await fetch(`/api/tasks?projectId=${projectId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                })

                if (tasksRes.ok) {
                    const tasksData = await tasksRes.json()
                    setTasks(tasksData.tasks || [])
                }
            } catch (err) {
                console.error("Error fetching data:", err)
                setError(err instanceof Error ? err.message : "Failed to load project")
            } finally {
                setLoadingData(false)
            }
        }

        if (user && projectId) {
            fetchData()
        }
    }, [user, projectId])

    // Handle task click (open edit modal)
    const handleTaskClick = useCallback((task: Task) => {
        setSelectedTask(task)
        setIsModalOpen(true)
    }, [])

    // Handle add task (open create modal with default status)
    const handleAddTask = useCallback((columnId: string) => {
        setSelectedTask(null)
        setDefaultStatus(columnId)
        setIsModalOpen(true)
    }, [])

    // Handle task move (drag-drop)
    const handleTaskMove = useCallback(
        async (taskId: string, newStatus: string, newOrder: number) => {
            if (!user) return

            try {
                const token = await user.getIdToken()
                const res = await fetch(`/api/tasks/${taskId}/move`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ newStatus, newOrder }),
                })

                if (!res.ok) {
                    throw new Error("Failed to move task")
                }

                // Update local state with the response
                const data = await res.json()
                setTasks((prev) =>
                    prev.map((t) => (t.id === taskId ? data.task : t))
                )
            } catch (err) {
                console.error("Error moving task:", err)
                // Refresh tasks on error
                const token = await user.getIdToken()
                const res = await fetch(`/api/tasks?projectId=${projectId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                })
                if (res.ok) {
                    const data = await res.json()
                    setTasks(data.tasks || [])
                }
            }
        },
        [user, projectId]
    )

    // Handle save task (create or update)
    const handleSaveTask = useCallback(
        async (formData: TaskFormData) => {
            if (!user) return

            const token = await user.getIdToken()

            if (selectedTask) {
                // Update existing task
                const res = await fetch(`/api/tasks/${selectedTask.id}`, {
                    method: "PATCH",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(formData),
                })

                if (!res.ok) {
                    throw new Error("Failed to update task")
                }

                const data = await res.json()
                setTasks((prev) =>
                    prev.map((t) => (t.id === selectedTask.id ? data.task : t))
                )
            } else {
                // Create new task
                const res = await fetch("/api/tasks", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        projectId,
                        ...formData,
                    }),
                })

                if (!res.ok) {
                    throw new Error("Failed to create task")
                }

                const data = await res.json()
                setTasks((prev) => [...prev, data.task])
            }
        },
        [user, projectId, selectedTask]
    )

    // Handle delete task
    const handleDeleteTask = useCallback(
        async (taskId: string) => {
            if (!user) return

            const token = await user.getIdToken()
            const res = await fetch(`/api/tasks/${taskId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            })

            if (!res.ok) {
                throw new Error("Failed to delete task")
            }

            setTasks((prev) => prev.filter((t) => t.id !== taskId))
        },
        [user]
    )

    const handleBackToChat = () => {
        router.push(`/chat/${projectId}`)
    }

    const handleBackToDashboard = () => {
        router.push("/app")
    }

    if (loading || loadingData) {
        return (
            <div className="min-h-screen bg-[#101922] flex items-center justify-center">
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#137fec] animate-spin text-3xl">
                        hourglass_top
                    </span>
                </div>
            </div>
        )
    }

    if (!user) return null

    if (error || !project) {
        return (
            <div className="min-h-screen bg-[#101922] flex flex-col items-center justify-center gap-4">
                <span className="material-symbols-outlined text-red-400 text-5xl">error</span>
                <p className="text-white text-lg">{error || "Project not found"}</p>
                <button
                    onClick={handleBackToDashboard}
                    className="flex items-center gap-2 bg-[#137fec] hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    Back to Dashboard
                </button>
            </div>
        )
    }

    return (
        <div className="flex h-screen w-full flex-col bg-[#101922] text-white overflow-hidden">
            {/* Header */}
            <header className="relative flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 shrink-0">
                {/* Glassmorphism background */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#0d141c]/95 via-[#101922]/95 to-[#0d141c]/95 backdrop-blur-xl" />
                {/* Bottom gradient border */}
                <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#10b981]/30 to-transparent" />

                <div className="relative flex items-center gap-2 sm:gap-4 min-w-0">
                    <button
                        onClick={handleBackToChat}
                        className="flex items-center justify-center rounded-xl p-2 sm:p-2.5 text-[#9dabb9] transition-all hover:bg-white/5 hover:text-white hover:scale-105 shrink-0"
                        title="Back to Chat"
                    >
                        <span className="material-symbols-outlined text-[20px] sm:text-[24px]">arrow_back</span>
                    </button>
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        {/* Project avatar */}
                        <div className="hidden sm:flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#10b981]/20 to-[#10b981]/5 border border-[#10b981]/20 shrink-0">
                            <span className="material-symbols-outlined text-[#10b981] text-lg">
                                rocket_launch
                            </span>
                        </div>
                        <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-base sm:text-lg font-semibold text-white truncate">
                                    {project.projectName}
                                </h1>
                                <span className="text-xs sm:text-sm text-[#10b981] font-medium bg-[#10b981]/10 px-2 py-0.5 rounded-lg">Launch Plan</span>
                            </div>
                            {project.description && (
                                <p className="text-xs sm:text-sm text-[#9dabb9] truncate max-w-[200px] sm:max-w-md hidden sm:block">
                                    {project.description}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="relative flex items-center gap-2 sm:gap-3">
                    {/* Chat button */}
                    <button
                        onClick={handleBackToChat}
                        className="group flex items-center gap-2 bg-gradient-to-r from-[#137fec]/10 to-[#137fec]/5 hover:from-[#137fec]/20 hover:to-[#137fec]/10 border border-[#137fec]/20 hover:border-[#137fec]/40 text-white font-medium py-2 px-3 sm:py-2.5 sm:px-4 rounded-xl transition-all hover:shadow-lg hover:shadow-[#137fec]/10"
                    >
                        <span className="material-symbols-outlined text-[18px] text-[#137fec] group-hover:scale-110 transition-transform">
                            chat
                        </span>
                        <span className="hidden md:inline">Chat</span>
                    </button>

                    {/* Add Task button */}
                    <button
                        onClick={() => handleAddTask("planning")}
                        className="flex items-center gap-2 bg-gradient-to-r from-[#10b981] to-emerald-600 hover:from-emerald-500 hover:to-emerald-700 text-white font-medium py-2 px-3 sm:py-2.5 sm:px-4 rounded-xl transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02]"
                    >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                        <span className="hidden sm:inline">Add Task</span>
                    </button>
                </div>
            </header>

            {/* Board Content */}
            <main className="flex-1 overflow-hidden p-3 sm:p-6">
                <KanbanBoard
                    projectId={projectId}
                    tasks={tasks}
                    columns={DEFAULT_COLUMNS}
                    onTaskClick={handleTaskClick}
                    onAddTask={handleAddTask}
                    onTaskMove={handleTaskMove}
                />
            </main>

            {/* Task Detail Modal */}
            <TaskDetailModal
                isOpen={isModalOpen}
                task={selectedTask}
                defaultStatus={defaultStatus}
                onClose={() => {
                    setIsModalOpen(false)
                    setSelectedTask(null)
                }}
                onSave={handleSaveTask}
                onDelete={handleDeleteTask}
            />
        </div>
    )
}
