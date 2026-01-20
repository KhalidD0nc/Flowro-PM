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
    chatHistory: ChatMessage[]
    createdAt: string
    updatedAt: string
    latestBlueprint?: Blueprint
}

interface ChatMessage {
    role: "user" | "assistant"
    content: string
    timestamp: string
    intent?: Intent  // New: track intent for each message
    proposedChanges?: ProposedChanges  // New: store proposed changes
}

// Intent types for conversational PM flow
type Intent = 'initial' | 'discussion' | 'proposal'

interface ProposedChanges {
    action: 'add' | 'update' | 'remove'
    summary: string
    sections: string[]
    changes: Record<string, unknown>
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

// Helper to get display info for assistant content
interface DisplayInfo {
    text: string
    intent: Intent
    proposedChanges?: ProposedChanges
}

function getDisplayMessage(content: string | object, msgIntent?: Intent, msgProposedChanges?: ProposedChanges): DisplayInfo {
    // If we have stored intent/proposedChanges from the message, use them
    if (msgIntent) {
        let parsed: unknown = content
        if (typeof content === "string") {
            try {
                parsed = JSON.parse(content)
            } catch {
                // Not JSON
            }
        }
        const obj = parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : null
        const text = obj?.message && typeof obj.message === "string"
            ? obj.message
            : typeof content === "string" ? content : "Check out the Blueprint!"

        return {
            text,
            intent: msgIntent,
            proposedChanges: msgProposedChanges
        }
    }

    // Legacy parsing for existing chat history without intent
    let parsed: unknown = content

    if (typeof content === "string") {
        try {
            parsed = JSON.parse(content)
        } catch {
            // Not JSON, return as discussion
            return { text: content, intent: 'discussion' }
        }
    }

    if (parsed && typeof parsed === "object") {
        const obj = parsed as Record<string, unknown>

        // Check for new intent field
        const intent = (obj.intent === 'initial' || obj.intent === 'discussion' || obj.intent === 'proposal')
            ? obj.intent as Intent
            : isUBPContent(obj) ? 'initial' : 'discussion'

        const text = obj.message && typeof obj.message === "string" && obj.message.trim().length > 0
            ? obj.message
            : intent === 'initial'
                ? "🎯 I've created your Unified Blueprint! Check it out and let me know what you think."
                : "Let me know what you'd like to explore!"

        // Extract proposedChanges if present
        let proposedChanges: ProposedChanges | undefined
        if (obj.proposedChanges && typeof obj.proposedChanges === 'object') {
            const pc = obj.proposedChanges as Record<string, unknown>
            proposedChanges = {
                action: (pc.action as 'add' | 'update' | 'remove') || 'update',
                summary: (pc.summary as string) || 'Blueprint update',
                sections: (pc.sections as string[]) || [],
                changes: (pc.changes as Record<string, unknown>) || {}
            }
        }

        return { text, intent, proposedChanges }
    }

    return { text: String(content), intent: 'discussion' }
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
    const [allVersions, setAllVersions] = useState<Blueprint[]>([])
    const [selectedBlueprint, setSelectedBlueprint] = useState<Blueprint | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Thinking states for animated loading indicator
    const [thinkingPhase, setThinkingPhase] = useState(0)
    const thinkingMessages = ["Thinking...", "Working on it...", "Almost there..."]

    // Cycle through thinking messages while generating
    useEffect(() => {
        if (!isGenerating) {
            setThinkingPhase(0)
            return
        }
        const timer = setInterval(() => {
            setThinkingPhase(p => Math.min(p + 1, 2))
        }, 2500)
        return () => clearInterval(timer)
    }, [isGenerating])

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
                    setSelectedBlueprint(data.latestBlueprint)
                }

                // Fetch all versions
                const versionsRes = await fetch(`/api/blueprints?projectId=${projectId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                })
                if (versionsRes.ok) {
                    const versionsData = await versionsRes.json()
                    setAllVersions(versionsData.blueprints || [])
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

            const data = await res.json()

            if (!res.ok) {
                // Handle structured error responses
                const errorMessage = data.error || "Failed to generate response"

                if (res.status === 429) {
                    // Rate limited - show retry time
                    const retryAfter = data.retryAfter || 60
                    throw new Error(`⏳ ${errorMessage}`)
                } else if (data.retryable) {
                    throw new Error(`${errorMessage} Please try again.`)
                } else {
                    throw new Error(errorMessage)
                }
            }

            // Build assistant message with intent data
            const assistantMessage: ChatMessage = {
                role: "assistant",
                content: data.message || JSON.stringify(data.content || {}),
                timestamp: new Date().toISOString(),
                intent: data.intent as Intent,
                proposedChanges: data.proposedChanges as ProposedChanges | undefined,
            }

            setProject((prev) =>
                prev
                    ? {
                        ...prev,
                        chatHistory: [...prev.chatHistory, assistantMessage],
                    }
                    : prev
            )

            // Only update current UBP on initial intent (new project)
            if (data.intent === 'initial' && data.content && typeof data.content === "object" && isUBPContent(data.content)) {
                setCurrentUBP(transformApiToUBP(data.content))
            }
        } catch (err) {
            console.error("Error generating response:", err)
            // Use the error message if it's an Error, otherwise generic message
            const errorMessage = err instanceof Error ? err.message : "Failed to generate response. Please try again."
            setError(errorMessage)
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

    // Apply proposed changes from a proposal message
    const handleApplyProposedChanges = async (proposedChanges: ProposedChanges, messageIndex: number) => {
        if (!user || !project?.latestBlueprint?.id || !currentUBP) return

        setIsSaving(true)
        try {
            // Merge proposed changes into current UBP
            const updatedUBP = { ...currentUBP }

            // Apply changes from proposedChanges.changes to the UBP
            if (proposedChanges.changes) {
                Object.entries(proposedChanges.changes).forEach(([key, value]) => {
                    if (key in updatedUBP) {
                        // For arrays, we might want to merge or replace
                        if (Array.isArray(value) && Array.isArray((updatedUBP as Record<string, unknown>)[key])) {
                            // Replace the array with the new one (includes all items)
                            (updatedUBP as Record<string, unknown>)[key] = value
                        } else if (typeof value === 'object' && value !== null) {
                            // Merge objects
                            (updatedUBP as Record<string, unknown>)[key] = {
                                ...((updatedUBP as Record<string, unknown>)[key] as object),
                                ...(value as object)
                            }
                        } else {
                            (updatedUBP as Record<string, unknown>)[key] = value
                        }
                    } else {
                        // Add new key
                        (updatedUBP as Record<string, unknown>)[key] = value
                    }
                })
            }

            // Save the updated blueprint via API
            const token = await user.getIdToken()
            const res = await fetch("/api/blueprints", {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    blueprintId: project.latestBlueprint.id,
                    content: updatedUBP,
                }),
            })

            if (!res.ok) {
                throw new Error("Failed to update blueprint")
            }

            // Update local state
            setCurrentUBP(updatedUBP)

            // Remove the proposedChanges from the message (it's been applied)
            setProject((prev) => {
                if (!prev) return prev
                const updatedHistory = [...prev.chatHistory]
                if (updatedHistory[messageIndex]) {
                    updatedHistory[messageIndex] = {
                        ...updatedHistory[messageIndex],
                        proposedChanges: undefined,
                        intent: 'initial' as Intent, // Mark as applied (shows "Open Blueprint" now)
                    }
                }
                return { ...prev, chatHistory: updatedHistory }
            })

            // Open the UBP viewer to show the changes
            setIsUBPViewerOpen(true)
        } catch (err) {
            console.error("Error applying proposed changes:", err)
            setError("Failed to update blueprint. Please try again.")
        } finally {
            setIsSaving(false)
        }
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

            // Update selected blueprint to the new draft
            setSelectedBlueprint(data.newDraft)

            // Refresh versions list to include the newly locked version
            const token2 = await user.getIdToken()
            const versionsRes = await fetch(`/api/blueprints?projectId=${projectId}`, {
                headers: { Authorization: `Bearer ${token2}` },
            })
            if (versionsRes.ok) {
                const versionsData = await versionsRes.json()
                setAllVersions(versionsData.blueprints || [])
            }
        } catch (err) {
            console.error("Error saving version:", err)
            setError("Failed to save version. Please try again.")
        } finally {
            setIsSaving(false)
        }
    }

    const handleVersionSelect = async (blueprintId: string) => {
        if (!user) return

        // Find the selected version from allVersions
        const selected = allVersions.find((v) => v.id === blueprintId)
        if (!selected) return

        // If it's the latest draft, use the project's latestBlueprint data
        if (blueprintId === project?.latestBlueprint?.id) {
            setSelectedBlueprint(project.latestBlueprint)
            if (project.latestBlueprint.content) {
                setCurrentUBP(transformApiToUBP(project.latestBlueprint.content))
            }
            return
        }

        // For other versions, use content from allVersions (API returns full blueprints)
        const fullBlueprint = allVersions.find((v) => v.id === blueprintId)

        if (fullBlueprint) {
            setSelectedBlueprint(fullBlueprint)
            if (fullBlueprint.content) {
                setCurrentUBP(transformApiToUBP(fullBlueprint.content))
            } else {
                setCurrentUBP(null)
            }
        }
    }

    if (loading || loadingProject) {
        return (
            <div className="min-h-screen bg-[#101922] flex items-center justify-center">
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#137fec] animate-spin text-3xl">hourglass_top</span>

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
                                ? { text: msg.content, intent: 'discussion' as Intent }
                                : getDisplayMessage(msg.content, msg.intent, msg.proposedChanges)

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

                                        {/* Proposal preview - show what will be changed */}
                                        {displayInfo.intent === 'proposal' && displayInfo.proposedChanges && (
                                            <div className="mt-3 p-3 bg-[#0d141c] border border-[#283039] rounded-lg">
                                                <div className="flex items-center gap-2 text-[#9dabb9] text-sm mb-2">
                                                    <span className="material-symbols-outlined text-[14px]">edit_note</span>
                                                    Proposed Changes
                                                </div>
                                                <p className="text-sm text-white">{displayInfo.proposedChanges.summary}</p>
                                                {displayInfo.proposedChanges.sections.length > 0 && (
                                                    <p className="text-xs text-[#9dabb9] mt-1">
                                                        Sections: {displayInfo.proposedChanges.sections.join(', ')}
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {/* Context-aware buttons based on intent */}
                                        {!isUser && displayInfo.intent === 'initial' && (
                                            <button
                                                onClick={handleOpenUBP}
                                                className="mt-3 flex items-center gap-2 bg-[#137fec]/20 hover:bg-[#137fec]/30 text-[#137fec] font-medium py-2 px-3 rounded-lg transition-colors text-sm"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                                                Open Blueprint
                                            </button>
                                        )}

                                        {displayInfo.intent === 'proposal' && displayInfo.proposedChanges && (
                                            <button
                                                onClick={() => handleApplyProposedChanges(displayInfo.proposedChanges!, index)}
                                                className="mt-3 flex items-center gap-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-medium py-2 px-3 rounded-lg transition-colors text-sm"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                                                Update Blueprint
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
                                <div className="flex items-center gap-3">
                                    {/* Flipping hourglass logo */}
                                    <img
                                        src="/logo.png"
                                        alt="Flowro"
                                        className="w-6 h-6"
                                        style={{
                                            animation: 'hourglass-flip 2s ease-in-out infinite',
                                        }}
                                    />
                                    <span className="text-[#9dabb9] transition-opacity duration-300">
                                        {thinkingMessages[thinkingPhase]}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Hourglass flip animation */}
                    <style jsx>{`
                        @keyframes hourglass-flip {
                            0%, 100% { transform: rotate(0deg); }
                            50% { transform: rotate(180deg); }
                        }
                    `}</style>

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
                projectDescription={project.description}
                version={selectedBlueprint?.version || project.latestBlueprint?.version || "0.1"}
                status={selectedBlueprint?.status || project.latestBlueprint?.status || "draft"}
                createdAt={selectedBlueprint?.createdAt || project.latestBlueprint?.createdAt}
                lockedAt={selectedBlueprint?.lockedAt || project.latestBlueprint?.lockedAt}
                lastUpdated={selectedBlueprint?.createdAt
                    ? new Date(selectedBlueprint.createdAt).toLocaleDateString()
                    : project.latestBlueprint?.createdAt
                        ? new Date(project.latestBlueprint.createdAt).toLocaleDateString()
                        : undefined
                }
                onSaveVersion={selectedBlueprint?.status === "draft" ? handleSaveVersion : undefined}
                isSaving={isSaving}
                allVersions={allVersions}
                onVersionSelect={handleVersionSelect}
                currentBlueprintId={selectedBlueprint?.id || project.latestBlueprint?.id}
            />
        </div>
    )
}
