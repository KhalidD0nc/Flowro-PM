import { NextRequest, NextResponse } from "next/server"
import { verifyAuthToken, isAuthError, unauthorizedResponse } from "../../blueprints/auth"
import {
    getProject,
    getProjectWithDetails,
    updateProject,
    deleteProject,
    addMessage,
} from "@/lib/firebase/collections"
import { Timestamp } from "firebase-admin/firestore"
import { timestampToISO, type MessageIntent, type MessageRole, type ProposedChanges } from "@/lib/firebase/schema"
import { parseProposedPrdChanges } from "@/lib/prd/schema"


/**
 * Verify that the authenticated user owns the project
 */
async function verifyOwnership(projectId: string, userId: string): Promise<void> {
    const project = await getProject(projectId)
    if (!project) {
        throw new Error("Project not found")
    }
    if (project.userId !== userId) {
        throw new Error("Access denied: you do not own this project")
    }
}

type ChatMessagePayload = {
    role?: MessageRole
    content?: string
    intent?: MessageIntent | null
    proposedChanges?: unknown
    timestamp?: string
}

function cleanJsonString(raw: string): string {
    let clean = raw.trim()
    if (clean.startsWith("```")) {
        clean = clean.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "")
    }
    return clean
}

function extractProposedChanges(content: string, fallback?: unknown): ProposedChanges | undefined {
    const parsedFallback = parseProposedPrdChanges(fallback)
    if (parsedFallback) {
        return parsedFallback
    }

    try {
        const parsed = JSON.parse(cleanJsonString(content))
        if (parsed && typeof parsed === "object" && "proposedChanges" in parsed) {
            return parseProposedPrdChanges((parsed as Record<string, unknown>).proposedChanges)
        }
    } catch {
        // Ignore parse errors
    }

    return undefined
}

/**
 * GET /api/projects/[projectId] - Get project with messages and PRD
 * 
 * Returns full project details including:
 * - Project metadata
 * - All messages from subcollection
 * - Current PRD state
 * 
 * @returns ProjectWithDetails
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const authResult = await verifyAuthToken(request)

        if (isAuthError(authResult)) {
            return unauthorizedResponse(authResult)
        }

        const { projectId } = await params

        // Verify user owns this project
        await verifyOwnership(projectId, authResult.userId)

        const details = await getProjectWithDetails(projectId)

        if (!details) {
            return NextResponse.json(
                { error: "Project not found" },
                { status: 404 }
            )
        }

        const chatHistory = details.messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
            intent: msg.intent,
            proposedChanges: extractProposedChanges(msg.content, msg.proposedChanges),
            timestamp: timestampToISO(msg.timestamp),
        }))

        const latestPrd = details.prd
            ? {
                id: details.prd.id,
                projectId: details.prd.projectId,
                config: details.prd.config,
                updatedAt: timestampToISO(details.prd.updatedAt),
            }
            : undefined

        // Return legacy-compatible shape (top-level project fields)
        return NextResponse.json({
            id: details.project.id,
            name: details.project.name,
            projectName: details.project.name,
            description: (details.project as { description?: string }).description,
            chatHistory,
            createdAt: timestampToISO(details.project.createdAt),
            updatedAt: timestampToISO(details.project.updatedAt),
            latestPrd,
            // Keep detailed payload for newer clients/debugging
            project: {
                id: details.project.id,
                userId: details.project.userId,
                name: details.project.name,
                projectName: details.project.name,
                lastMessage: details.project.lastMessage,
                createdAt: timestampToISO(details.project.createdAt),
                updatedAt: timestampToISO(details.project.updatedAt),
            },
            messages: details.messages.map((msg) => ({
                id: msg.id,
                role: msg.role,
                content: msg.content,
                intent: msg.intent,
                proposedChanges: msg.proposedChanges,
                timestamp: timestampToISO(msg.timestamp),
            })),
            prd: details.prd
                ? {
                    id: details.prd.id,
                    projectId: details.prd.projectId,
                    config: details.prd.config,
                    updatedAt: timestampToISO(details.prd.updatedAt),
                }
                : null,
        })
    } catch (error) {
        console.error("Get project error:", error)
        const message = error instanceof Error ? error.message : "Failed to get project"
        const status = message.includes("Access denied")
            ? 403
            : message.includes("not found")
                ? 404
                : 500
        return NextResponse.json({ error: message }, { status })
    }
}

/**
 * PATCH /api/projects/[projectId] - Update project details
 * 
 * Supports updating:
 * - name: Rename the project
 * - lastMessage: Update the preview message
 * 
 * @body { name?: string, lastMessage?: string }
 * @returns { success: true }
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const authResult = await verifyAuthToken(request)

        if (isAuthError(authResult)) {
            return unauthorizedResponse(authResult)
        }

        const { projectId } = await params
        const body = await request.json()
        const { name: rawName, projectName: rawProjectName, lastMessage: rawLastMessage, appendChat } = body

        // Verify ownership
        await verifyOwnership(projectId, authResult.userId)

        // Build updates object with validated fields
        const updates: { name?: string; lastMessage?: string } = {}

        // Validate name: must be non-empty string after trimming
        const candidateName = typeof rawProjectName === "string" ? rawProjectName : rawName
        if (typeof candidateName === "string") {
            const trimmed = candidateName.trim()
            if (trimmed.length > 0) {
                updates.name = trimmed
            }
        }

        // Validate lastMessage: must be string if provided
        if (rawLastMessage !== undefined) {
            if (typeof rawLastMessage === "string") {
                updates.lastMessage = rawLastMessage.slice(0, 100)
            }
            // If rawLastMessage is provided but not a string, ignore it (don't update)
        }

        const messagesToAppend: ChatMessagePayload[] = Array.isArray(appendChat) ? appendChat : []
        const validMessages = messagesToAppend.filter((msg) =>
            msg &&
            (msg.role === "user" || msg.role === "assistant") &&
            typeof msg.content === "string" &&
            msg.content.trim().length > 0
        )

        if (Object.keys(updates).length === 0 && validMessages.length === 0) {
            return NextResponse.json(
                { error: "No valid update fields provided" },
                { status: 400 }
            )
        }

        if (validMessages.length > 0) {
            for (const msg of validMessages) {
                const intent: MessageIntent =
                    msg.intent === "initial" || msg.intent === "clarification" || msg.intent === "discussion" || msg.intent === "proposal"
                        ? msg.intent
                        : "discussion"

                // Extract and validate proposedChanges if present
                const proposedChanges = extractProposedChanges(msg.content as string, msg.proposedChanges)

                await addMessage(projectId, {
                    role: msg.role as MessageRole,
                    content: msg.content as string,
                    intent,
                    proposedChanges,
                    timestamp: Timestamp.now(),
                })
            }
        }

        if (Object.keys(updates).length > 0) {
            await updateProject(projectId, updates)
        }

        return NextResponse.json({
            success: true,
            ...updates,
            appended: validMessages.length,
        })
    } catch (error) {
        console.error("Update project error:", error)
        const message = error instanceof Error ? error.message : "Failed to update project"
        const status = message.includes("Access denied")
            ? 403
            : message.includes("not found")
                ? 404
                : 500
        return NextResponse.json({ error: message }, { status })
    }
}

/**
 * DELETE /api/projects/[projectId] - Delete project and all related data
 * 
 * Deletes:
 * - Project document
 * - All messages in subcollection
 * - Blueprint and its history subcollection
 * 
 * Uses chunked batch deletion for unlimited subcollection documents.
 * 
 * @returns { success: true, message: string }
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const authResult = await verifyAuthToken(request)

        if (isAuthError(authResult)) {
            return unauthorizedResponse(authResult)
        }

        const { projectId } = await params

        // Verify ownership before deletion
        await verifyOwnership(projectId, authResult.userId)

        // Delete project and all related data
        await deleteProject(projectId)

        return NextResponse.json({
            success: true,
            message: "Project deleted successfully",
        })
    } catch (error) {
        console.error("Delete project error:", error)
        const message = error instanceof Error ? error.message : "Failed to delete project"
        const status = message.includes("Access denied")
            ? 403
            : message.includes("not found")
                ? 404
                : 500
        return NextResponse.json({ error: message }, { status })
    }
}
