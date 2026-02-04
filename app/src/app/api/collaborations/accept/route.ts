import { NextRequest, NextResponse } from "next/server"
import { verifyAuthToken, isAuthError, unauthorizedResponse } from "../../blueprints/auth"
import { updateCollaboratorStatus, getProject } from "@/lib/firebase/collections"

/**
 * POST /api/collaborations/accept
 * Accept a collaboration invitation
 * Body: { projectId: string }
 */
export async function POST(request: NextRequest) {
    const auth = await verifyAuthToken(request)
    if (isAuthError(auth)) {
        return unauthorizedResponse(auth)
    }

    try {
        const body = await request.json()
        const { projectId } = body

        if (!projectId) {
            return NextResponse.json(
                { error: "projectId is required" },
                { status: 400 }
            )
        }

        // Verify the project exists and user is invited
        const project = await getProject(projectId)
        if (!project) {
            return NextResponse.json(
                { error: "Project not found" },
                { status: 404 }
            )
        }

        // Check if user is invited
        const collaborator = project.collaborators?.find(
            (c) => c.userId === auth.userId
        )

        if (!collaborator) {
            return NextResponse.json(
                { error: "No invitation found for this project" },
                { status: 404 }
            )
        }

        if (collaborator.status === "active") {
            return NextResponse.json(
                { error: "Invitation already accepted" },
                { status: 400 }
            )
        }

        if (collaborator.status === "revoked") {
            return NextResponse.json(
                { error: "Invitation has been revoked" },
                { status: 403 }
            )
        }

        // Accept the invitation
        await updateCollaboratorStatus(projectId, auth.userId, "active")

        return NextResponse.json({
            success: true,
            message: "Collaboration invitation accepted",
            project: {
                id: project.id,
                name: project.name,
                role: collaborator.role,
            },
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to accept invitation"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
