import { NextRequest, NextResponse } from "next/server"
import { verifyAuthToken, isAuthError, unauthorizedResponse } from "../blueprints/auth"
import {
    createShareToken,
    getShareByBlueprintId,
    revokeShareToken,
} from "./service"
import { getBlueprint, getProject } from "@/lib/firebase/collections"

async function verifyBlueprintOwnership(blueprintId: string, userId: string): Promise<void> {
    const blueprint = await getBlueprint(blueprintId)
    if (!blueprint) {
        throw new Error("Blueprint not found")
    }

    const project = await getProject(blueprint.projectId)
    if (!project) {
        throw new Error("Project not found")
    }
    if (project.userId !== userId) {
        throw new Error("Access denied: you do not own this blueprint")
    }
}

// POST /api/share - Create a new share token for a blueprint
export async function POST(request: NextRequest) {
    try {
        const authResult = await verifyAuthToken(request)

        if (isAuthError(authResult)) {
            return unauthorizedResponse(authResult)
        }

        const body = await request.json()
        const { blueprintId, projectId, expiresAt } = body

        if (!blueprintId || !projectId) {
            return NextResponse.json(
                { error: "blueprintId and projectId required" },
                { status: 400 }
            )
        }

        // Verify user owns this blueprint before creating share token
        await verifyBlueprintOwnership(blueprintId, authResult.userId)

        // Check if an active share already exists for this blueprint
        const existingShare = await getShareByBlueprintId(blueprintId)

        if (existingShare) {
            // Return existing share token instead of creating a new one
            const shareUrl = `${request.nextUrl.origin}/share/${existingShare.token}`
            return NextResponse.json({
                shareToken: existingShare,
                shareUrl,
            })
        }

        // Create new share token
        const shareToken = await createShareToken({
            blueprintId,
            projectId,
            createdBy: authResult.userId,
            expiresAt: expiresAt || null,
        })

        const shareUrl = `${request.nextUrl.origin}/share/${shareToken.token}`

        return NextResponse.json({
            shareToken,
            shareUrl,
        })
    } catch (error) {
        console.error("Create share token error:", error)
        const message = error instanceof Error ? error.message : "Failed to create share token"
        const status = message.includes("Access denied") ? 403 : message.includes("not found") ? 404 : 500
        return NextResponse.json({ error: message }, { status })
    }
}

// DELETE /api/share?token=xxx - Revoke a share token
export async function DELETE(request: NextRequest) {
    try {
        const authResult = await verifyAuthToken(request)

        if (isAuthError(authResult)) {
            return unauthorizedResponse(authResult)
        }

        const { searchParams } = new URL(request.url)
        const token = searchParams.get("token")

        if (!token) {
            return NextResponse.json({ error: "token query parameter required" }, { status: 400 })
        }

        await revokeShareToken(token, authResult.userId)

        return NextResponse.json({ success: true, message: "Share link revoked" })
    } catch (error) {
        console.error("Revoke share token error:", error)
        const message = error instanceof Error ? error.message : "Failed to revoke share token"
        const status = message.includes("Access denied") ? 403 : message.includes("not found") ? 404 : 500
        return NextResponse.json({ error: message }, { status })
    }
}
