import { NextRequest, NextResponse } from "next/server"
import { verifyAuthToken, isAuthError, unauthorizedResponse } from "../../blueprints/auth"
import {
    getProject,
    getProjectWithDetails,
    updateProject,
    deleteProject,
    getBlueprintByProjectId,
} from "@/lib/firebase/collections"
import { timestampToISO } from "@/lib/firebase/schema"

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

/**
 * GET /api/projects/[projectId] - Get project with messages and blueprint
 * 
 * Returns full project details including:
 * - Project metadata
 * - All messages from subcollection
 * - Current blueprint state
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

        // Convert timestamps to ISO strings for client
        return NextResponse.json({
            project: {
                id: details.project.id,
                userId: details.project.userId,
                name: details.project.name,
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
            blueprint: details.blueprint
                ? {
                      id: details.blueprint.id,
                      projectId: details.blueprint.projectId,
                      content: details.blueprint.content,
                      updatedAt: timestampToISO(details.blueprint.updatedAt),
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
        const { name: rawName, lastMessage: rawLastMessage } = body

        // Verify ownership
        await verifyOwnership(projectId, authResult.userId)

        // Build updates object with validated fields
        const updates: { name?: string; lastMessage?: string } = {}

        // Validate name: must be non-empty string after trimming
        if (typeof rawName === "string") {
            const trimmed = rawName.trim()
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

        if (Object.keys(updates).length === 0) {
            return NextResponse.json(
                { error: "No valid update fields provided" },
                { status: 400 }
            )
        }

        await updateProject(projectId, updates)

        return NextResponse.json({ success: true, ...updates })
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
