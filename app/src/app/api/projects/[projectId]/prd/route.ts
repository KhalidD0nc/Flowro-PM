import { NextRequest, NextResponse } from "next/server"
import { verifyAuthToken, isAuthError, unauthorizedResponse } from "../../../blueprints/auth"
import { getProject, getPrdByProjectId, replacePrd } from "@/lib/firebase/collections"
import { prdConfigSchema } from "@/lib/prd/schema"

async function verifyOwnership(projectId: string, userId: string): Promise<void> {
    const project = await getProject(projectId)
    if (!project) {
        throw new Error("Project not found")
    }
    if (project.userId !== userId) {
        throw new Error("Access denied")
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const authResult = await verifyAuthToken(request)
        if (isAuthError(authResult)) {
            return unauthorizedResponse(authResult)
        }

        const { projectId } = await params
        await verifyOwnership(projectId, authResult.userId)

        const prd = await getPrdByProjectId(projectId)
        if (!prd) {
            return NextResponse.json({ error: "PRD not found" }, { status: 404 })
        }

        return NextResponse.json({
            id: prd.id,
            projectId: prd.projectId,
            config: prd.config,
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to fetch PRD"
        const status = message.includes("Access denied") ? 403 : message.includes("not found") ? 404 : 500
        return NextResponse.json({ error: message }, { status })
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const authResult = await verifyAuthToken(request)
        if (isAuthError(authResult)) {
            return unauthorizedResponse(authResult)
        }

        const { projectId } = await params
        await verifyOwnership(projectId, authResult.userId)

        const body = await request.json()
        const parsed = prdConfigSchema.safeParse(body.config)
        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: "Invalid PRD payload",
                    issues: parsed.error.issues,
                },
                { status: 400 }
            )
        }

        const prd = await replacePrd(projectId, parsed.data)

        return NextResponse.json({
            success: true,
            id: prd.id,
            projectId: prd.projectId,
            config: prd.config,
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to update PRD"
        const status = message.includes("Access denied") ? 403 : message.includes("not found") ? 404 : 500
        return NextResponse.json({ error: message }, { status })
    }
}
