import { NextRequest, NextResponse } from "next/server"
import { verifyAuthToken, isAuthError, unauthorizedResponse } from "@/app/api/blueprints/auth"
import { getBuildRuns, getProject, updateBuildRun } from "@/lib/firebase/collections"
import { timestampToISO } from "@/lib/firebase/schema"
import { cancelActiveBuild } from "@/lib/build-worker/cancel"

async function verifyOwnership(projectId: string, userId: string): Promise<void> {
    const project = await getProject(projectId)
    if (!project) throw new Error("Project not found")
    if (project.userId !== userId) throw new Error("Access denied")
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const authResult = await verifyAuthToken(request)
        if (isAuthError(authResult)) return unauthorizedResponse(authResult)

        const { projectId } = await params
        await verifyOwnership(projectId, authResult.userId)

        const runs = await getBuildRuns(projectId)
        const latestRunningRun = runs.find((run) => run.status === "queued" || run.status === "running")
        if (!latestRunningRun) {
            return NextResponse.json({ error: "No running build to cancel." }, { status: 409 })
        }

        const finishedAt = new Date().toISOString()
        const logs = [...latestRunningRun.logs, "[build-worker] Build cancellation requested"]
        cancelActiveBuild(latestRunningRun.id)
        await updateBuildRun(projectId, latestRunningRun.id, {
            status: "canceled",
            phase: "canceled",
            agentStatus: "blocked",
            currentAction: "Build cancellation requested",
            finishedAt,
            previewAvailable: false,
            logs,
        })

        return NextResponse.json({
            latestRun: {
                ...latestRunningRun,
                status: "canceled",
                phase: "canceled",
                currentAction: "Build cancellation requested",
                finishedAt,
                previewAvailable: false,
                logs,
                createdAt: timestampToISO(latestRunningRun.createdAt),
                updatedAt: finishedAt,
            },
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to cancel build"
        const status = message.includes("Access denied") ? 403 : message.includes("not found") ? 404 : 500
        return NextResponse.json({ error: message }, { status })
    }
}
