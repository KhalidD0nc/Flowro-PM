/**
 * Chat Page - Project Chat Interface
 * 
 * Main chat page that uses refactored components:
 * - ChatPanel for message display and input
 * - UBPViewer for blueprint viewing/editing
 * - LaunchPlanViewer for task management
 * 
 * Implements Phase 4 of Architecture-Simplification-Plan.md
 * @see /Docs/Architecture-Simplification-Plan.md Phase 4
 */

"use client"

import { useAuth } from "@/components/Providers"
import { useRouter, useParams } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import UBPViewer, { UBPContent } from "@/components/UBPViewer"
import ShareProjectModal from "@/components/ShareProjectModal"
import LaunchPlanViewer from "@/components/LaunchPlanViewer"
import { ChatPanel, type ChatMessage, type Intent, type ProposedChanges, type Project, type Blueprint, isUBPContent } from "@/components/chat"
import type { SelectionContext } from "@/components/chat/types"

// =============================================================================
// Transform Helpers
// =============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformApiToUBP(apiData: any): UBPContent {
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
        given: b.given || (b.trigger ? `User triggers: ${b.trigger} ` : undefined),
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
        name: p.name || p.phase || `Phase ${i + 1} `,
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

// =============================================================================
// Main Component
// =============================================================================

export default function ChatPage() {
    const { user, loading } = useAuth()
    const router = useRouter()
    const params = useParams()
    const projectId = params.projectId as string

    // Project and blueprint state
    const [project, setProject] = useState<Project | null>(null)
    const [loadingProject, setLoadingProject] = useState(true)
    const [currentUBP, setCurrentUBP] = useState<UBPContent | null>(null)
    const [allVersions, setAllVersions] = useState<Blueprint[]>([])
    const [selectedBlueprint, setSelectedBlueprint] = useState<Blueprint | null>(null)

    // Chat state
    const [message, setMessage] = useState("")
    const [isGenerating, setIsGenerating] = useState(false)
    const [error, setError] = useState<string | null>(null) // Transient generation errors (inline)
    const [projectError, setProjectError] = useState<string | null>(null) // Fatal project errors (full-screen)
    const [isStreaming, setIsStreaming] = useState(false)
    const [streamedContent, setStreamedContent] = useState("")
    const [thinkingPhase, setThinkingPhase] = useState(0)
    const thinkingMessages = ["Thinking...", "Working on it...", "Almost there..."]

    // UI state
    const [isUBPViewerOpen, setIsUBPViewerOpen] = useState(false)
    const [isLaunchPlanOpen, setIsLaunchPlanOpen] = useState(false)
    const [isShareModalOpen, setIsShareModalOpen] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [selectionContext, setSelectionContext] = useState<SelectionContext | null>(null)
    const [isLaunchPlanGenerating, setIsLaunchPlanGenerating] = useState(false)

    const messagesEndRef = useRef<HTMLDivElement>(null)
    const chatHistoryRef = useRef<ChatMessage[]>([]) // Issue 4: Ref to capture latest history
    const lastUserMessageRef = useRef<string | null>(null) // Issue 6: Track last message for retry

    // =============================================================================
    // Effects
    // =============================================================================

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

    // Issue 4: Keep chatHistoryRef in sync with latest project.chatHistory
    useEffect(() => {
        if (project?.chatHistory) {
            chatHistoryRef.current = project.chatHistory
        }
    }, [project?.chatHistory])

    // Redirect if not logged in or email not verified
    useEffect(() => {
        if (!loading && !user) {
            router.push("/auth")
        } else if (!loading && user && !user.emailVerified) {
            router.push("/auth?verify=true")
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

                if (data.latestBlueprint?.content) {
                    setCurrentUBP(transformApiToUBP(data.latestBlueprint.content))
                    setSelectedBlueprint(data.latestBlueprint)
                }

                const versionsRes = await fetch(`/api/blueprints?projectId=${projectId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                })
                if (versionsRes.ok) {
                    const versionsData = await versionsRes.json()
                    setAllVersions(versionsData.blueprints || [])
                }
            } catch (err) {
                console.error("Error fetching project:", err)
                setProjectError("Project not found")
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

    // Auto-generate for initial project prompt
    useEffect(() => {
        if (!loadingProject && project && project.chatHistory.length === 1) {
            const firstMsg = project.chatHistory[0]
            if (firstMsg.role === 'user' && !isGenerating) {
                console.log("Auto-generating for initial project prompt")
                // skipPersist=true because the user message is already in the database
                generateResponse([], firstMsg.content, true)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadingProject, project?.id])

    // =============================================================================
    // API Functions
    // =============================================================================

    /**
     * Generate AI response with streaming support
     * @param currentHistory - Chat history for context
     * @param usersMessage - The user's message to respond to
     * @param skipPersist - If true, skip saving user message (used for auto-generate when message already exists)
     */
    const generateResponse = async (currentHistory: ChatMessage[], usersMessage: string, skipPersist: boolean = false) => {
        if (!user) return

        setIsGenerating(true)
        setIsStreaming(true)
        setStreamedContent("")
        setError(null)

        try {
            const token = await user.getIdToken()

            const systemPrompt = `You are Flowro AI, a Lead Product Manager. Output PURE JSON only - no markdown, no code blocks.

CRITICAL: The 'message' property MUST be the FIRST property in your JSON object for streaming to work correctly.

RESPONSE FORMAT:
- For conversations: {"message": "your response here", "intent": "discussion"}
- For blueprint creation: {"message": "brief intro", "intent": "initial", "productVision": {...}, ...}
- For changes: {"message": "summary", "intent": "proposal", "proposedChanges": {...}}

Keep messages concise (2-4 sentences). Be helpful and friendly.`

            const messages = [
                { role: "system", content: systemPrompt },
                ...currentHistory.slice(-5).map(m => ({
                    role: m.role as "user" | "assistant",
                    content: m.content
                })),
                { role: "user", content: usersMessage }
            ]

            // Save user message to DB first (skip if message already persisted, e.g., auto-generate)
            if (!skipPersist) {
                fetch(`/api/projects/${projectId}`, {
                    method: "PATCH",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        appendChat: [{
                            role: "user",
                            content: usersMessage,
                            timestamp: new Date().toISOString(),
                            intent: null,
                        }],
                    }),
                }).catch(err => console.error("Failed to save user message:", err))
            }

            const res = await fetch("/api/generate/stream", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ messages }),
            })

            if (!res.ok) {
                console.warn("Stream failed, falling back to non-streaming")
                await generateResponseNonStreaming(usersMessage, currentHistory, token)
                return
            }

            const reader = res.body?.getReader()
            const decoder = new TextDecoder()
            let accumulated = ""

            if (!reader) {
                throw new Error("No stream reader available")
            }

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                const chunk = decoder.decode(value)
                const lines = chunk.split('\n').filter(line => line.trim())

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue

                    const data = line.slice(6)

                    try {
                        const parsed = JSON.parse(data)

                        if (parsed.type === "chunk" && parsed.content) {
                            accumulated += parsed.content
                            setStreamedContent(accumulated)
                        } else if (parsed.type === "done") {
                            let parsedIntent: Intent = 'discussion'
                            let ubpContent: unknown = null
                            let parsedProposedChanges: ProposedChanges | undefined = undefined

                            try {
                                let cleanJson = accumulated.trim()
                                if (cleanJson.startsWith('```')) {
                                    cleanJson = cleanJson.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
                                }

                                const fullParsed = JSON.parse(cleanJson)

                                if (fullParsed.intent === 'initial' || fullParsed.intent === 'discussion' || fullParsed.intent === 'proposal') {
                                    parsedIntent = fullParsed.intent
                                }

                                // Fix #2: Extract proposedChanges for proposal intents
                                if (fullParsed.proposedChanges && typeof fullParsed.proposedChanges === 'object') {
                                    const pc = fullParsed.proposedChanges as Record<string, unknown>
                                    parsedProposedChanges = {
                                        action: (pc.action as 'add' | 'update' | 'remove') || 'update',
                                        summary: (pc.summary as string) || 'Blueprint update',
                                        sections: (pc.sections as string[]) || [],
                                        changes: (pc.changes as Record<string, unknown>) || {}
                                    }
                                }

                                if (parsedIntent === 'initial') {
                                    const { intent: _i, message: _m, proposedChanges: _pc, metadata: _meta, ...rest } = fullParsed
                                    ubpContent = rest

                                    if (isUBPContent(ubpContent)) {
                                        setCurrentUBP(transformApiToUBP(ubpContent))
                                    }
                                }
                            } catch (parseErr) {
                                console.error("Failed to parse accumulated JSON:", parseErr)
                            }

                            const optimisticAssistantMsg: ChatMessage = {
                                role: "assistant",
                                content: accumulated,
                                timestamp: new Date().toISOString(),
                                intent: parsedIntent,
                                proposedChanges: parsedProposedChanges,
                            }

                            setProject(prev => prev ? {
                                ...prev,
                                chatHistory: [...prev.chatHistory, optimisticAssistantMsg]
                            } : prev)

                            setIsStreaming(false)
                            setStreamedContent("")

                            await saveCompleteResponse(accumulated, currentHistory, token)
                        } else if (parsed.type === "error") {
                            throw new Error(parsed.error)
                        }
                    } catch {
                        // Not complete JSON yet
                    }
                }
            }
        } catch (err) {
            console.error("Error streaming response:", err)
            const errorMessage = err instanceof Error ? err.message : "Failed to generate response. Please try again."
            setError(errorMessage)
        } finally {
            setIsGenerating(false)
            setIsStreaming(false)
        }
    }

    const generateResponseNonStreaming = async (
        usersMessage: string,
        currentHistory: ChatMessage[],
        token: string
    ) => {
        try {
            const res = await fetch("/api/generate", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message: usersMessage,
                    projectId,
                    context: currentHistory,
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                const errorMessage = data.error || "Failed to generate response"
                throw new Error(res.status === 429 ? `⏳ ${errorMessage}` : errorMessage)
            }

            const projectRes = await fetch(`/api/projects/${projectId}`, {
                headers: { Authorization: `Bearer ${token}` },
            })

            if (projectRes.ok) {
                const updatedProject = await projectRes.json()
                setProject(updatedProject)

                if (updatedProject.latestBlueprint?.content) {
                    setCurrentUBP(transformApiToUBP(updatedProject.latestBlueprint.content))
                    setSelectedBlueprint(updatedProject.latestBlueprint)
                }
            }

            if (data.intent === 'initial' && data.content && isUBPContent(data.content)) {
                setCurrentUBP(transformApiToUBP(data.content))
                generateLaunchPlanInBackground()
            }

            if (data.productName && projectRes.ok) {
                setProject((prev) => prev ? { ...prev, projectName: data.productName } : prev)
            }
        } catch (err) {
            throw err
        }
    }

    const saveCompleteResponse = async (
        rawContent: string,
        _currentHistory: ChatMessage[],
        token: string
    ) => {
        try {
            let parsedIntent: Intent = 'discussion'
            let parsedContent: unknown = null
            let proposedChanges: ProposedChanges | undefined
            let productName: string | undefined

            try {
                let cleanJson = rawContent.trim()
                if (cleanJson.startsWith('```')) {
                    cleanJson = cleanJson.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
                }

                const parsed = JSON.parse(cleanJson)
                if (parsed.intent === 'initial' || parsed.intent === 'discussion' || parsed.intent === 'proposal') {
                    parsedIntent = parsed.intent
                }
                if (parsed.intent === 'initial') {
                    const { intent: _i, message: _m, proposedChanges: _pc, metadata, ...ubpContent } = parsed
                    parsedContent = ubpContent

                    if (metadata && typeof metadata === 'object' && metadata.productName) {
                        productName = metadata.productName
                    }
                }
                if (parsed.proposedChanges) {
                    proposedChanges = parsed.proposedChanges
                }
            } catch {
                // Keep defaults
            }

            const assistantMsg: ChatMessage = {
                role: "assistant",
                content: rawContent,
                timestamp: new Date().toISOString(),
                intent: parsedIntent,
                proposedChanges,
            }

            const res = await fetch(`/api/projects/${projectId}`, {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    appendChat: [assistantMsg],
                }),
            })

            if (parsedIntent === 'initial' && parsedContent && isUBPContent(parsedContent)) {
                const bpRes = await fetch(`/api/blueprints?projectId=${projectId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                })

                if (bpRes.ok) {
                    const bpData = await bpRes.json()
                    const latestBp = bpData.blueprints?.[0]

                    const targetBlueprintId = latestBp?.id || projectId
                    if (!latestBp || latestBp.status === 'draft') {
                        await fetch("/api/blueprints", {
                            method: "PATCH",
                            headers: {
                                Authorization: `Bearer ${token}`,
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                blueprintId: targetBlueprintId,
                                content: parsedContent,
                            }),
                        })

                        setCurrentUBP(transformApiToUBP(parsedContent))
                        if (latestBp) {
                            setSelectedBlueprint({ ...latestBp, content: parsedContent })
                        }
                    }
                }

                if (productName) {
                    await fetch(`/api/projects/${projectId}`, {
                        method: "PATCH",
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ projectName: productName }),
                    })
                    setProject(prev => prev ? { ...prev, projectName: productName } : prev)
                }

                generateLaunchPlanInBackground()
            }

            if (res.ok) {
                const projectRes = await fetch(`/api/projects/${projectId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                })

                if (projectRes.ok) {
                    const updatedProject = await projectRes.json()
                    setProject(prev => {
                        if (!prev) return updatedProject
                        if (prev.chatHistory.length >= updatedProject.chatHistory.length) {
                            return prev
                        }
                        return updatedProject
                    })
                }
            }
        } catch (error) {
            console.error("Failed to save response:", error)
        }
    }

    const generateLaunchPlanInBackground = async () => {
        if (!user || !projectId) return

        setIsLaunchPlanGenerating(true)
        try {
            const token = await user.getIdToken()
            await fetch("/api/tasks/generate", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ projectId })
            })
        } catch (err) {
            console.error("Background launch plan generation failed:", err)
        } finally {
            setIsLaunchPlanGenerating(false)
        }
    }

    // =============================================================================
    // Event Handlers
    // =============================================================================

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!message.trim() || isGenerating || !user) return

        const userMessage = message.trim()
        setMessage("")
        setIsGenerating(true)
        setError(null)

        // Handle AI enhancement mode
        if (selectionContext) {
            await handleAIEdit(selectionContext.section, userMessage, selectionContext.text)
            setSelectionContext(null) // Clear after AI edit completes
            return
        }

        // Issue 6: Store last user message for retry functionality
        lastUserMessageRef.current = userMessage

        const optimisticUserMsg: ChatMessage = {
            role: "user",
            content: userMessage,
            timestamp: new Date().toISOString(),
        }

        // Issue 4: Use ref to get latest history, avoiding stale closure
        const currentHistory = chatHistoryRef.current
        setProject(prev => prev ? {
            ...prev,
            chatHistory: [...prev.chatHistory, optimisticUserMsg]
        } : prev)

        await generateResponse(currentHistory, userMessage)
    }

    const handleQuickAction = (actionMessage: string) => {
        setMessage(actionMessage)
    }

    /**
     * Issue 6: Retry the last failed generation
     */
    const handleRetry = async () => {
        if (!lastUserMessageRef.current || isGenerating || !user) return

        setError(null)
        // Use chatHistoryRef for latest history (Issue 4)
        const currentHistory = chatHistoryRef.current
        await generateResponse(currentHistory, lastUserMessageRef.current, true) // skipPersist since message already saved
    }

    const handleApplyProposedChanges = async (proposedChanges: ProposedChanges, messageIndex: number) => {
        if (!user || !project?.latestBlueprint?.id || !currentUBP) return

        setIsSaving(true)
        try {
            const updatedUBP = { ...currentUBP }

            if (proposedChanges.changes) {
                Object.entries(proposedChanges.changes).forEach(([key, value]) => {
                    if (key in updatedUBP) {
                        if (Array.isArray(value) && Array.isArray((updatedUBP as Record<string, unknown>)[key])) {
                            (updatedUBP as Record<string, unknown>)[key] = value
                        } else if (typeof value === 'object' && value !== null) {
                            (updatedUBP as Record<string, unknown>)[key] = {
                                ...((updatedUBP as Record<string, unknown>)[key] as object),
                                ...(value as object)
                            }
                        } else {
                            (updatedUBP as Record<string, unknown>)[key] = value
                        }
                    } else {
                        (updatedUBP as Record<string, unknown>)[key] = value
                    }
                })
            }

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

            setCurrentUBP(updatedUBP)

            setProject((prev) => {
                if (!prev) return prev
                const updatedHistory = [...prev.chatHistory]
                if (updatedHistory[messageIndex]) {
                    updatedHistory[messageIndex] = {
                        ...updatedHistory[messageIndex],
                        proposedChanges: undefined,
                        intent: 'initial' as Intent,
                    }
                }
                return { ...prev, chatHistory: updatedHistory }
            })

            setIsUBPViewerOpen(true)
        } catch (err) {
            console.error("Error applying proposed changes:", err)
            setError("Failed to update blueprint. Please try again.")
        } finally {
            setIsSaving(false)
        }
    }

    const handleAIEdit = async (section: string, instruction: string, selection: string) => {
        if (!user || !project) return

        setIsGenerating(true)

        const prompt = `I am editing the "${section}" section of the blueprint.
        
Current context(selected text): "${selection}"

Instruction: ${instruction}

Please update the "${section}" section of the blueprint accordingly.
Return the updated blueprint JSON with the changes applied to that section.`

        try {
            const token = await user.getIdToken()

            const userMessage: ChatMessage = {
                role: "user",
                content: `Edit ${section}: ${instruction} `,
                timestamp: new Date().toISOString(),
                proposedChanges: {
                    action: 'update',
                    summary: selection,
                    sections: [section],
                    changes: {}
                }
            }

            setProject(prev => prev ? {
                ...prev,
                chatHistory: [...prev.chatHistory, userMessage]
            } : prev)

            const res = await fetch("/api/generate", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message: prompt,
                    projectId: project.id,
                    context: project.chatHistory,
                }),
            })

            if (!res.ok) {
                throw new Error("AI generation failed")
            }

            const data = await res.json()

            const assistantMsg: ChatMessage = {
                role: "assistant",
                content: data.message,
                intent: (data.intent === 'proposal') ? 'initial' as Intent : data.intent,
                proposedChanges: data.proposedChanges,
                timestamp: new Date().toISOString()
            }

            setProject(prev => prev ? {
                ...prev,
                chatHistory: [...prev.chatHistory, assistantMsg]
            } : prev)

            if (data.intent === 'proposal' && data.proposedChanges) {
                if (!currentUBP) return
                const updatedUBP = { ...currentUBP }
                if (data.proposedChanges.changes) {
                    Object.entries(data.proposedChanges.changes).forEach(([key, value]) => {
                        if (key in updatedUBP) {
                            if (Array.isArray(value) && Array.isArray((updatedUBP as Record<string, unknown>)[key])) {
                                (updatedUBP as Record<string, unknown>)[key] = value
                            } else if (typeof value === 'object' && value !== null) {
                                (updatedUBP as Record<string, unknown>)[key] = {
                                    ...((updatedUBP as Record<string, unknown>)[key] as object),
                                    ...(value as object)
                                }
                            } else {
                                (updatedUBP as Record<string, unknown>)[key] = value
                            }
                        } else {
                            (updatedUBP as Record<string, unknown>)[key] = value
                        }
                    })
                }
                await updateBlueprint(updatedUBP)
            }

            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
            }, 100)

        } catch (err) {
            console.error("Error in AI edit:", err)
            setError("Failed to perform AI edit. Please try again.")
        } finally {
            setIsGenerating(false)
        }
    }

    const updateBlueprint = async (newContent: UBPContent) => {
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
                    content: newContent,
                }),
            })

            if (!res.ok) {
                throw new Error("Failed to update blueprint")
            }

            setCurrentUBP(newContent)
            setProject((prev) =>
                prev && prev.latestBlueprint
                    ? {
                        ...prev,
                        latestBlueprint: {
                            ...prev.latestBlueprint,
                            content: newContent
                        }
                    }
                    : prev
            )
        } catch (err) {
            console.error("Error updating blueprint:", err)
            setError("Failed to save changes. Please try again.")
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
            setProject((prev) =>
                prev
                    ? {
                        ...prev,
                        latestBlueprint: data.newDraft,
                    }
                    : prev
            )
            setSelectedBlueprint(data.newDraft)

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

        const selected = allVersions.find((v) => v.id === blueprintId)
        if (!selected) return

        if (blueprintId === project?.latestBlueprint?.id) {
            setSelectedBlueprint(project.latestBlueprint)
            if (project.latestBlueprint.content) {
                setCurrentUBP(transformApiToUBP(project.latestBlueprint.content))
            }
            return
        }

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

    const handleEnhanceWithFlowro = (section: string, text: string) => {
        setSelectionContext({ section, text })
        setIsUBPViewerOpen(false)
    }

    // =============================================================================
    // Render
    // =============================================================================

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

    if (projectError || !project) {
        return (
            <div className="min-h-screen bg-[#101922] flex flex-col items-center justify-center gap-4">
                <span className="material-symbols-outlined text-red-400 text-5xl">error</span>
                <p className="text-white text-lg">{projectError || "Project not found"}</p>
                <button
                    onClick={() => router.push("/app")}
                    className="flex items-center gap-2 bg-[#137fec] hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    Back to Command Center
                </button>
            </div>
        )
    }

    return (
        <div className="flex h-screen w-full flex-col bg-[#101922] text-white overflow-hidden">
            {/* Header */}
            <header className="relative flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 shrink-0 z-10">
                <div className="absolute inset-0 bg-[#101922]/80 backdrop-blur-xl border-b border-white/5" />

                <div className="relative flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                    <button
                        onClick={() => router.push("/app")}
                        className="group flex items-center justify-center rounded-xl p-2 text-[#9dabb9] transition-all hover:bg-white/5 hover:text-white"
                        title="Back to Command Center"
                    >
                        <span className="material-symbols-outlined text-xl sm:text-2xl transition-transform group-hover:-translate-x-0.5">arrow_back</span>
                    </button>

                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        <div className="hidden xs:flex size-9 sm:size-10 items-center justify-center rounded-xl bg-gradient-to-b from-[#137fec]/20 to-[#137fec]/5 border border-white/5 shadow-inner shadow-[#137fec]/10 shrink-0">
                            {isGenerating && (!project.projectName || project.projectName === "Untitled Project" || project.projectName === "Project") ? (
                                <span className="material-symbols-outlined text-[#137fec] text-lg animate-spin">progress_activity</span>
                            ) : (
                                <span className="material-symbols-outlined text-[#137fec] text-lg sm:text-xl">folder_open</span>
                            )}
                        </div>

                        <div className="flex flex-col min-w-0 justify-center">
                            <div className="flex items-center gap-2">
                                {isGenerating && (!project.projectName || project.projectName === "Untitled Project" || project.projectName === "Project") ? (
                                    <h1 className="text-sm sm:text-base font-medium text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 animate-pulse truncate">
                                        Flowro is cooking...
                                    </h1>
                                ) : (
                                    <h1 className="text-sm sm:text-base font-medium text-white/90 truncate max-w-[150px] sm:max-w-none tracking-tight">
                                        {project.projectName}
                                    </h1>
                                )}

                                {!isGenerating && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative flex items-center gap-1 sm:gap-2 shrink-0">
                    <button
                        onClick={() => setIsLaunchPlanOpen(true)}
                        className="group flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl text-[#9dabb9] hover:text-white hover:bg-white/5 transition-all text-xs sm:text-sm font-medium"
                        title={isLaunchPlanGenerating ? "Generating Launch Plan..." : "Launch Plan"}
                    >
                        <span className={`material-symbols-outlined text-[18px] sm:text-[20px] ${isLaunchPlanGenerating ? "text-[#10b981] animate-pulse" : "text-[#9dabb9] group-hover:text-[#10b981]"} transition-colors`}>
                            {isLaunchPlanGenerating ? "sync" : "rocket_launch"}
                        </span>
                        <span className="hidden md:inline">
                            {isLaunchPlanGenerating ? "Preparing..." : "Launch Plan"}
                        </span>
                    </button>

                    <button
                        onClick={() => setIsUBPViewerOpen(true)}
                        className="group flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl text-[#9dabb9] hover:text-white hover:bg-white/5 transition-all text-xs sm:text-sm font-medium"
                        title="Blueprint"
                    >
                        <span className="material-symbols-outlined text-[18px] sm:text-[20px] text-[#9dabb9] group-hover:text-[#137fec] transition-colors">description</span>
                        <span className="hidden md:inline">Blueprint</span>
                        {project.latestBlueprint && (
                            <span className="hidden lg:inline-flex items-center justify-center px-1.5 py-0.5 rounded-[4px] bg-[#137fec]/10 border border-[#137fec]/20 text-[#137fec] text-[10px] font-bold tracking-wide">
                                v{project.latestBlueprint.version}
                            </span>
                        )}
                    </button>

                    <div className="w-px h-6 bg-white/10 mx-1" />

                    <button
                        onClick={() => setIsShareModalOpen(true)}
                        className="flex items-center justify-center size-9 sm:size-10 rounded-lg sm:rounded-xl text-[#9dabb9] hover:text-white hover:bg-white/5 transition-all"
                        title="Share Project"
                    >
                        <span className="material-symbols-outlined text-lg sm:text-[20px]">ios_share</span>
                    </button>
                </div>
            </header>

            {/* Chat Panel */}
            <ChatPanel
                project={project}
                currentUBP={currentUBP}
                isGenerating={isGenerating}
                isStreaming={isStreaming}
                streamedContent={streamedContent}
                thinkingPhase={thinkingPhase}
                message={message}
                error={error}
                selectionContext={selectionContext}
                onMessageChange={setMessage}
                onSendMessage={handleSendMessage}
                onOpenBlueprint={() => setIsUBPViewerOpen(true)}
                onApplyProposedChanges={handleApplyProposedChanges}
                onClearContext={() => setSelectionContext(null)}
                onQuickAction={handleQuickAction}
                onRetry={handleRetry}
            />

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
                projectId={projectId}
                onUpdate={updateBlueprint}
                onEnhance={handleEnhanceWithFlowro}
            />

            <LaunchPlanViewer
                isOpen={isLaunchPlanOpen}
                onClose={() => setIsLaunchPlanOpen(false)}
                projectId={projectId}
                projectName={project?.projectName || "Project"}
            />

            <ShareProjectModal
                isOpen={isShareModalOpen}
                projectId={projectId}
                projectName={project.projectName}
                onClose={() => setIsShareModalOpen(false)}
                getToken={async () => {
                    if (!user) throw new Error("Not authenticated")
                    return user.getIdToken()
                }}
            />
        </div>
    )
}
