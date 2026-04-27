import { NextRequest, NextResponse } from "next/server"
import { verifyAuthToken, isAuthError, unauthorizedResponse } from "@/app/api/blueprints/auth"
import {
    createBuildRun,
    getApprovedDesignArtifact,
    getProject,
    getProjectPlanByProjectId,
    setProjectStage,
} from "@/lib/firebase/collections"
import { timestampToISO } from "@/lib/firebase/schema"
import { createStubBuildRun } from "@/lib/build-worker/stub"

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

        const planDoc = await getProjectPlanByProjectId(projectId)
        if (!planDoc || planDoc.status !== "approved") {
            return NextResponse.json({ error: "Approve the project plan before starting build." }, { status: 409 })
        }

        const design = await getApprovedDesignArtifact(projectId)
        if (!design) {
            return NextResponse.json({ error: "Approve a UI design before starting build." }, { status: 409 })
        }

        await setProjectStage(projectId, "coding")
        const run = await createBuildRun(createStubBuildRun(projectId, planDoc.plan, {
            ...design,
            createdAt: timestampToISO(design.createdAt),
            approvedAt: design.approvedAt ? timestampToISO(design.approvedAt) : undefined,
        }))

        return NextResponse.json({
            ...run,
            createdAt: timestampToISO(run.createdAt),
            updatedAt: timestampToISO(run.updatedAt),
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to start build"
        const status = message.includes("Access denied") ? 403 : message.includes("not found") ? 404 : 500
        return NextResponse.json({ error: message }, { status })
    }
}
