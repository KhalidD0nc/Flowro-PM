"use client"

import { useAuth } from "@/components/Providers"
import { useRouter, useParams } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import UBPViewer, { UBPContent } from "@/components/UBPViewer"
import ShareProjectModal from "@/components/ShareProjectModal"
import LaunchPlanViewer from "@/components/LaunchPlanViewer"

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

interface GenerateResult {
    intent: Intent
    message: string
    content: unknown
    proposedChanges?: ProposedChanges
    rawContent: string
    productName?: string
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
    const [isLaunchPlanOpen, setIsLaunchPlanOpen] = useState(false)
    const [isShareModalOpen, setIsShareModalOpen] = useState(false)
    const [currentUBP, setCurrentUBP] = useState<UBPContent | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [allVersions, setAllVersions] = useState<Blueprint[]>([])
    const [selectedBlueprint, setSelectedBlueprint] = useState<Blueprint | null>(null)
    const [selectionContext, setSelectionContext] = useState<{ section: string; text: string } | null>(null)
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

    // Helper to generate response from AI
    const generateResponse = async (currentHistory: ChatMessage[], usersMessage: string) => {
        if (!user) return

        setIsGenerating(true)
        setError(null)

        try {
            const token = await user.getIdToken()
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
                // Handle structured error responses
                const errorMessage = data.error || "Failed to generate response"

                if (res.status === 429) {
                    // Rate limited - show retry time
                    throw new Error(`⏳ ${errorMessage} `)
                } else if (data.retryable) {
                    throw new Error(`${errorMessage} Please try again.`)
                } else {
                    throw new Error(errorMessage)
                }
            }

            // Build user message (matches what backend saved)
            const userMessage: ChatMessage = {
                role: "user",
                content: usersMessage,
                timestamp: new Date().toISOString(),
            }

            // Build assistant message with intent data
            const assistantMessage: ChatMessage = {
                role: "assistant",
                content: data.message || JSON.stringify(data.content || {}),
                timestamp: new Date().toISOString(),
                intent: data.intent as Intent,
                proposedChanges: data.proposedChanges as ProposedChanges | undefined,
            }

            // Check if user message is already in history (happens with dangling user message from project creation)
            // If so, only add the assistant message
            setProject((prev) => {
                if (!prev) return prev

                const lastMsg = prev.chatHistory[prev.chatHistory.length - 1]
                const userMessageAlreadyExists = lastMsg &&
                    lastMsg.role === "user" &&
                    lastMsg.content === usersMessage

                return {
                    ...prev,
                    chatHistory: userMessageAlreadyExists
                        ? [...prev.chatHistory, assistantMessage]
                        : [...prev.chatHistory, userMessage, assistantMessage],
                }
            })

            // Only update current UBP on initial intent (new project)
            if (data.intent === 'initial' && data.content && typeof data.content === "object" && isUBPContent(data.content)) {
                setCurrentUBP(transformApiToUBP(data.content))
            }

            // Update project name if AI suggested one
            if (data.productName) {
                setProject((prev) => prev ? { ...prev, projectName: data.productName } : prev)
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

    const [isEditingName, setIsEditingName] = useState(false)
    const [tempName, setTempName] = useState("")

    useEffect(() => {
        if (project) {
            setTempName(project.projectName)
        }
    }, [project])

    const handleSaveName = async () => {
        if (!project || !tempName.trim() || tempName === project.projectName) {
            setIsEditingName(false)
            return
        }

        try {
            const token = await user?.getIdToken()
            const res = await fetch(`/api/projects/${projectId}`, {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ projectName: tempName }),
            })

            if (res.ok) {
                setProject({ ...project, projectName: tempName })
            }
        } catch (err) {
            console.error("Failed to update name", err)
            // Revert
            setTempName(project.projectName)
        } finally {
            setIsEditingName(false)
        }
    }

    // Handle enter key in input
    const handleNameKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSaveName()
        } else if (e.key === "Escape") {
            setTempName(project?.projectName || "")
            setIsEditingName(false)
        }
    }

    // Effect: Check for dangling user message on project load (e.g. initial prompt from creation)
    useEffect(() => {
        if (!loadingProject && project && project.chatHistory.length > 0) {
            const lastMsg = project.chatHistory[project.chatHistory.length - 1]
            if (lastMsg.role === 'user' && !isGenerating) {
                generateResponse(project.chatHistory.slice(0, -1), lastMsg.content)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadingProject, project?.id]) // Run when project loads

    // Handle sending a message from form submission
    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!message.trim() || isGenerating || !user) return

        const userMessage = message.trim()
        setMessage("")
        // Set generating TRUE immediately to block effect (and UI)
        setIsGenerating(true)
        setError(null)

        // Call generation - messages will be added after successful API call
        // This prevents duplicate messages between optimistic UI and backend persistence
        await generateResponse(project?.chatHistory || [], userMessage)
    }

    const handleBackToDashboard = () => {
        router.push("/dashboard")
    }

    const handleOpenUBP = () => {
        setIsUBPViewerOpen(true)
    }

    const handleOpenLaunchPlan = () => {
        setIsLaunchPlanOpen(true)
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

    // Generic update function to save UBP to backend
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

            // Update local state
            setCurrentUBP(newContent)

            // Update project's latest blueprint content in cache
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

    // Handle manual updates from UBPViewer
    const handleUBPUpdate = async (newUBP: UBPContent) => {
        await updateBlueprint(newUBP)
    }

    const handleEnhanceWithFlowro = (section: string, text: string) => {
        setSelectionContext({ section, text })
        setIsUBPViewerOpen(false)
    }

    const handleAIEdit = async (section: string, instruction: string, selection: string) => {
        if (!user || !project) return

        setIsGenerating(true)
        setSelectionContext(null) // Clear context when starting

        // Construct a focused prompt for the AI
        const prompt = `I am editing the "${section}" section of the blueprint.
        
Current context(selected text): "${selection}"

Instruction: ${instruction}

Please update the "${section}" section of the blueprint accordingly.
Return the updated blueprint JSON with the changes applied to that section.`

        try {
            const token = await user.getIdToken()

            // Add user message to UI
            const assistantMsgContent = `Edit ${section}: ${instruction} `
            const userMessage: ChatMessage = {
                role: "user",
                content: assistantMsgContent,
                timestamp: new Date().toISOString(),
                // Keep context metadata for the bubble display
                proposedChanges: {
                    action: 'update',
                    summary: selection, // We use summary to store the selected text for display
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

            const data: GenerateResult = await res.json()

            // Update chat history with assistant response
            const assistantMsg = {
                role: "assistant" as const,
                content: data.message,
                // If it's a proposal and we auto-applied it, change intent to initial so the button disappears
                intent: (data.intent === 'proposal') ? 'initial' as Intent : data.intent,
                proposedChanges: data.proposedChanges,
                timestamp: new Date().toISOString()
            }

            setProject(prev => prev ? {
                ...prev,
                chatHistory: [...prev.chatHistory, assistantMsg]
            } : prev)

            // Auto-apply logic
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
            <header className="relative flex items-center justify-between px-6 py-4 shrink-0">
                {/* Glassmorphism background */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#0d141c]/95 via-[#101922]/95 to-[#0d141c]/95 backdrop-blur-xl" />
                {/* Bottom gradient border */}
                <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#137fec]/30 to-transparent" />

                <div className="relative flex items-center gap-4">
                    <button
                        onClick={handleBackToDashboard}
                        className="flex items-center justify-center rounded-xl p-2.5 text-[#9dabb9] transition-all hover:bg-white/5 hover:text-white hover:scale-105"
                        title="Back to Dashboard"
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <div className="flex items-center gap-3">
                        {/* Project avatar */}
                        <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#137fec]/20 to-[#137fec]/5 border border-[#137fec]/20">
                            <span className="material-symbols-outlined text-[#137fec] text-lg">folder</span>
                        </div>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <h1 className="text-lg font-semibold text-white">{project.projectName}</h1>
                                {/* Online status indicator */}
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                                    <span className="text-xs text-emerald-400 font-medium">Ready</span>
                                </div>
                            </div>
                            {project.description && (
                                <p className="text-sm text-[#9dabb9] truncate max-w-md">{project.description}</p>
                            )}
                        </div>
                    </div>
                </div>
                <div className="relative flex items-center gap-3">
                    {/* Launch Plan button */}
                    <button
                        onClick={handleOpenLaunchPlan}
                        className="group flex items-center gap-2.5 bg-gradient-to-r from-[#10b981]/10 to-[#10b981]/5 hover:from-[#10b981]/20 hover:to-[#10b981]/10 border border-[#10b981]/20 hover:border-[#10b981]/40 text-white font-medium py-2.5 px-4 rounded-xl transition-all hover:shadow-lg hover:shadow-[#10b981]/10"
                    >
                        <span className="material-symbols-outlined text-[18px] text-[#10b981] group-hover:scale-110 transition-transform">rocket_launch</span>
                        <span className="hidden sm:inline">Launch Plan</span>
                    </button>
                    {/* Blueprint button - Premium style */}
                    <button
                        onClick={handleOpenUBP}
                        className="group flex items-center gap-2.5 bg-gradient-to-r from-[#137fec]/10 to-[#137fec]/5 hover:from-[#137fec]/20 hover:to-[#137fec]/10 border border-[#137fec]/20 hover:border-[#137fec]/40 text-white font-medium py-2.5 px-4 rounded-xl transition-all hover:shadow-lg hover:shadow-[#137fec]/10"
                    >
                        <span className="material-symbols-outlined text-[18px] text-[#137fec] group-hover:scale-110 transition-transform">description</span>
                        <span className="hidden sm:inline">Blueprint</span>
                        {project.latestBlueprint && (
                            <span className="text-xs bg-[#137fec]/30 text-[#137fec] px-2 py-0.5 rounded-lg font-semibold">
                                v{project.latestBlueprint.version}
                            </span>
                        )}
                    </button>
                    {/* Share button */}
                    <button
                        onClick={() => setIsShareModalOpen(true)}
                        className="flex items-center justify-center rounded-xl p-2.5 text-[#9dabb9] transition-all hover:bg-white/5 hover:text-white hover:scale-105"
                        title="Share Project"
                    >
                        <span className="material-symbols-outlined">share</span>
                    </button>
                </div>
            </header>

            {/* Chat Messages */}
            <main className="flex-1 overflow-y-auto p-6">
                <div className="mx-auto max-w-4xl flex flex-col gap-4">
                    {project.chatHistory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            {/* Animated AI Avatar */}
                            <div className="relative mb-6">
                                <div className="flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#137fec]/20 to-[#137fec]/5 ai-avatar-glow animate-subtle-pulse">
                                    <img src="/logo.png" alt="Flowro" className="w-12 h-12" />
                                </div>
                                <div className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-emerald-500 border-2 border-[#101922]">
                                    <span className="material-symbols-outlined text-white text-xs">check</span>
                                </div>
                            </div>

                            {/* Gradient Welcome Text */}
                            <h2 className="text-3xl font-bold gradient-text mb-3">Hello, Product Manager</h2>
                            <p className="text-[#9dabb9] max-w-lg mb-8 text-lg">
                                I&apos;m Flowro, your AI partner. Ready to bring your product vision to life? Choose an action below or describe your idea.
                            </p>

                            {/* Quick Action Chips */}
                            <div className="flex flex-wrap justify-center gap-3 max-w-2xl">
                                <button
                                    onClick={() => setMessage("I want to create a PRD for a new product idea")}
                                    className="action-chip flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-medium"
                                >
                                    <span className="material-symbols-outlined text-[#137fec] text-lg">description</span>
                                    Draft a PRD
                                </button>
                                <button
                                    onClick={() => setMessage("Help me brainstorm features for my product")}
                                    className="action-chip flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-medium"
                                >
                                    <span className="material-symbols-outlined text-[#137fec] text-lg">lightbulb</span>
                                    Brainstorm Features
                                </button>
                                <button
                                    onClick={() => setMessage("I need help creating a product roadmap")}
                                    className="action-chip flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-medium"
                                >
                                    <span className="material-symbols-outlined text-[#137fec] text-lg">timeline</span>
                                    Roadmap Help
                                </button>
                                <button
                                    onClick={() => setMessage("Analyze competitors in my market")}
                                    className="action-chip flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-medium"
                                >
                                    <span className="material-symbols-outlined text-[#137fec] text-lg">analytics</span>
                                    Market Research
                                </button>
                            </div>
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
                                        className={`max-w-[75%] rounded-2xl px-4 py-3 ${isUser
                                            ? "bg-[#137fec] text-white"
                                            : "bg-[#18212b] border border-[#283039] text-white"
                                            }`}
                                    >
                                        {/* Context Block for User Context Messages */}
                                        {isUser && msg.proposedChanges && (
                                            <div className="mb-2 p-2.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl text-xs flex items-center gap-3">
                                                <div className="flex size-6 items-center justify-center rounded-lg bg-[#137fec]/20 border border-[#137fec]/30 shadow-sm">
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#137fec]">
                                                        <path d="M12 3V4M12 20V21M4 12H3M21 12H20M18.364 5.636L17.6569 6.34315M6.34315 17.6569L5.63604 18.364M18.364 18.364L17.6569 17.6569M6.34315 6.34315L5.63604 5.636M12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[#137fec]/80 font-bold uppercase tracking-[0.05em] text-[9px] leading-tight">AI Enhancement</span>
                                                    <span className="text-white/90 font-medium">Applied to {msg.proposedChanges.sections[0]}</span>
                                                </div>
                                            </div>
                                        )}
                                        <p className="whitespace-pre-wrap leading-relaxed">{displayInfo.text}</p>

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

                                    </div>
                                </div>
                            )
                        })
                    )}

                    {isGenerating && (
                        <div className="flex justify-start">
                            <div className="bg-[#18212b] border border-[#283039] rounded-2xl px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-[#137fec] animate-spin">hourglass_top</span>
                                    <span className="text-[#9dabb9] text-sm">
                                        {thinkingMessages[thinkingPhase]}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Hourglass flip animation */}
                    <style jsx>{`
@keyframes hourglass - flip {
    0 %, 100 % { transform: rotate(0deg); }
    50 % { transform: rotate(180deg); }
}
`}</style>

                    <div ref={messagesEndRef} />
                </div>
            </main>

            {/* Message Input - Premium Floating Card */}
            <footer className="relative px-4 pb-4 pt-2 shrink-0">
                {/* Top gradient fade */}
                <div className="absolute -top-8 left-0 right-0 h-8 bg-gradient-to-t from-[#101922] to-transparent pointer-events-none" />

                <form onSubmit={(e) => {
                    e.preventDefault();
                    if (selectionContext) {
                        handleAIEdit(selectionContext.section, message, selectionContext.text);
                        setMessage("");
                    } else {
                        handleSendMessage(e);
                    }
                }} className="mx-auto max-w-4xl">
                    {/* Context Block above input */}
                    {selectionContext && (
                        <div className="mb-3 mx-1 p-3 bg-gradient-to-r from-[#137fec]/10 to-transparent border border-[#137fec]/20 rounded-2xl animate-in slide-in-from-bottom-2 fade-in duration-300 backdrop-blur-xl">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex size-8 items-center justify-center rounded-xl bg-[#137fec]/20 border border-[#137fec]/30 shadow-lg">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#137fec]">
                                            <path d="M12 3V4M12 20V21M4 12H3M21 12H20M18.364 5.636L17.6569 6.34315M6.34315 17.6569L5.63604 18.364M18.364 18.364L17.6569 17.6569M6.34315 6.34315L5.63604 5.636M12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[#137fec] font-bold text-[10px] uppercase tracking-[0.15em] leading-none mb-1">Enhancement Mode</span>
                                        <span className="text-white font-medium text-sm">Target: {selectionContext.section}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectionContext(null)}
                                    className="flex size-8 items-center justify-center rounded-lg text-[#9dabb9] hover:text-white hover:bg-white/10 transition-all active:scale-90"
                                    title="Cancel"
                                >
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Floating card container */}
                    <div className="relative rounded-2xl bg-gradient-to-r from-[#18212b] via-[#1a252f] to-[#18212b] border border-[#283039]/50 shadow-2xl shadow-black/30 p-1.5">
                        {/* Inner glow border */}
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#137fec]/0 via-[#137fec]/5 to-[#137fec]/0 pointer-events-none" />

                        <div className="relative flex items-end gap-2">
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
                                    placeholder={selectionContext ? `Describe how to change this...` : (project.chatHistory.length > 0 ? "Ask me anything..." : "Describe your product idea or ask me anything...")}
                                    rows={1}
                                    className="w-full rounded-xl bg-transparent px-4 py-3 text-base text-white placeholder-[#9dabb9]/50 focus:outline-none resize-none min-h-[48px] max-h-[200px]"
                                    disabled={isGenerating}
                                />
                            </div>

                            {/* Action buttons */}
                            <div className="flex items-center gap-1.5 pb-1.5 pr-1">
                                {/* Attachment button */}
                                <button
                                    type="button"
                                    className="flex h-10 w-10 items-center justify-center rounded-xl text-[#9dabb9] hover:text-white hover:bg-white/5 transition-all"
                                    title="Attach file"
                                >
                                    <span className="material-symbols-outlined text-xl">attach_file</span>
                                </button>

                                {/* Send button */}
                                <button
                                    type="submit"
                                    disabled={!message.trim() || isGenerating}
                                    className="send-button-gradient flex h-10 w-10 items-center justify-center rounded-xl text-white disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none disabled:bg-[#283039]"
                                >
                                    <span className="material-symbols-outlined text-xl">send</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Helper text */}
                    <p className="text-center text-xs text-[#9dabb9]/50 mt-2">
                        Press Enter to send • Shift + Enter for new line
                    </p>
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
                projectId={projectId}
                onUpdate={handleUBPUpdate}
                onEnhance={handleEnhanceWithFlowro}
            />

            <LaunchPlanViewer
                isOpen={isLaunchPlanOpen}
                onClose={() => setIsLaunchPlanOpen(false)}
                projectId={projectId}
                projectName={project?.projectName || "Project"}
            />

            {/* Share Modal */}
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
