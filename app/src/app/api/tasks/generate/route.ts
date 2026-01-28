import { NextRequest, NextResponse } from "next/server"
import { verifyAuthToken, isAuthError, unauthorizedResponse } from "../../blueprints/auth"
import { verifyProjectOwnership, getLatestBlueprint } from "../../blueprints/service"
import { createTask, CreateTaskInput } from "../service"
import { generateLaunchPlan } from "../../generate/service"

/**
 * POST /api/tasks/generate
 * Auto-generates launch plan tasks from a project's UBP
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

        // Verify user owns the project
        await verifyProjectOwnership(projectId, auth.userId)

        // Get the latest blueprint
        const blueprint = await getLatestBlueprint(projectId)
        if (!blueprint || !blueprint.content) {
            return NextResponse.json(
                { error: "No blueprint found. Create a UBP first." },
                { status: 400 }
            )
        }

        console.log("=== Generating Launch Plan ===")
        console.log("Project ID:", projectId)
        console.log("Blueprint ID:", blueprint.id)

        // Generate launch plan from UBP using LangChain
        const launchPlan = await generateLaunchPlan(blueprint.content)

        console.log("Generated tasks:", launchPlan.tasks.length)

        // Map category to status (currently unused - all tasks go to backlog)
        const categoryToStatus: Record<string, string> = {
            feature: "backlog",
            marketing: "backlog",
            operations: "backlog",
        }

        // Create tasks in Firestore
        const createdTasks = []
        for (const task of launchPlan.tasks) {
            const input: CreateTaskInput = {
                projectId,
                title: task.title,
                description: task.description,
                status: "backlog", // Force all newly generated tasks to backlog
                priority: task.priority,
                createdBy: auth.userId,
                source: {
                    type: "ai_generated",
                    blueprintId: blueprint.id,
                    sectionType: "phase", // Map all generated tasks to phase type
                    sectionId: task.category, // Store category as sectionId
                },
                tags: [task.category, task.phase].filter(Boolean),
            }

            const created = await createTask(input)
            createdTasks.push(created)
        }

        return NextResponse.json({
            success: true,
            summary: launchPlan.summary,
            tasksCreated: createdTasks.length,
            tasks: createdTasks,
        })
    } catch (error) {
        console.error("Generate launch plan error:", error)
        const message = error instanceof Error ? error.message : "Failed to generate launch plan"

        if (message.includes("not found")) {
            return NextResponse.json({ error: message }, { status: 404 })
        }
        if (message.includes("Access denied") || message.includes("permission")) {
            return NextResponse.json({ error: message }, { status: 403 })
        }

        return NextResponse.json({ error: message }, { status: 500 })
    }
}
