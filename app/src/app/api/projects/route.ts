import { NextRequest, NextResponse } from "next/server"
import { verifyAuthToken, isAuthError, unauthorizedResponse } from "../blueprints/auth"
import { createProject, getUserProjects } from "../blueprints/service"

// GET /api/projects - List user's projects
export async function GET(request: NextRequest) {
    try {
        const authResult = await verifyAuthToken(request)

        if (isAuthError(authResult)) {
            return unauthorizedResponse(authResult)
        }

        const projects = await getUserProjects(authResult.userId)

        return NextResponse.json({ projects })
    } catch (error) {
        console.error("List projects error:", error)
        return NextResponse.json({ error: "Failed to list projects" }, { status: 500 })
    }
}

// POST /api/projects - Create new project
export async function POST(request: NextRequest) {
    try {
        const authResult = await verifyAuthToken(request)

        if (isAuthError(authResult)) {
            return unauthorizedResponse(authResult)
        }

        const body = await request.json()
        let { projectName, description, initialPrompt } = body

        if (!projectName) {
            // Generate a clean default name - AI will suggest a proper name in its first response
            projectName = "Untitled Project"
        }

        const { project, blueprint } = await createProject({
            userId: authResult.userId,
            projectName,
            description,
            initialPrompt,
        })



        // Return both project and its initial blueprint
        return NextResponse.json({
            ...project,
            latestBlueprint: blueprint
        })
    } catch (error) {
        console.error("Create project error:", error)
        return NextResponse.json({ error: "Failed to create project" }, { status: 500 })
    }
}
