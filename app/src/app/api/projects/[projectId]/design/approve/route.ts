import { NextRequest, NextResponse } from "next/server"
import { verifyAuthToken, isAuthError, unauthorizedResponse } from "@/app/api/blueprints/auth"
import { approveDesignArtifact, getProject, getProjectPlanByProjectId } from "@/lib/firebase/collections"
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

        const planDoc = await getProjectPlanByProjectId(projectId)
        if (!planDoc || planDoc.status !== "approved") {
            return NextResponse.json({ error: "Approve the project plan before approving UI." }, { status: 409 })
        }

        const body = await request.json()
        const artifactId = typeof body.artifactId === "string" ? body.artifactId : ""
        if (!artifactId) {
            return NextResponse.json({ error: "artifactId is required" }, { status: 400 })
        }

        const artifact = await approveDesignArtifact(projectId, artifactId, authResult.userId)
        return NextResponse.json({
            ...artifact,
            createdAt: timestampToISO(artifact.createdAt),
            approvedAt: artifact.approvedAt ? timestampToISO(artifact.approvedAt) : undefined,
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to approve design"
        const status = message.includes("Access denied") ? 403 : message.includes("not found") ? 404 : 500
        return NextResponse.json({ error: message }, { status })
    }
}
