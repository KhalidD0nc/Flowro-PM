import { NextRequest, NextResponse } from "next/server"
import { getShareByToken, incrementViewCount } from "../service"
import { getBlueprintById, getProjectById } from "../../blueprints/service"

// GET /api/share/[token] - Get blueprint by share token (PUBLIC - no auth required)
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
        const { token } = await params

        if (!token) {
            return NextResponse.json({ error: "Token required" }, { status: 400 })
        }

        // Get share token data
        const shareData = await getShareByToken(token)

        if (!shareData) {
            return NextResponse.json(
                { error: "Share link not found or has expired" },
                { status: 404 }
            )
        }

        // Get blueprint data
        const blueprint = await getBlueprintById(shareData.blueprintId)

        if (!blueprint) {
            return NextResponse.json({ error: "Blueprint not found" }, { status: 404 })
        }

        // Get project data
        const project = await getProjectById(shareData.projectId)

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 })
        }

        // Increment view count asynchronously (don't await, don't block response)
        incrementViewCount(token).catch(err =>
            console.error("Failed to increment view count:", err)
        )

        return NextResponse.json({
            blueprint: {
                id: blueprint.id,
                version: blueprint.version,
                status: blueprint.status,
                content: blueprint.content,
                createdAt: blueprint.createdAt,
                lockedAt: blueprint.lockedAt,
            },
            project: {
                projectName: project.projectName,
                description: project.description,
            },
            shareData: {
                viewCount: shareData.viewCount,
                createdAt: shareData.createdAt,
            },
        })
    } catch (error) {
        console.error("Get shared blueprint error:", error)
        const message = error instanceof Error ? error.message : "Failed to load shared blueprint"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
