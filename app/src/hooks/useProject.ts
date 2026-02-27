/**
 * useProject Hook
 * 
 * Centralized state management and API communication for a single project session.
 * Extracted from ChatView.tsx (1117 lines → this hook handles ~800 lines of logic).
 * 
 * Responsibilities:
 * - Project initialization (fetch metadata, messages, blueprint)
 * - Message sending with reliable persistence (no fire-and-forget)
 * - AI response generation (streaming + fallback)
 * - Blueprint CRUD (update, version save, version select)
 * - Proposed changes application
 * - AI edit operations
 */

"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { User } from "firebase/auth"
import type { UBPContent } from "@/components/UBPViewer"
import type {
    ProjectView,
    MessageView,
    BlueprintView,
    Intent,
    ProposedChanges,
} from "@/lib/types/views"
import { transformApiToUBP, isUBPContent } from "@/lib/transforms/ubp"
import { parseJSONSafe } from "@/lib/jsonRepair"

// =============================================================================
// Hook Return Type
// =============================================================================

export interface UseProjectReturn {
    // State
    project: ProjectView | null
    loadingProject: boolean
    currentUBP: UBPContent | null
    allVersions: BlueprintView[]
    selectedBlueprint: BlueprintView | null
    isGenerating: boolean
    isStreaming: boolean
    streamedContent: string
    thinkingPhase: number
    isSaving: boolean
    error: string | null
    message: string
    messagesEndRef: React.RefObject<HTMLDivElement | null>

    // Actions
    setMessage: (msg: string) => void
    setError: (err: string | null) => void
    handleSendMessage: (e: React.FormEvent, selectionContext: { section: string; text: string } | null) => Promise<{ handledAsEdit: boolean }>
    handleQuickAction: (actionMessage: string) => void
    handleRetry: () => Promise<void>
    handleApplyProposedChanges: (proposedChanges: ProposedChanges, messageIndex: number) => Promise<void>
    handleAIEdit: (section: string, instruction: string, selection: string) => Promise<void>
    updateBlueprint: (newContent: UBPContent) => Promise<void>
    handleSaveVersion: () => Promise<void>
    handleVersionSelect: (blueprintId: string) => Promise<void>
    setProject: React.Dispatch<React.SetStateAction<ProjectView | null>>
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useProject(
    projectId: string,
    user: User,
    initialMessage: string,
    isExisting: boolean = false,
): UseProjectReturn {
    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    // Project and blueprint state
    const [project, setProject] = useState<ProjectView | null>(null)
    const [loadingProject, setLoadingProject] = useState(true)
    const [currentUBP, setCurrentUBP] = useState<UBPContent | null>(null)
    const [allVersions, setAllVersions] = useState<BlueprintView[]>([])
    const [selectedBlueprint, setSelectedBlueprint] = useState<BlueprintView | null>(null)

    // Chat state
    const [message, setMessage] = useState("")
    const [isGenerating, setIsGenerating] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isStreaming, setIsStreaming] = useState(false)
    const [streamedContent, setStreamedContent] = useState("")
    const [thinkingPhase, setThinkingPhase] = useState(0)

    // Saving state
    const [isSaving, setIsSaving] = useState(false)

    // Refs
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const chatHistoryRef = useRef<MessageView[]>([])
    const lastUserMessageRef = useRef<string | null>(null)
    const hasInitialized = useRef(false)

    // -------------------------------------------------------------------------
    // Effects
    // -------------------------------------------------------------------------

    // Cycle through thinking messages
    useEffect(() => {
        if (!isGenerating) {
            setThinkingPhase(0)
            return
        }

        const timer1 = setTimeout(() => setThinkingPhase(1), 2500)
        const timer2 = setTimeout(() => setThinkingPhase(2), 5000)
        const timer3 = setTimeout(() => setThinkingPhase(3), 24500)
        const timer4 = setTimeout(() => setThinkingPhase(4), 26500)

        return () => {
            clearTimeout(timer1)
            clearTimeout(timer2)
            clearTimeout(timer3)
            clearTimeout(timer4)
        }
    }, [isGenerating])

    // Keep chatHistoryRef in sync
    useEffect(() => {
        if (project?.chatHistory) {
            chatHistoryRef.current = project.chatHistory
        }
    }, [project?.chatHistory])

    // Initialize project and auto-generate
    useEffect(() => {
        if (hasInitialized.current) return
        hasInitialized.current = true

        async function initializeProject() {
            try {
                const token = await user.getIdToken()

                // Fetch project metadata + blueprint
                const res = await fetch(`/api/projects/${projectId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                })

                if (!res.ok) {
                    throw new Error("Project not found")
                }

                const data = await res.json()

                // For existing projects, use the saved chat history
                // For new projects, add initial user message if chat history is empty
                let initialChatHistory: MessageView[]
                if (isExisting) {
                    initialChatHistory = data.chatHistory || []
                } else {
                    initialChatHistory = data.chatHistory?.length > 0
                        ? data.chatHistory
                        : [{
                            role: "user" as const,
                            content: initialMessage,
                            timestamp: new Date().toISOString(),
                        }]
                }

                const projectData: ProjectView = {
                    ...data,
                    chatHistory: initialChatHistory,
                }

                setProject(projectData)

                if (data.latestBlueprint?.content) {
                    setCurrentUBP(transformApiToUBP(data.latestBlueprint.content))
                    setSelectedBlueprint(data.latestBlueprint)
                }

                // Fetch versions
                const versionsRes = await fetch(`/api/blueprints?projectId=${projectId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                })
                if (versionsRes.ok) {
                    const versionsData = await versionsRes.json()
                    setAllVersions(versionsData.blueprints || [])
                }

                setLoadingProject(false)

                // Auto-generate response for the initial message (only for new projects)
                if (!isExisting && initialChatHistory.length === 1 && initialChatHistory[0].role === 'user') {
                    setTimeout(() => {
                        generateResponse([], initialMessage, false)
                    }, 100)
                }

            } catch (err) {
                console.error("Error initializing project:", err)
                setError("Failed to load project")
                setLoadingProject(false)
            }
        }

        initializeProject()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId, initialMessage, user])

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [project?.chatHistory])

    // -------------------------------------------------------------------------
    // Core API: Save user message (BLOCKING — no fire-and-forget)
    // -------------------------------------------------------------------------

    const saveUserMessage = useCallback(async (
        token: string,
        userMessage: string
    ): Promise<boolean> => {
        try {
            const res = await fetch(`/api/projects/${projectId}`, {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    appendChat: [{
                        role: "user",
                        content: userMessage,
                        timestamp: new Date().toISOString(),
                        intent: null,
                    }],
                }),
            })

            if (!res.ok) {
                console.error("Failed to save user message, status:", res.status)
                return false
            }
            return true
        } catch (err) {
            console.error("Failed to save user message:", err)
            return false
        }
    }, [projectId])

    // -------------------------------------------------------------------------
    // Core API: Generate Response (Streaming)
    // -------------------------------------------------------------------------

    const generateResponse = useCallback(async (
        currentHistory: MessageView[],
        usersMessage: string,
        skipPersist: boolean = false
    ) => {
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

            // Save user message BLOCKING — wait for confirmation
            if (!skipPersist) {
                const saved = await saveUserMessage(token, usersMessage)
                if (!saved) {
                    // Revert optimistic update
                    setProject(prev => {
                        if (!prev) return prev
                        return {
                            ...prev,
                            chatHistory: prev.chatHistory.slice(0, -1)
                        }
                    })
                    setError("Failed to save your message. Please try again.")
                    setIsGenerating(false)
                    setIsStreaming(false)
                    return
                }
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

                    let parsed: Record<string, unknown>
                    try {
                        parsed = JSON.parse(data)
                    } catch {
                        // Not complete JSON yet
                        continue
                    }

                    if (parsed.type === "error") {
                        throw new Error(parsed.error as string)
                    }

                    if (parsed.type === "chunk" && parsed.content) {
                        accumulated += parsed.content as string
                        setStreamedContent(accumulated)
                    } else if (parsed.type === "done") {
                        let parsedIntent: Intent = 'discussion'
                        let ubpContent: unknown = null
                        let parsedProposedChanges: ProposedChanges | undefined = undefined

                        const parseResult = parseJSONSafe(accumulated)

                        if (parseResult.success) {
                            const fullParsed = parseResult.data as Record<string, unknown>

                            if (fullParsed.intent === 'initial' || fullParsed.intent === 'discussion' || fullParsed.intent === 'proposal') {
                                parsedIntent = fullParsed.intent as Intent
                            }

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
                        } else {
                            console.error("Failed to parse accumulated JSON:", parseResult.error, "at position:", parseResult.position)
                            if (parseResult.position) {
                                console.error("JSON near error:", accumulated.substring(Math.max(0, parseResult.position - 50), parseResult.position + 50))
                            }
                        }

                        const optimisticAssistantMsg: MessageView = {
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

                        await saveCompleteResponse(accumulated, token)
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
    }, [projectId, user, saveUserMessage])

    // -------------------------------------------------------------------------
    // Core API: Generate Response (Non-Streaming Fallback)
    // -------------------------------------------------------------------------

    const generateResponseNonStreaming = async (
        usersMessage: string,
        currentHistory: MessageView[],
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
                    chatHistory: currentHistory.slice(-5),
                    projectId,
                }),
            })

            setIsStreaming(false)
            setStreamedContent("")

            if (!res.ok) {
                throw new Error("Generation failed")
            }

            const data = await res.json()

            if (data.intent === 'initial' || data.intent === 'proposal') {
                if (data.content && isUBPContent(data.content)) {
                    setCurrentUBP(transformApiToUBP(data.content))
                }
            }

            const assistantMsg: MessageView = {
                role: "assistant",
                content: data.rawContent || data.message,
                timestamp: new Date().toISOString(),
                intent: data.intent,
                proposedChanges: data.proposedChanges,
            }

            setProject(prev => prev ? {
                ...prev,
                chatHistory: [...prev.chatHistory, assistantMsg]
            } : prev)

            await saveCompleteResponse(data.rawContent || data.message, token)
        } catch (err) {
            console.error("Non-streaming generation error:", err)
            setError("Failed to generate response. Please try again.")
        }
    }

    // -------------------------------------------------------------------------
    // Core API: Save Complete Response
    // -------------------------------------------------------------------------

    const saveCompleteResponse = async (rawContent: string, token: string) => {
        try {
            let parsedIntent: Intent = 'discussion'
            let parsedContent: unknown = null
            let proposedChanges: ProposedChanges | undefined
            let productName: string | undefined

            const parseResult = parseJSONSafe(rawContent)
            if (parseResult.success) {
                const parsed = parseResult.data as Record<string, unknown>
                if (parsed.intent === 'initial' || parsed.intent === 'discussion' || parsed.intent === 'proposal') {
                    parsedIntent = parsed.intent as Intent
                }
                if (parsed.intent === 'initial') {
                    const { intent: _i, message: _m, proposedChanges: _pc, metadata, ...ubpContent } = parsed
                    parsedContent = ubpContent

                    if (metadata && typeof metadata === 'object' && (metadata as Record<string, unknown>).productName) {
                        productName = (metadata as Record<string, unknown>).productName as string
                    }
                }
                if (parsed.proposedChanges) {
                    proposedChanges = parsed.proposedChanges as ProposedChanges
                }
            } else {
                console.error("saveCompleteResponse: Failed to parse JSON:", parseResult.error)
            }

            const assistantMsg: MessageView = {
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

                    if (latestBp) {
                        // Blueprint exists → PATCH to update (only if draft)
                        if (latestBp.status === 'draft') {
                            const patchRes = await fetch("/api/blueprints", {
                                method: "PATCH",
                                headers: {
                                    Authorization: `Bearer ${token}`,
                                    "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                    blueprintId: latestBp.id,
                                    content: parsedContent,
                                }),
                            })
                            if (!patchRes.ok) {
                                console.error("Failed to update blueprint:", patchRes.status)
                                return
                            }
                        }
                        setCurrentUBP(transformApiToUBP(parsedContent))
                        setSelectedBlueprint({ ...latestBp, content: parsedContent })
                    } else {
                        // No blueprint yet → POST to create
                        const postRes = await fetch("/api/blueprints", {
                            method: "POST",
                            headers: {
                                Authorization: `Bearer ${token}`,
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                projectId,
                                content: parsedContent,
                            }),
                        })
                        if (postRes.ok) {
                            setCurrentUBP(transformApiToUBP(parsedContent))
                            setProject(prev => prev ? {
                                ...prev,
                                latestBlueprint: {
                                    id: projectId,
                                    projectId,
                                    version: "1.0",
                                    status: "draft" as const,
                                    content: parsedContent,
                                    createdAt: new Date().toISOString(),
                                },
                            } : prev)
                        } else {
                            console.error("Failed to create blueprint:", postRes.status)
                        }
                    }
                }

                if (productName) {
                    const nameRes = await fetch(`/api/projects/${projectId}`, {
                        method: "PATCH",
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ projectName: productName }),
                    })
                    if (nameRes.ok) {
                        setProject(prev => prev ? { ...prev, projectName: productName } : prev)
                    } else {
                        console.error("Failed to update project name:", nameRes.status)
                    }
                }
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

    // -------------------------------------------------------------------------
    // Event Handlers
    // -------------------------------------------------------------------------

    const handleSendMessage = useCallback(async (
        e: React.FormEvent,
        selectionContext: { section: string; text: string } | null
    ): Promise<{ handledAsEdit: boolean }> => {
        e.preventDefault()
        if (!message.trim() || isGenerating) return { handledAsEdit: false }

        const userMessage = message.trim()
        setMessage("")
        setIsGenerating(true)
        setError(null)

        if (selectionContext) {
            await handleAIEdit(selectionContext.section, userMessage, selectionContext.text)
            return { handledAsEdit: true }
        }

        lastUserMessageRef.current = userMessage

        const optimisticUserMsg: MessageView = {
            role: "user",
            content: userMessage,
            timestamp: new Date().toISOString(),
        }

        const currentHistory = chatHistoryRef.current
        setProject(prev => prev ? {
            ...prev,
            chatHistory: [...prev.chatHistory, optimisticUserMsg]
        } : prev)

        await generateResponse(currentHistory, userMessage)
        return { handledAsEdit: false }
    }, [message, isGenerating, generateResponse])

    const handleQuickAction = useCallback((actionMessage: string) => {
        setMessage(actionMessage)
    }, [])

    const handleRetry = useCallback(async () => {
        if (!lastUserMessageRef.current || isGenerating) return

        setError(null)
        const currentHistory = chatHistoryRef.current
        await generateResponse(currentHistory, lastUserMessageRef.current, true)
    }, [isGenerating, generateResponse])

    const handleApplyProposedChanges = useCallback(async (proposedChanges: ProposedChanges, messageIndex: number) => {
        if (!project?.latestBlueprint?.id || !currentUBP) return

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

            return // The caller (ChatView) will open the UBP viewer
        } catch (err) {
            console.error("Error applying proposed changes:", err)
            setError("Failed to update blueprint. Please try again.")
        } finally {
            setIsSaving(false)
        }
    }, [project, currentUBP, user])

    // -------------------------------------------------------------------------
    // AI Edit
    // -------------------------------------------------------------------------

    const handleAIEdit = useCallback(async (section: string, instruction: string, selection: string) => {
        if (!currentUBP) {
            setIsGenerating(false)
            return
        }

        try {
            const token = await user.getIdToken()
            const res = await fetch("/api/generate", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message: `Edit the ${section} section of the blueprint. User's instruction: "${instruction}". The selected text to modify: "${selection}". Return ONLY the proposed changes as JSON with proposedChanges format.`,
                    chatHistory: chatHistoryRef.current.slice(-3),
                    projectId,
                    isEdit: true,
                }),
            })

            if (!res.ok) {
                throw new Error("AI edit failed")
            }

            const data = await res.json()

            const assistantMsg: MessageView = {
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
    }, [currentUBP, projectId, user])

    // -------------------------------------------------------------------------
    // Blueprint Management
    // -------------------------------------------------------------------------

    const updateBlueprint = useCallback(async (newContent: UBPContent) => {
        if (!project?.latestBlueprint?.id) return

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
    }, [project, user])

    const handleSaveVersion = useCallback(async () => {
        if (!project?.latestBlueprint?.id) return

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
    }, [project, projectId, user])

    const handleVersionSelect = useCallback(async (blueprintId: string) => {
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
    }, [allVersions, project])

    // -------------------------------------------------------------------------
    // Return
    // -------------------------------------------------------------------------

    return {
        // State
        project,
        loadingProject,
        currentUBP,
        allVersions,
        selectedBlueprint,
        isGenerating,
        isStreaming,
        streamedContent,
        thinkingPhase,
        isSaving,
        error,
        message,
        messagesEndRef,

        // Actions
        setMessage,
        setError,
        handleSendMessage,
        handleQuickAction,
        handleRetry,
        handleApplyProposedChanges,
        handleAIEdit,
        updateBlueprint,
        handleSaveVersion,
        handleVersionSelect,
        setProject,
    }
}
