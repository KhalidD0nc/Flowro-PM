import { NextRequest, NextResponse } from "next/server"
import { verifyAuthToken, isAuthError, unauthorizedResponse } from "../../../blueprints/auth"
import { getProject, getBlueprintByProjectId } from "@/lib/firebase/collections"
import { shareProject, unshareProject } from "../../../blueprints/service"
import {
    createShareToken,
    getShareByBlueprintId,
    revokeShareToken,
} from "../../../share/service"

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
        const projectData = project as { visibility?: "private" | "shared"; sharedWith?: unknown[] }

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
            visibility: projectData.visibility || "private",
            sharedWith: projectData.sharedWith || [],
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
 * Body: { email: string, role: "editor" | "viewer" } OR { publicLink: boolean }
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

        // Handle email share
        if (!body.email) {
            return NextResponse.json(
                { error: "email is required" },
                { status: 400 }
            )
        }

        const role = body.role || "viewer"
        if (role !== "editor" && role !== "viewer") {
            return NextResponse.json(
                { error: "role must be 'editor' or 'viewer'" },
                { status: 400 }
            )
        }

        // Can't share with yourself
        // Note: Would need to look up owner's email to check this properly
        // For now, we skip this check

        const share = await shareProject(projectId, body.email, role)
        return NextResponse.json({ share }, { status: 201 })
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
 * Remove a share from a project
 * Body: { email: string }
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

        if (!body.email) {
            return NextResponse.json(
                { error: "email is required" },
                { status: 400 }
            )
        }

        // Verify ownership
        await verifyOwnership(projectId, auth.userId)

        await unshareProject(projectId, body.email)
        return NextResponse.json({ success: true })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to remove share"

        if (message.includes("not found")) {
            return NextResponse.json({ error: message }, { status: 404 })
        }
        if (message.includes("Access denied") || message.includes("permission")) {
            return NextResponse.json({ error: message }, { status: 403 })
        }

        return NextResponse.json({ error: message }, { status: 500 })
    }
}
