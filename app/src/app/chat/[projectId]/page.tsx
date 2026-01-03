"use client"

import { useAuth } from "@/components/Providers"
import { useRouter, useParams } from "next/navigation"
import { useEffect, useState, useRef } from "react"

interface Project {
    id: string
    projectName: string
    description?: string
    chatHistory: { role: string; content: string; timestamp: string }[]
    createdAt: string
    updatedAt: string
}

interface ChatMessage {
    role: "user" | "assistant"
    content: string
    timestamp: string
}

// Helper to safely convert any content to a displayable string
function getContentAsString(content: unknown): string {
    if (typeof content === "string") {
        return content
    }
    if (content && typeof content === "object") {
        // Handle the {raw: ...} fallback from the API
        if ("raw" in content && typeof (content as { raw: unknown }).raw === "string") {
            return (content as { raw: string }).raw
        }
        // For other objects (UBP JSON), stringify nicely
        return JSON.stringify(content, null, 2)
    }
    return String(content)
}

export default function ChatPage() {
    const { user, loading } = useAuth()
    const router = useRouter()
    const params = useParams()
    const projectId = params.projectId as string

    const [project, setProject] = useState<Project | null>(null)
    const [loadingProject, setLoadingProject] = useState(true)
    const [message, setMessage] = useState("")
    const [isGenerating, setIsGenerating] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Redirect if not logged in
    useEffect(() => {
        if (!loading && !user) {
            router.push("/auth")
        }
    }, [user, loading, router])

    // Fetch project data
    useEffect(() => {
        async function fetchProject() {
            if (!user || !projectId) return

            try {
                const token = await user.getIdToken()
                const res = await fetch(`/api/projects/${projectId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                })

                if (!res.ok) {
                    throw new Error("Project not found")
                }

                const data = await res.json()
                setProject(data)
            } catch (err) {
                console.error("Error fetching project:", err)
                setError("Project not found")
            } finally {
                setLoadingProject(false)
            }
        }

        if (user && projectId) {
            fetchProject()
        }
    }, [user, projectId])

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [project?.chatHistory])

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!message.trim() || isGenerating || !user) return

        const userMessage = message.trim()
        setMessage("")
        setIsGenerating(true)
        setError(null)

        // Optimistically add user message to UI
        const tempUserMessage: ChatMessage = {
            role: "user",
            content: userMessage,
            timestamp: new Date().toISOString(),
        }

        setProject((prev) =>
            prev
                ? {
                    ...prev,
                    chatHistory: [...prev.chatHistory, tempUserMessage],
                }
                : prev
        )

        try {
            const token = await user.getIdToken()
            const res = await fetch("/api/generate", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message: userMessage,
                    projectId,
                    context: project?.chatHistory || [],
                }),
            })

            if (!res.ok) {
                throw new Error("Failed to generate response")
            }

            const data = await res.json()

            // Add assistant response - safely extract content
            const assistantContent = getContentAsString(data.content) || "I couldn't generate a response."
            const assistantMessage: ChatMessage = {
                role: "assistant",
                content: assistantContent,
                timestamp: new Date().toISOString(),
            }

            setProject((prev) =>
                prev
                    ? {
                        ...prev,
                        chatHistory: [...prev.chatHistory, assistantMessage],
                    }
                    : prev
            )
        } catch (err) {
            console.error("Error generating response:", err)
            setError("Failed to generate response. Please try again.")
        } finally {
            setIsGenerating(false)
        }
    }

    const handleBackToDashboard = () => {
        router.push("/dashboard")
    }

    if (loading || loadingProject) {
        return (
            <div className="min-h-screen bg-[#101922] flex items-center justify-center">
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#137fec] animate-spin text-3xl">hourglass_empty</span>
                    <span className="text-white">Loading...</span>
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
            <header className="flex items-center justify-between border-b border-[#283039] bg-[#0d141c] px-6 py-4 shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleBackToDashboard}
                        className="flex items-center justify-center rounded-lg p-2 text-[#9dabb9] transition-colors hover:bg-white/10 hover:text-white"
                        title="Back to Dashboard"
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <div className="flex flex-col">
                        <h1 className="text-lg font-bold text-white">{project.projectName}</h1>
                        {project.description && (
                            <p className="text-sm text-[#9dabb9] truncate max-w-md">{project.description}</p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-[#9dabb9]">{project.chatHistory.length} messages</span>
                </div>
            </header>

            {/* Chat Messages */}
            <main className="flex-1 overflow-y-auto p-6">
                <div className="mx-auto max-w-4xl flex flex-col gap-4">
                    {project.chatHistory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="flex size-16 items-center justify-center rounded-2xl bg-[#137fec]/10 mb-4">
                                <span className="material-symbols-outlined text-[#137fec] text-3xl">chat</span>
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2">Start Your Blueprint</h2>
                            <p className="text-[#9dabb9] max-w-md">
                                Tell me about your project idea. I&apos;ll help you create a structured Unified Blueprint.
                            </p>
                        </div>
                    ) : (
                        project.chatHistory.map((msg, index) => (
                            <div
                                key={index}
                                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === "user"
                                        ? "bg-[#137fec] text-white"
                                        : "bg-[#18212b] border border-[#283039] text-white"
                                        }`}
                                >
                                    <p className="whitespace-pre-wrap">{typeof msg.content === "string" ? msg.content : getContentAsString(msg.content)}</p>
                                    <p className={`text-xs mt-2 ${msg.role === "user" ? "text-blue-200" : "text-[#9dabb9]"}`}>
                                        {new Date(msg.timestamp).toLocaleTimeString()}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}

                    {isGenerating && (
                        <div className="flex justify-start">
                            <div className="bg-[#18212b] border border-[#283039] rounded-2xl px-4 py-3">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined animate-spin text-[#137fec] text-[18px]">
                                        progress_activity
                                    </span>
                                    <span className="text-[#9dabb9]">Generating blueprint...</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </main>

            {/* Message Input */}
            <footer className="border-t border-[#283039] bg-[#0d141c] p-4 shrink-0">
                <form onSubmit={handleSendMessage} className="mx-auto max-w-4xl">
                    <div className="flex items-end gap-3">
                        <div className="flex-1 relative">
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault()
                                        handleSendMessage(e)
                                    }
                                }}
                                placeholder="Describe your project idea..."
                                rows={1}
                                className="w-full rounded-xl border border-[#283039] bg-[#18212b] px-4 py-3 text-base text-white placeholder-[#9dabb9]/60 transition-colors focus:border-[#137fec] focus:ring-1 focus:ring-[#137fec] focus:outline-none resize-none min-h-[48px] max-h-[200px]"
                                disabled={isGenerating}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={!message.trim() || isGenerating}
                            className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#137fec] text-white transition-all hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#137fec]"
                        >
                            <span className="material-symbols-outlined">send</span>
                        </button>
                    </div>
                </form>
            </footer>
        </div>
    )
}
