"use client"

import { useEffect, useState } from "react"
import { useAuth } from "./Providers"
import EmptyLaunchPlan from "./EmptyLaunchPlan"
import BacklogBoard from "./BacklogBoard"
import { Task } from "@/app/api/tasks/service"

interface LaunchPlanViewerProps {
    isOpen: boolean
    onClose: () => void
    projectId: string
    projectName: string
}

export default function LaunchPlanViewer({
    isOpen,
    onClose,
    projectId,
    projectName
}: LaunchPlanViewerProps) {
    const { user } = useAuth()
    const [view, setView] = useState<"loading" | "empty" | "board">("loading")
    const [tasks, setTasks] = useState<Task[]>([])
    const [isGenerating, setIsGenerating] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Fetch tasks on open
    useEffect(() => {
        if (!isOpen || !projectId || !user) return

        const fetchTasks = async () => {
            try {
                const token = await user.getIdToken()
                const res = await fetch(`/api/tasks?projectId=${projectId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                })

                if (res.ok) {
                    const data = await res.json()
                    setTasks(data.tasks || [])
                    setView(data.tasks.length > 0 ? "board" : "empty")
                } else {
                    setView("empty")
                }
            } catch (err) {
                console.error("Error fetching tasks:", err)
                setView("empty")
            }
        }

        fetchTasks()
    }, [isOpen, projectId, user])

    const handleGenerate = async () => {
        if (!user || !projectId) return

        setIsGenerating(true)
        setError(null)

        try {
            const token = await user.getIdToken()
            const res = await fetch("/api/tasks/generate", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ projectId })
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || "Failed to generate plan")
            }

            const data = await res.json()
            setTasks(data.tasks || [])
            setView("board")
        } catch (err) {
            console.error("Generation error:", err)
            setError(err instanceof Error ? err.message : "Failed to generate plan")
        } finally {
            setIsGenerating(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#101922]">
            {/* Header */}
            <header className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b border-[#283039] bg-[#0d141c] shrink-0 gap-2">
                <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                    <button
                        onClick={onClose}
                        className="flex items-center justify-center rounded-lg p-1.5 sm:p-2 text-[#9dabb9] transition-colors hover:bg-white/10 hover:text-white shrink-0"
                    >
                        <span className="material-symbols-outlined text-xl sm:text-2xl">arrow_back</span>
                    </button>
                    <div className="min-w-0">
                        <h1 className="text-sm sm:text-lg font-bold text-white flex items-center gap-1.5 sm:gap-2 flex-wrap">
                            <span className="shrink-0">Launch Plan</span>
                            <span className="text-[#9dabb9] font-normal text-xs sm:text-sm px-1.5 sm:px-2 py-0.5 rounded-full bg-[#283039] border border-[#3d4a56] truncate max-w-[100px] xs:max-w-[150px] sm:max-w-none">
                                {projectName}
                            </span>
                        </h1>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    {view === "board" && (
                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className="flex items-center justify-center gap-1.5 sm:gap-2 p-2 sm:px-3 sm:py-1.5 rounded-lg bg-[#283039] hover:bg-[#3d4a56] text-white text-xs sm:text-sm font-medium transition-colors"
                            title={isGenerating ? "Regenerating..." : "Regenerate"}
                        >
                            <span className="material-symbols-outlined text-[16px] sm:text-[18px]">
                                {isGenerating ? "sync" : "refresh"}
                            </span>
                            <span className="hidden sm:inline">{isGenerating ? "Regenerating..." : "Regenerate"}</span>
                        </button>
                    )}
                </div>
            </header>

            {/* Content */}
            <main className="flex-1 overflow-hidden relative">
                {view === "loading" && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[#137fec] animate-spin text-4xl">
                            hourglass_top
                        </span>
                    </div>
                )}

                {view === "empty" && (
                    <EmptyLaunchPlan
                        onGenerate={handleGenerate}
                        isGenerating={isGenerating}
                    />
                )}

                {view === "board" && (
                    <BacklogBoard tasks={tasks} />
                )}

                {/* Error Banner */}
                {error && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-4 py-2 rounded-lg shadow-xl backdrop-blur-sm flex items-center gap-2 text-sm z-50">
                        <span className="material-symbols-outlined text-[18px]">error</span>
                        {error}
                        <button onClick={() => setError(null)} className="ml-2 opacity-80 hover:opacity-100">
                            <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                    </div>
                )}
            </main>
        </div>
    )
}
