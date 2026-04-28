import { NextRequest, NextResponse } from "next/server"
import { verifyAuthToken, isAuthError, unauthorizedResponse } from "@/app/api/blueprints/auth"
import { approveProjectPlan, getProject } from "@/lib/firebase/collections"
import { timestampToISO } from "@/lib/firebase/schema"

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

        const plan = await approveProjectPlan(projectId, authResult.userId)
        return NextResponse.json({
            id: plan.id,
            projectId: plan.projectId,
            plan: plan.plan,
            status: plan.status,
            approvedBy: plan.approvedBy,
            approvedAt: plan.approvedAt ? timestampToISO(plan.approvedAt) : undefined,
            updatedAt: timestampToISO(plan.updatedAt),
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to approve project plan"
        const status = message.includes("Access denied") ? 403 : message.includes("not found") ? 404 : 500
        return NextResponse.json({ error: message }, { status })
    }
}
