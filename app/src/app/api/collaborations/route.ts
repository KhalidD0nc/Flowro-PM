import { NextRequest, NextResponse } from "next/server"
import { verifyAuthToken, isAuthError, unauthorizedResponse } from "../blueprints/auth"
import { getAccessibleProjects } from "@/lib/firebase/collections"

/**
 * GET /api/collaborations
 * Get all projects where the user is a collaborator (pending or active)
 */
export async function GET(request: NextRequest) {
    const auth = await verifyAuthToken(request)
    if (isAuthError(auth)) {
        return unauthorizedResponse(auth)
    }

    try {
        const projects = await getAccessibleProjects(auth.userId)

        return NextResponse.json({
            projects,
            total: projects.length,
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get collaborations"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
