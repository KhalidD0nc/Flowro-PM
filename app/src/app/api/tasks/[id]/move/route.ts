import { NextRequest, NextResponse } from "next/server"
import { verifyAuthToken, isAuthError, unauthorizedResponse } from "../../../blueprints/auth"
import { moveTask, verifyTaskAccess, MoveTaskInput } from "../../service"

interface RouteContext {
    params: Promise<{ id: string }>
}

/**
 * POST /api/tasks/[id]/move
 * Moves a task to a new status/position (drag-drop)
 * Body: { newStatus: string, newOrder: number }
 */
export async function POST(
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

        if (body.newStatus === undefined || body.newOrder === undefined) {
            return NextResponse.json(
                { error: "newStatus and newOrder are required" },
                { status: 400 }
            )
        }

        // Verify user has access to this task
        await verifyTaskAccess(id, auth.userId)

        const input: MoveTaskInput = {
            newStatus: body.newStatus,
            newOrder: body.newOrder,
        }

        const task = await moveTask(id, input)
        return NextResponse.json({ task })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to move task"

        if (message.includes("not found")) {
            return NextResponse.json({ error: message }, { status: 404 })
        }
        if (message.includes("Access denied") || message.includes("permission")) {
            return NextResponse.json({ error: message }, { status: 403 })
        }

        return NextResponse.json({ error: message }, { status: 500 })
    }
}
