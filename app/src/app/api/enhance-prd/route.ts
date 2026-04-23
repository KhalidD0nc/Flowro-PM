import { NextRequest, NextResponse } from "next/server"
import { Timestamp } from "firebase-admin/firestore"
import { verifyAuthToken, isAuthError, unauthorizedResponse } from "../blueprints/auth"
import { addMessage, getProject } from "@/lib/firebase/collections"
import { logError, logInfo, logWarn } from "@/lib/logger"
import { sanitizeInputForLLM, detectPII } from "@/lib/sanitize"
import { prdConfigSchema } from "@/lib/prd/schema"
import { enhancePrdFromMessage } from "./service"
import { timestampToISO } from "@/lib/firebase/schema"

async function verifyOwnership(projectId: string, userId: string): Promise<void> {
    const project = await getProject(projectId)
    if (!project) {
        throw new Error("Project not found")
    }

    if (project.userId !== userId) {
        throw new Error("Access denied")
    }
}

export async function POST(request: NextRequest) {
    let userId = "unknown"
    let projectId = "unknown"

    try {
        const authResult = await verifyAuthToken(request)
        if (isAuthError(authResult)) {
            return unauthorizedResponse(authResult)
        }

        userId = authResult.userId
        const body = await request.json()
        projectId = typeof body.projectId === "string" ? body.projectId : ""
        const prompt = typeof body.prompt === "string" ? body.prompt : ""
        const context = Array.isArray(body.context) ? body.context : undefined
        const currentPrdResult = prdConfigSchema.safeParse(body.currentPrd)

        if (!projectId) {
            return NextResponse.json({ error: "projectId is required" }, { status: 400 })
        }

        if (!prompt.trim()) {
            return NextResponse.json({ error: "prompt is required" }, { status: 400 })
        }

        if (!currentPrdResult.success) {
            return NextResponse.json(
                {
                    error: "Invalid PRD payload",
                    issues: currentPrdResult.error.issues,
                },
                { status: 400 }
            )
        }

        await verifyOwnership(projectId, userId)

        const sanitizedPrompt = sanitizeInputForLLM(prompt)
        const piiResult = detectPII(prompt)
        if (piiResult.hasPII) {
            logWarn("enhance_prd_pii_detected", {
                userId,
                projectId,
                types: piiResult.types,
            })
        }

        const result = await enhancePrdFromMessage({
            prompt: sanitizedPrompt,
            currentPrd: currentPrdResult.data,
            context,
        })

        const userMessage = await addMessage(projectId, {
            role: "user",
            content: prompt,
            intent: "discussion",
            timestamp: Timestamp.now(),
        })

        const assistantMessage = await addMessage(projectId, {
            role: "assistant",
            content: result.message,
            intent: result.intent,
            proposedChanges: result.proposedChanges,
            timestamp: Timestamp.now(),
        })

        logInfo("enhance_prd_success", {
            userId,
            projectId,
            intent: result.intent,
            hasProposal: !!result.proposedChanges,
        })

        return NextResponse.json({
            intent: result.intent,
            message: result.message,
            ...(result.proposedChanges ? { proposedChanges: result.proposedChanges } : {}),
            userMessage: {
                id: userMessage.id,
                role: userMessage.role,
                content: userMessage.content,
                intent: userMessage.intent,
                timestamp: timestampToISO(userMessage.timestamp),
            },
            assistantMessage: {
                id: assistantMessage.id,
                role: assistantMessage.role,
                content: assistantMessage.content,
                intent: assistantMessage.intent,
                proposedChanges: assistantMessage.proposedChanges,
                timestamp: timestampToISO(assistantMessage.timestamp),
            },
        })
    } catch (error) {
        logError("enhance_prd_failed", {
            userId,
            projectId,
            error: error instanceof Error ? error.message : "Unknown error",
        })

        const message = error instanceof Error ? error.message : "Failed to enhance PRD"
        const status = message.includes("Access denied") ? 403 : message.includes("not found") ? 404 : 500
        return NextResponse.json({ error: message }, { status })
    }
}
