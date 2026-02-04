import { NextRequest, NextResponse } from "next/server"
import { verifyAuthToken, isAuthError, unauthorizedResponse } from "../blueprints/auth"
import {
    createProject,
    getUserProjects,
} from "@/lib/firebase/collections"
import { timestampToISO } from "@/lib/firebase/schema"

/**
 * GET /api/projects - List user's projects (fast, no chat history)
 * 
 * Returns lightweight project list for Command Center "Jump Back In" section.
 * Uses subcollection architecture - no chat history downloaded.
 * 
 * @returns { projects: ProjectListItem[] }
 */
export async function GET(request: NextRequest) {
    try {
        const authResult = await verifyAuthToken(request)

        if (isAuthError(authResult)) {
            return unauthorizedResponse(authResult)
        }

        const projects = await getUserProjects(authResult.userId)

        const enriched = projects.map((project) => ({
            ...project,
            projectName: project.name,
        }))

        return NextResponse.json({ projects: enriched })
    } catch (error) {
        console.error("List projects error:", error)
        return NextResponse.json(
            { error: "Failed to list projects" },
            { status: 500 }
        )
    }
}

/**
 * POST /api/projects - Create new project
 * 
 * Creates a new project container. Blueprint is created separately
 * when AI generates initial response via /api/generate.
 * 
 * @body { name: string, lastMessage?: string }
 * @returns ProjectDocument with ISO timestamps
 */
export async function POST(request: NextRequest) {
    try {
        const authResult = await verifyAuthToken(request)

        if (isAuthError(authResult)) {
            return unauthorizedResponse(authResult)
        }

        const body = await request.json()
        const { name: rawName, projectName: rawProjectName, lastMessage: rawLastMessage } = body

        // Validate and sanitize name: must be non-empty string after trimming
        let name: string
        const candidateName = typeof rawProjectName === "string" ? rawProjectName : rawName
        if (typeof candidateName === "string") {
            const trimmed = candidateName.trim()
            name = trimmed.length > 0 ? trimmed : "Untitled Project"
        } else {
            name = "Untitled Project"
        }

        // Validate lastMessage: must be string if provided, otherwise undefined
        let lastMessage: string | undefined
        if (typeof rawLastMessage === "string") {
            lastMessage = rawLastMessage.slice(0, 100) // Preview limit
        }
        // If rawLastMessage is not a string, leave lastMessage as undefined

        const project = await createProject({
            userId: authResult.userId,
            name,
            lastMessage,
        })

        // Return project with ISO string timestamps for client
        return NextResponse.json({
            id: project.id,
            userId: project.userId,
            name: project.name,
            projectName: project.name,
            lastMessage: project.lastMessage,
            createdAt: timestampToISO(project.createdAt),
            updatedAt: timestampToISO(project.updatedAt),
        })
    } catch (error) {
        console.error("Create project error:", error)
        return NextResponse.json(
            { error: "Failed to create project" },
            { status: 500 }
        )
    }
}
