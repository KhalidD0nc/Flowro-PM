import { NextRequest } from "next/server"
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
import type { ProjectPlan, RoutePlan } from "@/lib/project-plan/schema"

async function verifyOwnership(projectId: string, userId: string): Promise<void> {
    const project = await getProject(projectId)
    if (!project) throw new Error("Project not found")
    if (project.userId !== userId) throw new Error("Access denied")
}

function buildRoutePrompt(route: RoutePlan, plan: ProjectPlan): string {
    return [
        `Design a production-grade desktop web app screen for "${plan.metadata.productName}".`,
        `Screen: ${route.name} (${route.path})`,
        `Purpose: ${route.purpose}`,
        `Primary actions: ${route.primaryActions.join(", ") || "Standard navigation and data display"}`,
        `App context: ${plan.appSummary}`,
        `Target user: ${plan.targetUser}`,
        `UI requirements: ${plan.uiRequirements.join("; ")}`,
        "Create a full, production-ready screen — not a landing page.",
        "Use realistic content, clear navigation, dense but readable product UI.",
    ].join("\n")
}

type StreamChunk =
    | { type: "start"; total: number }
    | { type: "progress"; current: number; total: number; route: string; status: "generating" | "done" | "failed" }
    | { type: "artifact"; artifact: Record<string, unknown> }
    | { type: "done"; generated: number; failed: number; errors: { route: string; error: string }[] }
    | { type: "error"; error: string }

function chunkToSSE(chunk: StreamChunk): string {
    return `data: ${JSON.stringify(chunk)}\n\n`
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    const authResult = await verifyAuthToken(request)
    if (isAuthError(authResult)) return unauthorizedResponse(authResult)
    if (!process.env.STITCH_API_KEY) {
        return new Response(
            `data: ${JSON.stringify({ type: "error", error: "STITCH_API_KEY is not configured." })}\n\n`,
            { headers: { "Content-Type": "text/event-stream" } }
        )
    }

    const { projectId } = await params

    try {
        await verifyOwnership(projectId, authResult.userId)
    } catch (error) {
        const message = error instanceof Error ? error.message : "Access denied"
        return new Response(
            `data: ${JSON.stringify({ type: "error", error: message })}\n\n`,
            { headers: { "Content-Type": "text/event-stream" } }
        )
    }

    const planDoc = await getProjectPlanByProjectId(projectId)
    if (!planDoc || planDoc.status !== "approved") {
        return new Response(
            `data: ${JSON.stringify({ type: "error", error: "Approve the project plan before generating UI." })}\n\n`,
            { headers: { "Content-Type": "text/event-stream" } }
        )
    }

    const routes = planDoc.plan.routes
    if (routes.length === 0) {
        return new Response(
            `data: ${JSON.stringify({ type: "error", error: "Project plan has no routes to generate." })}\n\n`,
            { headers: { "Content-Type": "text/event-stream" } }
        )
    }

    const encoder = new TextEncoder()

    const stream = new ReadableStream({
        async start(controller) {
            try {
                await setProjectStage(projectId, "designing")

                const existingArtifacts = await getDesignArtifacts(projectId)
                const existingStitchProjectId = existingArtifacts[0]?.stitchProjectId
                const stitch = getStitchService()
                const project = await stitch.ensureProject(existingStitchProjectId, planDoc.plan.metadata.productName)

                controller.enqueue(encoder.encode(chunkToSSE({ type: "start", total: routes.length })))

                const generated: Record<string, unknown>[] = []
                const errors: { route: string; error: string }[] = []
                let failed = 0

                for (let i = 0; i < routes.length; i++) {
                    const route = routes[i]

                    controller.enqueue(
                        encoder.encode(
                            chunkToSSE({ type: "progress", current: i + 1, total: routes.length, route: route.name, status: "generating" })
                        )
                    )

                    try {
                        const result = await stitch.generateScreen({
                            projectId: project.projectId,
                            prompt: buildRoutePrompt(route, planDoc.plan),
                        })

                        const htmlSnapshot = normalizeHtmlDocument(result.html, result.metadata.name || route.name)

                        const artifact = await createDesignArtifact({
                            projectId,
                            provider: "stitch",
                            stitchProjectId: project.projectId,
                            screenId: result.metadata.screenId,
                            name: result.metadata.name || route.name,
                            imageUrl: result.metadata.imageUrl,
                            htmlUrl: result.metadata.htmlUrl,
                            htmlSnapshot,
                            status: "generated",
                        })

                        generated.push({
                            ...artifact,
                            createdAt: timestampToISO(artifact.createdAt),
                            approvedAt: artifact.approvedAt ? timestampToISO(artifact.approvedAt) : undefined,
                        })

                        controller.enqueue(
                            encoder.encode(
                                chunkToSSE({
                                    type: "artifact",
                                    artifact: generated[generated.length - 1],
                                })
                            )
                        )

                        controller.enqueue(
                            encoder.encode(
                                chunkToSSE({ type: "progress", current: i + 1, total: routes.length, route: route.name, status: "done" })
                            )
                        )
                    } catch (error) {
                        failed += 1
                        const message = error instanceof Error ? error.message : "Unknown error"
                        errors.push({ route: route.name, error: message })

                        controller.enqueue(
                            encoder.encode(
                                chunkToSSE({ type: "progress", current: i + 1, total: routes.length, route: route.name, status: "failed" })
                            )
                        )
                    }
                }

                controller.enqueue(
                    encoder.encode(
                        chunkToSSE({
                            type: "done",
                            generated: generated.length,
                            failed,
                            errors,
                        })
                    )
                )

                controller.close()
            } catch (error) {
                const message = error instanceof Error ? error.message : "Failed to generate screens"
                controller.enqueue(encoder.encode(chunkToSSE({ type: "error", error: message })))
                controller.close()
            }
        },
    })

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    })
}
