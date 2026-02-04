import { NextRequest, NextResponse } from "next/server"
import { verifyAuthToken, isAuthError, unauthorizedResponse } from "../../../blueprints/auth"
import {
    getProject,
    getBlueprintByProjectId,
    addCollaborator,
    removeCollaborator,
    checkProjectAccess,
} from "@/lib/firebase/collections"
import {
    createShareToken,
    getShareByBlueprintId,
    revokeShareToken,
} from "../../../share/service"
import { type CollaboratorRole } from "@/lib/firebase/schema"

interface RouteContext {
    params: Promise<{ projectId: string }>
}

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
 * GET /api/projects/[projectId]/share
 * Get sharing settings for a project
 */
export async function GET(
    request: NextRequest,
    context: RouteContext
) {
    const auth = await verifyAuthToken(request)
    if (isAuthError(auth)) {
        return unauthorizedResponse(auth)
    }

    try {
        const { projectId } = await context.params

        // Verify ownership
        await verifyOwnership(projectId, auth.userId)

        const project = await getProject(projectId)
        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 })
        }

        // Check for existing share token (public link)
        const latestBlueprint = await getBlueprintByProjectId(projectId)
        let publicLinkEnabled = false
        let publicLinkId: string | undefined

        if (latestBlueprint) {
            const shareToken = await getShareByBlueprintId(latestBlueprint.id)
            if (shareToken) {
                publicLinkEnabled = true
                publicLinkId = shareToken.token
            }
        }

        return NextResponse.json({
            collaborators: project.collaborators || [],
            publicLinkEnabled,
            publicLinkId,
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get share settings"

        if (message.includes("not found")) {
            return NextResponse.json({ error: message }, { status: 404 })
        }
        if (message.includes("Access denied") || message.includes("permission")) {
            return NextResponse.json({ error: message }, { status: 403 })
        }

        return NextResponse.json({ error: message }, { status: 500 })
    }
}

/**
 * POST /api/projects/[projectId]/share
 * Share a project with a user or toggle public link
 * Body: { userId: string, email: string, role: CollaboratorRole } OR { publicLink: boolean }
 */
export async function POST(
    request: NextRequest,
    context: RouteContext
) {
    const auth = await verifyAuthToken(request)
    if (isAuthError(auth)) {
        return unauthorizedResponse(auth)
    }

    try {
        const { projectId } = await context.params
        const body = await request.json()

        // Verify ownership
        await verifyOwnership(projectId, auth.userId)

        // Handle public link toggle
        if (body.publicLink !== undefined) {
            const latestBlueprint = await getBlueprintByProjectId(projectId)

            if (!latestBlueprint) {
                return NextResponse.json(
                    { error: "No blueprint to share. Generate a UBP first." },
                    { status: 400 }
                )
            }

            if (body.publicLink) {
                // Enable public link - create or get existing share token
                const existingToken = await getShareByBlueprintId(latestBlueprint.id)
                if (existingToken) {
                    return NextResponse.json({
                        publicLinkEnabled: true,
                        publicLinkId: existingToken.token,
                    })
                }

                // Create new share token
                const newToken = await createShareToken({
                    blueprintId: latestBlueprint.id,
                    projectId,
                    createdBy: auth.userId,
                })
                return NextResponse.json({
                    publicLinkEnabled: true,
                    publicLinkId: newToken.token,
                })
            } else {
                // Disable public link - revoke share token
                const existingToken = await getShareByBlueprintId(latestBlueprint.id)
                if (existingToken) {
                    await revokeShareToken(existingToken.token, auth.userId)
                }
                return NextResponse.json({
                    publicLinkEnabled: false,
                    publicLinkId: undefined,
                })
            }
        }

        // Handle collaborator invitation
        if (body.userId && body.email) {
            const role = body.role as CollaboratorRole
            
            // Validate role
            const validRoles: CollaboratorRole[] = ["viewer", "commenter", "editor", "admin"]
            if (!validRoles.includes(role)) {
                return NextResponse.json(
                    { error: "role must be one of: viewer, commenter, editor, admin" },
                    { status: 400 }
                )
            }

            // Can't share with yourself
            if (body.userId === auth.userId) {
                return NextResponse.json(
                    { error: "Cannot share project with yourself" },
                    { status: 400 }
                )
            }

            // Add collaborator
            await addCollaborator(projectId, {
                userId: body.userId,
                email: body.email,
                role,
                invitedBy: auth.userId,
            })

            return NextResponse.json({
                success: true,
                message: "Collaborator invitation sent",
            }, { status: 201 })
        }

        // Invalid request
        return NextResponse.json(
            { error: "Either publicLink or userId+email+role must be provided" },
            { status: 400 }
        )
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to share project"

        if (message.includes("not found")) {
            return NextResponse.json({ error: message }, { status: 404 })
        }
        if (message.includes("Access denied") || message.includes("permission")) {
            return NextResponse.json({ error: message }, { status: 403 })
        }

        return NextResponse.json({ error: message }, { status: 500 })
    }
}

/**
 * DELETE /api/projects/[projectId]/share
 * Remove a collaborator from a project
 * Body: { userId: string }
 */
export async function DELETE(
    request: NextRequest,
    context: RouteContext
) {
    const auth = await verifyAuthToken(request)
    if (isAuthError(auth)) {
        return unauthorizedResponse(auth)
    }

    try {
        const { projectId } = await context.params
        const body = await request.json()

        if (!body.userId) {
            return NextResponse.json(
                { error: "userId is required" },
                { status: 400 }
            )
        }

        // Verify ownership (only owner can remove collaborators)
        await verifyOwnership(projectId, auth.userId)

        // Can't remove yourself
        if (body.userId === auth.userId) {
            return NextResponse.json(
                { error: "Cannot remove yourself from the project" },
                { status: 400 }
            )
        }

        await removeCollaborator(projectId, body.userId)
        return NextResponse.json({
            success: true,
            message: "Collaborator removed successfully",
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to remove collaborator"

        if (message.includes("not found")) {
            return NextResponse.json({ error: message }, { status: 404 })
        }
        if (message.includes("Access denied") || message.includes("permission")) {
            return NextResponse.json({ error: message }, { status: 403 })
        }

        return NextResponse.json({ error: message }, { status: 500 })
    }
}
