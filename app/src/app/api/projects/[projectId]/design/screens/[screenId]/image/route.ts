import { NextRequest, NextResponse } from "next/server"
import { verifyAuthToken, isAuthError, unauthorizedResponse } from "@/app/api/blueprints/auth"
import { getDesignArtifacts, getProject } from "@/lib/firebase/collections"
import { getStitchService } from "@/lib/stitch"

async function verifyOwnership(projectId: string, userId: string): Promise<void> {
    const project = await getProject(projectId)
    if (!project) throw new Error("Project not found")
    if (project.userId !== userId) throw new Error("Access denied")
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string; screenId: string }> }
) {
    try {
        const authResult = await verifyAuthToken(request)
        if (isAuthError(authResult)) return unauthorizedResponse(authResult)

        const { projectId, screenId } = await params
        await verifyOwnership(projectId, authResult.userId)
        const artifact = (await getDesignArtifacts(projectId)).find((item) => item.screenId === screenId || item.id === screenId)

        if (!artifact?.imageUrl) {
            return NextResponse.json({ error: "Screen image not found." }, { status: 404 })
        }

        let imageResponse = await fetch(artifact.imageUrl)
        if (!imageResponse.ok && [400, 401, 403].includes(imageResponse.status)) {
            const freshUrl = await getStitchService().getFreshImageUrl(artifact.stitchProjectId, artifact.screenId)
            if (freshUrl) {
                imageResponse = await fetch(freshUrl)
            }
        }

        if (!imageResponse.ok) {
            return NextResponse.json({ error: `Failed to fetch image from Stitch (${imageResponse.status}).` }, { status: 502 })
        }

        return new Response(await imageResponse.arrayBuffer(), {
            headers: {
                "Content-Type": imageResponse.headers.get("content-type") || "image/png",
                "Cache-Control": "private, max-age=300",
            },
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to fetch screen image"
        const status = message.includes("Access denied") ? 403 : message.includes("not found") ? 404 : 500
        return NextResponse.json({ error: message }, { status })
    }
}
