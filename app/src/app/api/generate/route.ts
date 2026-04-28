import { NextRequest, NextResponse } from "next/server"
import { Timestamp } from "firebase-admin/firestore"
import { verifyAuthToken, isAuthError, unauthorizedResponse } from "../blueprints/auth"
import { addMessage, getProject, getProjectPlanByProjectId, upsertProjectPlan, updateProject } from "@/lib/firebase/collections"
import { generateFromMessage } from "./service"
import { log, logError, logInfo, logWarn } from "@/lib/logger"
import { sanitizeInputForLLM, detectPII } from "@/lib/sanitize"
import { estimateMessageTokens } from "@/lib/tokenCounter"
import { checkBudgetLimit, recordUsage } from "@/lib/costTracking"

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

    entry.count++
    return null
}

export async function POST(request: NextRequest) {
    const startTime = Date.now()
    let userId = "unknown"
    let projectId: string | undefined

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
        const message = typeof body.message === "string" ? body.message : ""
        const context = Array.isArray(body.context) ? body.context : undefined
        projectId = typeof body.projectId === "string" ? body.projectId : undefined
        const forceRegenerate = body.forceRegenerate === true

        if (!message.trim()) {
            return NextResponse.json({ error: "Message required" }, { status: 400 })
        }

        let existingPlan = null
        if (projectId) {
            const project = await getProject(projectId)
            if (!project) {
                return NextResponse.json({ error: "Project not found" }, { status: 404 })
            }
            if (project.userId !== userId) {
                return NextResponse.json({ error: "Access denied" }, { status: 403 })
            }
            existingPlan = await getProjectPlanByProjectId(projectId)
        }

        if (typeof message !== "string" || message.length > 10000) {
            return NextResponse.json(
                { error: "Message too long. Please keep messages under 10,000 characters." },
                { status: 400 }
            )
        }

        const sanitizedMessage = sanitizeInputForLLM(message)
        const piiResult = detectPII(message)
        if (piiResult.hasPII) {
            logWarn("pii_detected", {
                userId,
                projectId,
                types: piiResult.types,
            })
        }

        const estimatedTokens = estimateMessageTokens([
            { role: "user", content: sanitizedMessage },
        ]) + 1800

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
            action: "generate_request",
            userId,
            projectId,
            details: {
                hasExistingPlan: !!existingPlan,
                messageLength: sanitizedMessage.length,
                estimatedTokens,
            },
        })

        const result = await generateFromMessage({
            message: sanitizedMessage,
            context,
            currentPlan: forceRegenerate ? null : existingPlan?.plan ?? null,
        })

        const responseTokens = estimateMessageTokens([
            { role: "assistant", content: result.rawContent },
        ])
        const model = result.modelUsed || process.env.OPENROUTER_MODEL_PRD || process.env.OPENROUTER_MODEL || "openai/gpt-5.4-mini"
        await recordUsage(userId, estimatedTokens, responseTokens, model)

        if (projectId) {
            await addMessage(projectId, {
                role: "user",
                content: message,
                intent: existingPlan ? "discussion" : "clarification",
                timestamp: Timestamp.now(),
            })

            await addMessage(projectId, {
                role: "assistant",
                content: result.intent === "clarification" ? result.rawContent : result.message,
                intent: result.intent,
                timestamp: Timestamp.now(),
            })

            if (result.intent === "initial" && result.projectPlan) {
                await upsertProjectPlan(projectId, result.projectPlan)
                logInfo("project_plan_created", { projectId })
            }

            if (result.intent === "initial" && result.productName) {
                await updateProject(projectId, { name: result.productName })
            }
        }

        const duration = Date.now() - startTime
        log({
            level: "info",
            action: "generate_success",
            userId,
            projectId,
            details: {
                durationMs: duration,
                intent: result.intent,
                hasProjectPlan: !!result.projectPlan,
            },
        })

        return NextResponse.json({
            intent: result.intent,
            message: result.message,
            ...(result.questions ? { questions: result.questions } : {}),
            ...(result.remainingRequired !== undefined ? { remainingRequired: result.remainingRequired } : {}),
            ...(result.stage ? { stage: result.stage } : {}),
            ...(result.projectPlan ? { projectPlan: result.projectPlan } : {}),
            ...(result.productName ? { productName: result.productName } : {}),
        })
    } catch (error) {
        logError("generate_failed", {
            userId,
            projectId,
            error: error instanceof Error ? error.message : "Unknown error",
            durationMs: Date.now() - startTime,
        })

        return NextResponse.json(
            { error: "Something went wrong. Please try again." },
            { status: 500 }
        )
    }
}
