import { NextRequest, NextResponse } from "next/server"
import { verifyAuthToken, isAuthError, unauthorizedResponse } from "../blueprints/auth"
import { getUserProjects, createProject, getProjectById } from "../blueprints/service"

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
        const { projectName } = body

        if (!projectName) {
            return NextResponse.json({ error: "Project name required" }, { status: 400 })
        }

        const { project, blueprint } = await createProject({
            userId: authResult.userId,
            projectName,
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
