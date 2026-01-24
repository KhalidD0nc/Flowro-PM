import { NextRequest, NextResponse } from "next/server"
import { verifyAuthToken, isAuthError, unauthorizedResponse } from "../blueprints/auth"
import { verifyProjectOwnership } from "../blueprints/service"
import { getProjectTasks, createTask, CreateTaskInput } from "./service"

/**
 * GET /api/tasks?projectId=xxx
 * Lists all tasks for a project
 */
export async function GET(request: NextRequest) {
    const auth = await verifyAuthToken(request)
    if (isAuthError(auth)) {
        return unauthorizedResponse(auth)
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get("projectId")

    if (!projectId) {
        return NextResponse.json(
            { error: "projectId is required" },
            { status: 400 }
        )
    }

    try {
        // Verify user owns the project
        await verifyProjectOwnership(projectId, auth.userId)

        const tasks = await getProjectTasks(projectId)
        return NextResponse.json({ tasks })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to fetch tasks"

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
 * POST /api/tasks
 * Creates a new task
 * Body: { projectId, title, description?, priority?, status?, dueDate?, tags? }
 */
export async function POST(request: NextRequest) {
    const auth = await verifyAuthToken(request)
    if (isAuthError(auth)) {
        return unauthorizedResponse(auth)
    }

    try {
        const body = await request.json()

        if (!body.projectId || !body.title) {
            return NextResponse.json(
                { error: "projectId and title are required" },
                { status: 400 }
            )
        }

        // Verify user owns the project
        await verifyProjectOwnership(body.projectId, auth.userId)

        const input: CreateTaskInput = {
            projectId: body.projectId,
            workspaceId: body.workspaceId,
            title: body.title,
            description: body.description,
            status: body.status,
            priority: body.priority,
            assigneeId: body.assigneeId,
            createdBy: auth.userId,
            dueDate: body.dueDate,
            source: body.source,
            tags: body.tags,
        }

        const task = await createTask(input)
        return NextResponse.json({ task }, { status: 201 })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create task"

        if (message.includes("not found")) {
            return NextResponse.json({ error: message }, { status: 404 })
        }
        if (message.includes("Access denied") || message.includes("permission")) {
            return NextResponse.json({ error: message }, { status: 403 })
        }

        return NextResponse.json({ error: message }, { status: 500 })
    }
}
