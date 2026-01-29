import { NextRequest, NextResponse } from "next/server"
import { verifyAuthToken, isAuthError, unauthorizedResponse } from "../../blueprints/auth"
import { getProjectById, verifyProjectOwnership, getLatestBlueprint, updateProjectName, deleteProject, updateProjectChatHistory, ChatMessage } from "../../blueprints/service"

// GET /api/projects/[projectId] - Get a single project with its latest blueprint
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
        await verifyProjectOwnership(projectId, authResult.userId)

        const project = await getProjectById(projectId)

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 })
        }

        // Get the latest blueprint for this project
        const latestBlueprint = await getLatestBlueprint(projectId)

        return NextResponse.json({
            ...project,
            latestBlueprint,
        })
    } catch (error) {
        console.error("Get project error:", error)
        const message = error instanceof Error ? error.message : "Failed to get project"
        const status = message.includes("Access denied") ? 403 : message.includes("not found") ? 404 : 500
        return NextResponse.json({ error: message }, { status })
    }
}

// PATCH /api/projects/[projectId] - Update project details (rename, append chat)
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
        const { projectName, appendChat } = body

        // Verify ownership
        await verifyProjectOwnership(projectId, authResult.userId)

        // Handle appendChat - append messages to chat history
        if (appendChat && Array.isArray(appendChat)) {
            // Filter out undefined values - Firestore rejects them
            const messages: ChatMessage[] = appendChat.map((msg: ChatMessage) => {
                const cleanMsg: ChatMessage = {
                    role: msg.role,
                    content: msg.content,
                    timestamp: msg.timestamp || new Date().toISOString(),
                }
                // Only add optional fields if they have values
                if (msg.intent !== undefined && msg.intent !== null) {
                    cleanMsg.intent = msg.intent
                }
                if (msg.proposedChanges !== undefined && msg.proposedChanges !== null) {
                    cleanMsg.proposedChanges = msg.proposedChanges
                }
                return cleanMsg
            })
            await updateProjectChatHistory(projectId, messages)
            return NextResponse.json({ success: true, appended: messages.length })
        }

        // Handle projectName update
        if (projectName && projectName.trim()) {
            await updateProjectName(projectId, projectName.trim())
            return NextResponse.json({ success: true, projectName: projectName.trim() })
        }

        return NextResponse.json({ error: "No valid update fields provided" }, { status: 400 })
    } catch (error) {
        console.error("Update project error:", error)
        const message = error instanceof Error ? error.message : "Failed to update project"
        const status = message.includes("Access denied") ? 403 : message.includes("not found") ? 404 : 500
        return NextResponse.json({ error: message }, { status })
    }
}

// DELETE /api/projects/[projectId] - Delete a project and all related data
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
        await verifyProjectOwnership(projectId, authResult.userId)

        // Delete project and all related data (blueprints, tasks, share tokens)
        await deleteProject(projectId)

        return NextResponse.json({
            success: true,
            message: "Project deleted successfully",
        })
    } catch (error) {
        console.error("Delete project error:", error)
        const message = error instanceof Error ? error.message : "Failed to delete project"
        const status = message.includes("Access denied") ? 403 : message.includes("not found") ? 404 : 500
        return NextResponse.json({ error: message }, { status })
    }
}
