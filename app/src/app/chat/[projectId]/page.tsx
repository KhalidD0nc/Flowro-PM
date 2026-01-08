"use client"

import { useAuth } from "@/components/Providers"
import { useRouter, useParams } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import UBPViewer, { UBPContent } from "@/components/UBPViewer"

interface Blueprint {
    id: string
    projectId: string
    version: string
    status: "draft" | "locked" | "approved"
    content: unknown | null
    createdAt: string
    lockedAt?: string
}

interface Project {
    id: string
    projectName: string
    description?: string
    chatHistory: { role: string; content: string; timestamp: string }[]
    createdAt: string
    updatedAt: string
    latestBlueprint?: Blueprint
}

interface ChatMessage {
    role: "user" | "assistant"
    content: string
    timestamp: string
    hasUBP?: boolean  // Flag if this message contains UBP content
}

// Helper to detect if content is UBP JSON
function isUBPContent(content: unknown): boolean {
    if (!content || typeof content !== "object") return false

    // Check for UBP structure keys (API format or viewer format)
    const ubpKeys = ["productVision", "scope", "actors", "behaviors", "constraints", "constraintsRisks", "techDecisions", "techStack", "phases", "integrations", "changelog", "changeLog"]
    const contentObj = content as Record<string, unknown>

    return ubpKeys.some(key => key in contentObj)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformApiToUBP(apiData: any): UBPContent {
    // DEBUG: Log the incoming data structure
    console.log("=== UBP Transform Debug ===")
    console.log("Raw API Data:", JSON.stringify(apiData, null, 2))
    console.log("apiData.productVision:", apiData.productVision)
    console.log("apiData.scope:", apiData.scope)
    console.log("apiData.actors:", apiData.actors)
    console.log("apiData.behaviors:", apiData.behaviors)

    // Transform productVision
    const productVision = apiData.productVision ? {
        description: apiData.productVision.problem || apiData.productVision.description,
        primaryGoal: apiData.productVision.successSignal || apiData.productVision.primaryGoal,
        targetAudience: apiData.productVision.targetActor || apiData.productVision.targetAudience
    } : undefined

    // Transform actors from API format to array format
    let actors: { name: string; description: string; icon?: string }[] | undefined
    if (apiData.actors) {
        if (Array.isArray(apiData.actors)) {
            actors = apiData.actors
        } else {
            // Convert object format to array
            actors = []
            if (apiData.actors.primary) {
                actors.push({ name: apiData.actors.primary, description: "Primary user", icon: "person" })
            }
            if (apiData.actors.secondary && Array.isArray(apiData.actors.secondary)) {
                apiData.actors.secondary.forEach((s: string) => {
                    actors!.push({ name: s, description: "Support role", icon: "group" })
                })
            }
            if (apiData.actors.systems && Array.isArray(apiData.actors.systems)) {
                apiData.actors.systems.forEach((s: string) => {
                    actors!.push({ name: s, description: "External system", icon: "smart_toy" })
                })
            }
        }
    }

    // Transform behaviors
    const behaviors = apiData.behaviors?.map((b: { id?: string; trigger?: string; systemResponse?: string; title?: string; given?: string; when?: string; then?: string; diagramCode?: string; diagram?: string; priority?: string }) => ({
        id: b.id || "BH-01",
        title: b.title || b.systemResponse || "Behavior",
        priority: b.priority,
        given: b.given || (b.trigger ? `User triggers: ${b.trigger}` : undefined),
        when: b.when || b.trigger,
        then: b.then || b.systemResponse,
        diagram: b.diagram || b.diagramCode
    }))

    // Transform constraints from constraintsRisks
    let constraints: { type: "warning" | "risk"; title: string; description: string }[] | undefined
    if (apiData.constraints && Array.isArray(apiData.constraints)) {
        constraints = apiData.constraints
    } else if (apiData.constraintsRisks) {
        constraints = []
        if (apiData.constraintsRisks.constraints) {
            apiData.constraintsRisks.constraints.forEach((c: string) => {
                constraints!.push({ type: "warning", title: "Constraint", description: c })
            })
        }
        if (apiData.constraintsRisks.risks) {
            apiData.constraintsRisks.risks.forEach((r: string) => {
                constraints!.push({ type: "risk", title: "Risk", description: r })
            })
        }
    }

    // Transform techStack to techDecisions
    let techDecisions: { category: string; choice: string }[] | undefined
    if (apiData.techDecisions && Array.isArray(apiData.techDecisions)) {
        techDecisions = apiData.techDecisions
    } else if (apiData.techStack) {
        techDecisions = Object.entries(apiData.techStack).map(([category, choice]) => ({
            category: category.charAt(0).toUpperCase() + category.slice(1),
            choice: String(choice)
        }))
    }

    // Transform phases
    const phases = apiData.phases?.map((p: { phase?: string; name?: string; goal?: string; description?: string; outputs?: string[]; timeline?: string; status?: string }, i: number) => ({
        name: p.name || p.phase || `Phase ${i + 1}`,
        timeline: p.timeline,
        description: p.description || p.goal || (p.outputs ? p.outputs.join(", ") : ""),
        status: p.status || (i === 0 ? "current" : "upcoming") as "completed" | "current" | "upcoming"
    }))

    // Transform integrations
    const integrations = apiData.integrations?.map((i: { service?: string; system?: string; purpose?: string; dataFlow?: string; method?: string }) => ({
        system: i.system || i.service || "External Service",
        method: i.method || i.dataFlow || "API",
        purpose: i.purpose || ""
    }))

    // Transform changelog
    let changelog: { version: string; title: string; description: string; timestamp?: string }[] | undefined
    if (apiData.changelog && Array.isArray(apiData.changelog)) {
        changelog = apiData.changelog
    } else if (apiData.changeLog && Array.isArray(apiData.changeLog)) {
        changelog = apiData.changeLog.map((c: { version?: string; summary?: string; reason?: string; title?: string; description?: string; timestamp?: string }) => ({
            version: c.version || "0.1",
            title: c.title || c.summary || "Update",
            description: c.description || c.reason || "",
            timestamp: c.timestamp || "Just now"
        }))
    }

    return {
        productVision,
        scope: apiData.scope,
        actors,
        behaviors,
        constraints,
        techDecisions,
        phases,
        integrations,
        changelog
    }
}

// Helper to parse UBP content from a string
function parseUBPFromString(content: string): UBPContent | null {
    try {
        const parsed = JSON.parse(content)
        if (isUBPContent(parsed)) {
            return transformApiToUBP(parsed)
        }
    } catch {
        // Not JSON
    }
    return null
}

// Helper to get display message for assistant content
function getDisplayMessage(content: string): { text: string; hasUBP: boolean } {
    // Try to parse as JSON
    try {
        const parsed = JSON.parse(content)
        if (isUBPContent(parsed)) {
            // Use the message field if provided by the agent, otherwise use a default
            const agentMessage = parsed.message || "✨ I've updated your Unified Blueprint! Click \"Open Blueprint\" to see the details."
            return {
                text: agentMessage,
                hasUBP: true
            }
        }
        // Other JSON - still don't show raw
        if (typeof parsed === "object") {
            const agentMessage = parsed.message || "I've processed your request and updated the project."
            return {
                text: agentMessage,
                hasUBP: false
            }
        }
    } catch {
        // Not JSON, return as-is
    }

    return { text: content, hasUBP: false }
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
    const [isUBPViewerOpen, setIsUBPViewerOpen] = useState(false)
    const [currentUBP, setCurrentUBP] = useState<UBPContent | null>(null)
    const [isSaving, setIsSaving] = useState(false)
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

                // Extract UBP from latest blueprint if available
                if (data.latestBlueprint?.content) {
                    setCurrentUBP(transformApiToUBP(data.latestBlueprint.content))
                }
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

            // Store raw content for chat history
            const rawContent = typeof data.content === "string"
                ? data.content
                : JSON.stringify(data.content)

            const assistantMessage: ChatMessage = {
                role: "assistant",
                content: rawContent,
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

            // Update current UBP if response contains UBP content
            if (data.content && typeof data.content === "object" && isUBPContent(data.content)) {
                setCurrentUBP(transformApiToUBP(data.content))
            } else if (typeof data.content === "string") {
                const parsed = parseUBPFromString(data.content)
                if (parsed) {
                    setCurrentUBP(parsed)
                }
            }
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

    const handleOpenUBP = () => {
        setIsUBPViewerOpen(true)
    }

    const handleSaveVersion = async () => {
        if (!user || !project?.latestBlueprint?.id) return

        setIsSaving(true)
        try {
            const token = await user.getIdToken()
            const res = await fetch("/api/blueprints", {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    blueprintId: project.latestBlueprint.id,
                    action: "save-version",
                }),
            })

            if (!res.ok) {
                throw new Error("Failed to save version")
            }

            const data = await res.json()

            // Update project with new draft blueprint
            setProject((prev) =>
                prev
                    ? {
                        ...prev,
                        latestBlueprint: data.newDraft,
                    }
                    : prev
            )
        } catch (err) {
            console.error("Error saving version:", err)
            setError("Failed to save version. Please try again.")
        } finally {
            setIsSaving(false)
        }
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
                    {/* Blueprint button */}
                    <button
                        onClick={handleOpenUBP}
                        className="flex items-center gap-2 bg-[#1f2937] hover:bg-[#283039] border border-[#283039] text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                        <span className="material-symbols-outlined text-[18px] text-[#137fec]">description</span>
                        <span className="hidden sm:inline">Blueprint</span>
                        {project.latestBlueprint && (
                            <span className="text-xs bg-[#137fec]/20 text-[#137fec] px-1.5 py-0.5 rounded">
                                v{project.latestBlueprint.version}
                            </span>
                        )}
                    </button>
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
                        project.chatHistory.map((msg, index) => {
                            const isUser = msg.role === "user"
                            const displayInfo = isUser
                                ? { text: msg.content, hasUBP: false }
                                : getDisplayMessage(msg.content)

                            return (
                                <div
                                    key={index}
                                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                                >
                                    <div
                                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${isUser
                                            ? "bg-[#137fec] text-white"
                                            : "bg-[#18212b] border border-[#283039] text-white"
                                            }`}
                                    >
                                        <p className="whitespace-pre-wrap">{displayInfo.text}</p>

                                        {/* Open Blueprint button */}
                                        {displayInfo.hasUBP && (
                                            <button
                                                onClick={handleOpenUBP}
                                                className="mt-3 flex items-center gap-2 bg-[#137fec]/20 hover:bg-[#137fec]/30 text-[#137fec] font-medium py-2 px-3 rounded-lg transition-colors text-sm"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                                                Open Blueprint
                                            </button>
                                        )}

                                        <p className={`text-xs mt-2 ${isUser ? "text-blue-200" : "text-[#9dabb9]"}`}>
                                            {new Date(msg.timestamp).toLocaleTimeString()}
                                        </p>
                                    </div>
                                </div>
                            )
                        })
                    )}

                    {isGenerating && (
                        <div className="flex justify-start">
                            <div className="bg-[#18212b] border border-[#283039] rounded-2xl px-4 py-3">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined animate-spin text-[#137fec] text-[18px]">
                                        progress_activity
                                    </span>
                                    <span className="text-[#9dabb9]">Crafting your blueprint...</span>
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

            {/* UBP Viewer Side Panel */}
            <UBPViewer
                isOpen={isUBPViewerOpen}
                onClose={() => setIsUBPViewerOpen(false)}
                ubp={currentUBP}
                projectName={project.projectName}
                version={project.latestBlueprint?.version || "0.1"}
                status={project.latestBlueprint?.status || "draft"}
                lastUpdated={project.latestBlueprint?.createdAt
                    ? new Date(project.latestBlueprint.createdAt).toLocaleDateString()
                    : undefined
                }
                onSaveVersion={handleSaveVersion}
                isSaving={isSaving}
            />
        </div>
    )
}
