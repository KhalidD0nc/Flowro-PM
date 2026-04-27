import { NextRequest, NextResponse } from "next/server"
import { verifyAuthToken, isAuthError, unauthorizedResponse } from "@/app/api/blueprints/auth"
import {
    createDesignArtifact,
    getDesignArtifacts,
    getProject,
    getProjectPlanByProjectId,
    setProjectStage,
} from "@/lib/firebase/collections"
import { normalizeHtmlDocument } from "@/lib/html/normalize"
import { getStitchService } from "@/lib/stitch"
import { timestampToISO } from "@/lib/firebase/schema"

async function verifyOwnership(projectId: string, userId: string): Promise<void> {
    const project = await getProject(projectId)
    if (!project) throw new Error("Project not found")
    if (project.userId !== userId) throw new Error("Access denied")
}

function buildDesignPrompt(planName: string, plan: NonNullable<Awaited<ReturnType<typeof getProjectPlanByProjectId>>>["plan"]): string {
    return [
        `Design a production-grade desktop web app screen for "${planName}".`,
        `App summary: ${plan.appSummary}`,
        `Target user: ${plan.targetUser}`,
        `Primary routes: ${plan.routes.map((route) => `${route.name} (${route.path}) - ${route.purpose}`).join("; ")}`,
        `UI requirements: ${plan.uiRequirements.join("; ")}`,
        `Core actions: ${plan.routes.flatMap((route) => route.primaryActions).slice(0, 8).join("; ")}`,
        "Create a full first-screen product experience, not a marketing landing page.",
        "Use realistic content, clear navigation, dense but readable product UI, and responsive structure.",
    ].join("\n")
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const authResult = await verifyAuthToken(request)
        if (isAuthError(authResult)) return unauthorizedResponse(authResult)
        if (!process.env.STITCH_API_KEY) {
            return NextResponse.json({ error: "STITCH_API_KEY is not configured." }, { status: 400 })
        }

        const { projectId } = await params
        await verifyOwnership(projectId, authResult.userId)

        const planDoc = await getProjectPlanByProjectId(projectId)
        if (!planDoc || planDoc.status !== "approved") {
            return NextResponse.json({ error: "Approve the project plan before generating UI." }, { status: 409 })
        }

        await setProjectStage(projectId, "designing")
        const existingArtifacts = await getDesignArtifacts(projectId)
        const existingStitchProjectId = existingArtifacts[0]?.stitchProjectId
        const stitch = getStitchService()
        const project = await stitch.ensureProject(existingStitchProjectId, planDoc.plan.metadata.productName)
        const generated = await stitch.generateScreen({
            projectId: project.projectId,
            prompt: buildDesignPrompt(planDoc.plan.metadata.productName, planDoc.plan),
        })
        const htmlSnapshot = normalizeHtmlDocument(generated.html, generated.metadata.name || planDoc.plan.metadata.productName)

        const artifact = await createDesignArtifact({
            projectId,
            provider: "stitch",
            stitchProjectId: project.projectId,
            screenId: generated.metadata.screenId,
            name: generated.metadata.name || "Generated screen",
            imageUrl: generated.metadata.imageUrl,
            htmlUrl: generated.metadata.htmlUrl,
            htmlSnapshot,
            status: "generated",
        })

        return NextResponse.json({
            ...artifact,
            createdAt: timestampToISO(artifact.createdAt),
            approvedAt: artifact.approvedAt ? timestampToISO(artifact.approvedAt) : undefined,
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to generate UI"
        const status = message.includes("Access denied") ? 403 : message.includes("not found") ? 404 : 500
        return NextResponse.json({ error: message }, { status })
    }
}
