import { NextRequest, NextResponse } from "next/server"
import { verifyAuthToken, isAuthError, unauthorizedResponse } from "../../blueprints/auth"
import { getTaskById, updateTask, deleteTask, verifyTaskAccess, UpdateTaskInput } from "../service"

interface RouteContext {
    params: Promise<{ id: string }>
}

/**
 * GET /api/tasks/[id]
 * Gets a single task by ID
 */
export async function GET(
    request: NextRequest,
    context: RouteContext
) {
    const auth = await verifyAuthToken(request)
    if (isAuthError(auth)) {
        return unauthorizedResponse(auth)
    }

    try {
        const { id } = await context.params

        // Verify user has access to this task
        const task = await verifyTaskAccess(id, auth.userId)
        return NextResponse.json({ task })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to fetch task"

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
 * PATCH /api/tasks/[id]
 * Updates a task's details
 * Body: { title?, description?, status?, priority?, assigneeId?, dueDate?, tags? }
 */
export async function PATCH(
    request: NextRequest,
    context: RouteContext
) {
    const auth = await verifyAuthToken(request)
    if (isAuthError(auth)) {
        return unauthorizedResponse(auth)
    }

    try {
        const { id } = await context.params
        const body = await request.json()

        // Verify user has access to this task
        await verifyTaskAccess(id, auth.userId)

        const input: UpdateTaskInput = {}
        if (body.title !== undefined) input.title = body.title
        if (body.description !== undefined) input.description = body.description
        if (body.status !== undefined) input.status = body.status
        if (body.priority !== undefined) input.priority = body.priority
        if (body.assigneeId !== undefined) input.assigneeId = body.assigneeId
        if (body.dueDate !== undefined) input.dueDate = body.dueDate
        if (body.tags !== undefined) input.tags = body.tags

        const task = await updateTask(id, input)
        return NextResponse.json({ task })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to update task"

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
 * DELETE /api/tasks/[id]
 * Deletes a task
 */
export async function DELETE(
    request: NextRequest,
    context: RouteContext
) {
    const auth = await verifyAuthToken(request)
    if (isAuthError(auth)) {
        return unauthorizedResponse(auth)
    }

    try {
        const { id } = await context.params

        // Verify user has access to this task
        await verifyTaskAccess(id, auth.userId)

        await deleteTask(id)
        return NextResponse.json({ success: true })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to delete task"

        if (message.includes("not found")) {
            return NextResponse.json({ error: message }, { status: 404 })
        }
        if (message.includes("Access denied") || message.includes("permission")) {
            return NextResponse.json({ error: message }, { status: 403 })
        }

        return NextResponse.json({ error: message }, { status: 500 })
    }
}
