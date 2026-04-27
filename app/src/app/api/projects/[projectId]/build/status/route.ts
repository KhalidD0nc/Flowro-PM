import { NextRequest, NextResponse } from "next/server"
import { verifyAuthToken, isAuthError, unauthorizedResponse } from "@/app/api/blueprints/auth"
import { getBuildRuns, getProject } from "@/lib/firebase/collections"
import { timestampToISO } from "@/lib/firebase/schema"

async function verifyOwnership(projectId: string, userId: string): Promise<void> {
    const project = await getProject(projectId)
    if (!project) throw new Error("Project not found")
    if (project.userId !== userId) throw new Error("Access denied")
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const authResult = await verifyAuthToken(request)
        if (isAuthError(authResult)) return unauthorizedResponse(authResult)

        const { projectId } = await params
        await verifyOwnership(projectId, authResult.userId)
        const runs = await getBuildRuns(projectId)

        return NextResponse.json({
            latestRun: runs[0]
                ? {
                    ...runs[0],
                    createdAt: timestampToISO(runs[0].createdAt),
                    updatedAt: timestampToISO(runs[0].updatedAt),
                }
                : null,
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get build status"
        const status = message.includes("Access denied") ? 403 : message.includes("not found") ? 404 : 500
        return NextResponse.json({ error: message }, { status })
    }
}
