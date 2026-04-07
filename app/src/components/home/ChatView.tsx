"use client"

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react"
import type { User } from "firebase/auth"
import { ChatPanel, type ChatMessage, type Intent, type ProjectView, type PRDConfig, type PRDView } from "@/components/chat"
import PRDPreview from "@/components/prd/PRDPreview"

interface ChatViewProps {
    projectId: string
    initialMessage: string
    user: User
    onBack: () => void
    isExisting?: boolean
}

function buildLocalPrdView(projectId: string, prdConfig: PRDConfig): PRDView {
    return {
        id: projectId,
        projectId,
        config: prdConfig,
        updatedAt: new Date().toISOString(),
    }
}

export default function ChatView({
    projectId,
    initialMessage,
    user,
    onBack,
    isExisting = false,
}: ChatViewProps) {
    const [project, setProject] = useState<ProjectView | null>(null)
    const [loadingProject, setLoadingProject] = useState(true)
    const [currentPrd, setCurrentPrd] = useState<PRDConfig | null>(null)
    const [message, setMessage] = useState("")
    const [isGenerating, setIsGenerating] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [thinkingPhase, setThinkingPhase] = useState(0)
    const [isPrdPreviewOpen, setIsPrdPreviewOpen] = useState(false)
    const hasInitialized = useRef(false)

    useEffect(() => {
        if (!isGenerating) {
            setThinkingPhase(0)
            return
        }

        const timers = [
            setTimeout(() => setThinkingPhase(1), 2500),
            setTimeout(() => setThinkingPhase(2), 5000),
            setTimeout(() => setThinkingPhase(3), 7500),
            setTimeout(() => setThinkingPhase(4), 10000),
        ]

        return () => {
            timers.forEach(clearTimeout)
        }
    }, [isGenerating])

    const generateResponse = useCallback(async (
        userMessage: string,
        history: ChatMessage[],
        appendOptimisticUserMessage: boolean = true
    ) => {
        setIsGenerating(true)
        setError(null)

        if (appendOptimisticUserMessage) {
            const optimisticMessage: ChatMessage = {
                role: "user",
                content: userMessage,
                timestamp: new Date().toISOString(),
            }

            setProject((prev) => prev ? {
                ...prev,
                chatHistory: [...prev.chatHistory, optimisticMessage],
            } : prev)
        }

        try {
            const token = await user.getIdToken()
            const response = await fetch("/api/generate", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message: userMessage,
                    projectId,
                    context: history,
                }),
            })

            const data = await response.json()
            if (!response.ok) {
                throw new Error(data.error || "Generation failed")
            }

            const assistantMessage: ChatMessage = {
                role: "assistant",
                content: data.message,
                intent: data.intent as Intent,
                timestamp: new Date().toISOString(),
            }

            setProject((prev) => {
                if (!prev) {
                    return prev
                }

                const nextPrd = data.prdConfig
                    ? buildLocalPrdView(projectId, data.prdConfig)
                    : prev.latestPrd

                return {
                    ...prev,
                    projectName: data.productName || prev.projectName,
                    chatHistory: [...prev.chatHistory, assistantMessage],
                    latestPrd: nextPrd,
                }
            })

            if (data.prdConfig) {
                setCurrentPrd(data.prdConfig)
            }
        } catch (err) {
            console.error("Generation error:", err)
            setError(err instanceof Error ? err.message : "Generation failed")
        } finally {
            setIsGenerating(false)
        }
    }, [projectId, user])

    useEffect(() => {
        if (hasInitialized.current) {
            return
        }
        hasInitialized.current = true

        async function initializeProject() {
            try {
                const token = await user.getIdToken()
                const response = await fetch(`/api/projects/${projectId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                })

                if (!response.ok) {
                    throw new Error("Project not found")
                }

                const data = await response.json()
                const initialChatHistory: ChatMessage[] = isExisting
                    ? (data.chatHistory || [])
                    : (data.chatHistory?.length
                        ? data.chatHistory
                        : initialMessage.trim()
                            ? [{
                                role: "user" as const,
                                content: initialMessage.trim(),
                                timestamp: new Date().toISOString(),
                            }]
                            : [])

                const nextProject: ProjectView = {
                    id: data.id,
                    projectName: data.projectName || data.name || "Untitled Project",
                    description: data.description,
                    chatHistory: initialChatHistory,
                    createdAt: data.createdAt,
                    updatedAt: data.updatedAt,
                    latestPrd: data.latestPrd,
                }

                setProject(nextProject)
                setCurrentPrd(data.latestPrd?.config || null)

                if (!isExisting && !data.latestPrd && initialMessage.trim()) {
                    await generateResponse(initialMessage.trim(), initialChatHistory, false)
                }
            } catch (err) {
                console.error("Failed to initialize project:", err)
                setError("Failed to load project")
            } finally {
                setLoadingProject(false)
            }
        }

        void initializeProject()
    }, [generateResponse, initialMessage, isExisting, projectId, user])

    const handleSendMessage = async (event: FormEvent) => {
        event.preventDefault()
        if (!message.trim() || isGenerating || !project) {
            return
        }

        const userMessage = message.trim()
        const history = project.chatHistory
        setMessage("")
        await generateResponse(userMessage, history, true)
    }

    if (loadingProject) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <span className="material-symbols-outlined animate-spin text-4xl text-[#137fec]">hourglass_top</span>
                    <p className="text-sm text-slate-400">Preparing your session...</p>
                </div>
            </div>
        )
    }

    if (!project) {
        return (
            <div className="flex flex-1 flex-col items-center justify-center gap-4">
                <span className="material-symbols-outlined text-5xl text-red-400">error</span>
                <p className="text-lg text-slate-100">Failed to load project</p>
                <button
                    onClick={onBack}
                    className="rounded-lg bg-[#137fec] px-4 py-2 font-medium text-white transition-colors hover:bg-blue-600"
                >
                    Back to Command Center
                </button>
            </div>
        )
    }

    return (
        <div className="flex h-full flex-1 flex-col overflow-hidden">
            <header className="relative z-10 shrink-0 border-b border-white/15 bg-[#111a27]">
                <div className="flex items-center justify-between px-4 py-2 sm:px-6">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="hidden size-8 items-center justify-center rounded-lg bg-white/10 sm:flex">
                            <span className="material-symbols-outlined text-base text-slate-300">
                                {isGenerating ? "progress_activity" : "description"}
                            </span>
                        </div>

                        <div className="min-w-0">
                            <h1 className="truncate text-sm font-semibold tracking-tight text-slate-100">
                                {project.projectName}
                            </h1>
                        </div>

                        <button
                            onClick={() => setIsPrdPreviewOpen(true)}
                            className="group inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-400 transition-all hover:bg-white/5 hover:text-slate-200"
                            title="Open PRD"
                        >
                            <span className="material-symbols-outlined text-[16px]">article</span>
                            <span className="hidden md:inline">Open PRD</span>
                        </button>
                    </div>
                </div>
            </header>

            <ChatPanel
                project={project}
                currentPrd={currentPrd}
                isGenerating={isGenerating}
                isStreaming={false}
                streamedContent=""
                thinkingPhase={thinkingPhase}
                generationMode={currentPrd ? "chat" : "initial"}
                message={message}
                error={error}
                selectionContext={null}
                onMessageChange={setMessage}
                onSendMessage={handleSendMessage}
                onOpenBlueprint={() => setIsPrdPreviewOpen(true)}
                onApplyProposedChanges={() => undefined}
                onClearContext={() => undefined}
                onQuickAction={setMessage}
            />

            <PRDPreview
                isOpen={isPrdPreviewOpen}
                onClose={() => setIsPrdPreviewOpen(false)}
                prd={currentPrd}
                projectName={project.projectName}
            />
        </div>
    )
}
