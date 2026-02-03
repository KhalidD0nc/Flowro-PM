import { NextRequest, NextResponse } from "next/server"
import { verifyAuthToken, isAuthError, unauthorizedResponse } from "../../blueprints/auth"
import { getProject, getBlueprintByProjectId } from "@/lib/firebase/collections"
import { createTask, CreateTaskInput } from "../service"
import { generateLaunchPlan } from "../../generate/service"
import { log, logInfo, logError } from "@/lib/logger"
import { estimateTokens } from "@/lib/tokenCounter"
import { checkBudgetLimit, recordUsage } from "@/lib/costTracking"

async function verifyProjectOwnership(projectId: string, userId: string): Promise<void> {
    const project = await getProject(projectId)
    if (!project) {
        throw new Error("Project not found")
    }
    if (project.userId !== userId) {
        throw new Error("Access denied: you do not own this project")
    }
}

/**
 * POST /api/tasks/generate
 * Auto-generates launch plan tasks from a project's UBP
 * Body: { projectId: string }
 */
export async function POST(request: NextRequest) {
    const startTime = Date.now()
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
        const blueprint = await getBlueprintByProjectId(projectId)
        if (!blueprint || !blueprint.content) {
            return NextResponse.json(
                { error: "No blueprint found. Create a UBP first." },
                { status: 400 }
            )
        }

        // Estimate tokens and check budget
        const blueprintText = JSON.stringify(blueprint.content)
        const estimatedTokens = estimateTokens(blueprintText) + 2000 // Buffer for prompt + response

        const budgetCheck = await checkBudgetLimit(auth.userId, estimatedTokens)
        if (!budgetCheck.allowed) {
            logError("budget_exceeded_tasks", {
                userId: auth.userId,
                projectId,
                reason: budgetCheck.reason
            })
            return NextResponse.json(
                {
                    error: budgetCheck.reason,
                    budgetExceeded: true
                },
                { status: 429 }
            )
        }

        log({
            level: "info",
            action: "launch_plan_start",
            userId: auth.userId,
            projectId,
            details: {
                blueprintId: blueprint.id,
                estimatedTokens
            }
        })

        // Generate launch plan from UBP using LangChain
        const launchPlan = await generateLaunchPlan(blueprint.content)

        logInfo("launch_plan_generated", {
            projectId,
            taskCount: launchPlan.tasks.length
        })

        // Record usage
        const model = process.env.OPENROUTER_MODEL || "deepseek/deepseek-v3.2"
        const responseTokens = estimateTokens(JSON.stringify(launchPlan))
        await recordUsage(auth.userId, estimatedTokens, responseTokens, model)

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

        const duration = Date.now() - startTime
        log({
            level: "info",
            action: "launch_plan_success",
            userId: auth.userId,
            projectId,
            details: {
                tasksCreated: createdTasks.length,
                durationMs: duration
            }
        })

        return NextResponse.json({
            success: true,
            summary: launchPlan.summary,
            tasksCreated: createdTasks.length,
            tasks: createdTasks,
        })
    } catch (error) {
        const duration = Date.now() - startTime
        const message = error instanceof Error ? error.message : "Failed to generate launch plan"

        logError("launch_plan_failed", {
            userId: auth.userId,
            error: message,
            durationMs: duration
        })

        if (message.includes("not found")) {
            return NextResponse.json({ error: message }, { status: 404 })
        }
        if (message.includes("Access denied") || message.includes("permission")) {
            return NextResponse.json({ error: message }, { status: 403 })
        }

        return NextResponse.json({ error: message }, { status: 500 })
    }
}
