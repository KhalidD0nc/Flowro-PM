import { NextRequest, NextResponse } from "next/server"
import { verifyAuthToken, isAuthError, unauthorizedResponse } from "../../blueprints/auth"
import { getProjectById, verifyProjectOwnership, getLatestBlueprint } from "../../blueprints/service"

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
