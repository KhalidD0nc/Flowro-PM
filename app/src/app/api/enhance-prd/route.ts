import { NextRequest, NextResponse } from "next/server"
import { Timestamp } from "firebase-admin/firestore"
import { verifyAuthToken, isAuthError, unauthorizedResponse } from "../blueprints/auth"
import { addMessage, getProject } from "@/lib/firebase/collections"
import { log, logError, logInfo, logWarn } from "@/lib/logger"
import { sanitizeInputForLLM, detectPII } from "@/lib/sanitize"
import { prdConfigSchema } from "@/lib/prd/schema"
import { checkBudgetLimit, recordUsage } from "@/lib/costTracking"
import { getMaxTokensForIntent } from "@/lib/langchain/client"
import { estimateMessageTokens } from "@/lib/tokenCounter"
import { timestampToISO } from "@/lib/firebase/schema"
import { classifyEnhancementIntent, enhancePrdFromMessage } from "./service"

interface RateLimitEntry {
    count: number
    resetTime: number
}

const RATE_LIMIT = {
    maxRequests: 20,
    windowMs: 60 * 1000,
}

const rateLimitStore = new Map<string, RateLimitEntry>()

function checkRateLimit(userId: string): number | null {
    const now = Date.now()
    const entry = rateLimitStore.get(userId)

    if (rateLimitStore.size > 1000) {
        for (const [key, value] of rateLimitStore.entries()) {
            if (value.resetTime < now) {
                rateLimitStore.delete(key)
            }
        }
    }

    if (!entry || entry.resetTime < now) {
        rateLimitStore.set(userId, {
            count: 1,
            resetTime: now + RATE_LIMIT.windowMs,
        })
        return null
    }

    if (entry.count >= RATE_LIMIT.maxRequests) {
        return Math.ceil((entry.resetTime - now) / 1000)
    }

    entry.count += 1
    return null
}

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
    const startTime = Date.now()
    let userId = "unknown"
    let projectId = "unknown"

    try {
        const authResult = await verifyAuthToken(request)
        if (isAuthError(authResult)) {
            logWarn("auth_failed", { reason: authResult.error })
            return unauthorizedResponse(authResult)
        }

        userId = authResult.userId

        const rateLimitSeconds = checkRateLimit(userId)
        if (rateLimitSeconds !== null) {
            return NextResponse.json(
                {
                    error: `Too many requests. Please wait ${rateLimitSeconds} seconds before trying again.`,
                    retryAfter: rateLimitSeconds,
                },
                {
                    status: 429,
                    headers: {
                        "Retry-After": String(rateLimitSeconds),
                    },
                }
            )
        }

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

        if (prompt.length > 10000) {
            return NextResponse.json(
                { error: "Prompt too long. Please keep prompts under 10,000 characters." },
                { status: 400 }
            )
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
        const expectedIntent = classifyEnhancementIntent(sanitizedPrompt)
        const piiResult = detectPII(prompt)
        if (piiResult.hasPII) {
            logWarn("enhance_prd_pii_detected", {
                userId,
                projectId,
                types: piiResult.types,
            })
        }

        const estimatedTokens =
            estimateMessageTokens([{ role: "user", content: sanitizedPrompt }]) +
            getMaxTokensForIntent(expectedIntent)
        const budgetCheck = await checkBudgetLimit(userId, estimatedTokens)
        if (!budgetCheck.allowed) {
            return NextResponse.json(
                {
                    error: budgetCheck.reason,
                    budgetExceeded: true,
                },
                { status: 429 }
            )
        }

        log({
            level: "info",
            action: "enhance_prd_request",
            userId,
            projectId,
            details: {
                promptLength: sanitizedPrompt.length,
                estimatedTokens,
                expectedIntent,
            },
        })

        const result = await enhancePrdFromMessage({
            prompt: sanitizedPrompt,
            currentPrd: currentPrdResult.data,
            context,
        })

        const responseTokens = estimateMessageTokens([
            { role: "assistant", content: result.rawContent },
        ])
        const model = process.env.OPENROUTER_MODEL || "deepseek/deepseek-chat"
        await recordUsage(userId, estimatedTokens, responseTokens, model)

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
            durationMs: Date.now() - startTime,
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
            durationMs: Date.now() - startTime,
        })

        const message = error instanceof Error ? error.message : "Failed to enhance PRD"
        const status = message.includes("Access denied") ? 403 : message.includes("not found") ? 404 : 500
        return NextResponse.json({ error: message }, { status })
    }
}
