import { NextRequest, NextResponse } from "next/server"
import { Timestamp } from "firebase-admin/firestore"
import { verifyAuthToken, isAuthError, unauthorizedResponse } from "../blueprints/auth"
import { addMessage, getPrdByProjectId, getProject, upsertPrd, updateProject } from "@/lib/firebase/collections"
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

        if (!message.trim()) {
            return NextResponse.json({ error: "Message required" }, { status: 400 })
        }

        let existingPrd = null
        if (projectId) {
            const project = await getProject(projectId)
            if (!project) {
                return NextResponse.json({ error: "Project not found" }, { status: 404 })
            }
            if (project.userId !== userId) {
                return NextResponse.json({ error: "Access denied" }, { status: 403 })
            }
            existingPrd = await getPrdByProjectId(projectId)
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
                hasExistingPrd: !!existingPrd,
                messageLength: sanitizedMessage.length,
                estimatedTokens,
            },
        })

        const result = await generateFromMessage({
            message: sanitizedMessage,
            context,
            currentPrd: existingPrd?.config ?? null,
        })

        const responseTokens = estimateMessageTokens([
            { role: "assistant", content: result.rawContent },
        ])
        const model = process.env.OPENROUTER_MODEL || "deepseek/deepseek-chat"
        await recordUsage(userId, estimatedTokens, responseTokens, model)

        if (projectId) {
            await addMessage(projectId, {
                role: "user",
                content: message,
                intent: "discussion",
                timestamp: Timestamp.now(),
            })

            await addMessage(projectId, {
                role: "assistant",
                content: result.message,
                intent: result.intent,
                timestamp: Timestamp.now(),
            })

            if (result.intent === "initial" && result.prdConfig && !existingPrd) {
                await upsertPrd(projectId, result.prdConfig)
                logInfo("prd_created", { projectId })
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
                hasPrdConfig: !!result.prdConfig,
            },
        })

        return NextResponse.json({
            intent: result.intent,
            message: result.message,
            ...(result.prdConfig ? { prdConfig: result.prdConfig } : {}),
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
