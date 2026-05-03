import { NextRequest, NextResponse } from "next/server"
import { getShareByToken, incrementViewCount } from "../service"
import { logError } from "@/lib/logger"
import { getBlueprint, getProject } from "@/lib/firebase/collections"
import { timestampToISO } from "@/lib/firebase/schema"

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
        const blueprint = await getBlueprint(shareData.blueprintId)

        if (!blueprint) {
            return NextResponse.json({ error: "Blueprint not found" }, { status: 404 })
        }

        // Get project data
        const project = await getProject(shareData.projectId)

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 })
        }
        const projectData = project as { description?: string }

        // Increment view count asynchronously (don't await, don't block response)
        incrementViewCount(token).catch(err =>
            logError("share_view_count_failed", { error: err instanceof Error ? err.message : String(err) })
        )

        return NextResponse.json({
            blueprint: {
                id: blueprint.id,
                version: blueprint.content?.metadata?.version || "1.0",
                status: blueprint.content?.metadata?.status || "draft",
                content: blueprint.content,
                createdAt: timestampToISO(project.createdAt),
                updatedAt: timestampToISO(blueprint.updatedAt),
                lockedAt: undefined,
            },
            project: {
                projectName: project.name,
                description: projectData.description,
            },
            shareData: {
                viewCount: shareData.viewCount,
                createdAt: shareData.createdAt,
            },
        })
    } catch (error) {
        logError("share_blueprint_fetch_failed", { error: error instanceof Error ? error.message : String(error) })
        const message = error instanceof Error ? error.message : "Failed to load shared blueprint"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
