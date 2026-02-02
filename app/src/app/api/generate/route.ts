import { NextRequest, NextResponse } from "next/server"
import { Timestamp } from "firebase-admin/firestore"
import { verifyAuthToken, isAuthError, unauthorizedResponse } from "../blueprints/auth"
import { getProject, addMessage, getBlueprintByProjectId, upsertBlueprintFromAI, updateProject } from "@/lib/firebase/collections"
import { timestampToISO, type UBPContent } from "@/lib/firebase/schema"
import { generateFromMessage as originalGenerateFromMessage } from "./service"
import { generateFromMessageWithLangChain, shouldUseLangChain } from "./langchainService"
import { OpenRouterError } from "@/lib/openrouter"
import { log, logInfo, logError, logWarn } from "@/lib/logger"
import { sanitizeInputForLLM, detectPII } from "@/lib/sanitize"
import { estimateMessageTokens } from "@/lib/tokenCounter"
import { checkBudgetLimit, recordUsage } from "@/lib/costTracking"

// =============================================================================
// Dynamic Service Selection (Phase 2: LangChain Integration)
// =============================================================================

/**
 * Selects the appropriate generation service based on feature flags.
 * 
 * When USE_LANGCHAIN=true or LANGCHAIN_ROLLOUT_PERCENT > 0:
 * - Uses LangChain-based service with intent detection
 * - Falls back to original service on errors
 * 
 * Otherwise uses original OpenRouter service directly.
 */
function getGenerateService(userId: string) {
    if (shouldUseLangChain(userId)) {
        logInfo('using_langchain_service', { userId })
        return (input: Parameters<typeof originalGenerateFromMessage>[0]) =>
            generateFromMessageWithLangChain(input, { userId })
    }
    return originalGenerateFromMessage
}

// =============================================================================
// Simple In-Memory Rate Limiting
// =============================================================================

interface RateLimitEntry {
    count: number
    resetTime: number
}

// Rate limit: 20 requests per minute per user
const RATE_LIMIT = {
    maxRequests: 20,
    windowMs: 60 * 1000, // 1 minute
}

// In-memory store (resets on server restart - use Redis for production scale)
const rateLimitStore = new Map<string, RateLimitEntry>()

/**
 * Check and update rate limit for a user
 * Returns null if allowed, or remaining seconds until reset if rate limited
 */
function checkRateLimit(userId: string): number | null {
    const now = Date.now()
    const entry = rateLimitStore.get(userId)

    // Clean up expired entries periodically
    if (rateLimitStore.size > 1000) {
        for (const [key, value] of rateLimitStore.entries()) {
            if (value.resetTime < now) {
                rateLimitStore.delete(key)
            }
        }
    }

    if (!entry || entry.resetTime < now) {
        // New window
        rateLimitStore.set(userId, {
            count: 1,
            resetTime: now + RATE_LIMIT.windowMs,
        })
        return null
    }

    if (entry.count >= RATE_LIMIT.maxRequests) {
        // Rate limited
        return Math.ceil((entry.resetTime - now) / 1000)
    }

    // Increment count
    entry.count++
    return null
}

// =============================================================================
// API Route Handler
// =============================================================================

export async function POST(request: NextRequest) {
    const startTime = Date.now()
    let userId = "unknown"
    let projectId: string | undefined

    try {
        // 1. Verify Firebase token
        const authResult = await verifyAuthToken(request)

        if (isAuthError(authResult)) {
            logWarn("auth_failed", { reason: authResult.error })
            return unauthorizedResponse(authResult)
        }

        userId = authResult.userId

        // 2. Check rate limit
        const rateLimitSeconds = checkRateLimit(authResult.userId)
        if (rateLimitSeconds !== null) {
            logWarn("rate_limited", { userId, retryAfter: rateLimitSeconds })
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

        // 3. Parse request body
        const body = await request.json()
        const { message, context } = body
        projectId = body.projectId

        if (!message) {
            return NextResponse.json({ error: "Message required" }, { status: 400 })
        }

        // 4. AUTHORIZATION CHECK - Must happen before ANY data retrieval
        // Verify project ownership if projectId provided
        if (projectId) {
            const project = await getProject(projectId)
            if (!project) {
                logWarn("project_not_found", { userId, projectId })
                return NextResponse.json({ error: "Project not found" }, { status: 404 })
            }
            if (project.userId !== authResult.userId) {
                logWarn("unauthorized_project_access", { userId, projectId, ownerId: project.userId })
                return NextResponse.json({ error: "Access denied" }, { status: 403 })
            }
        }

        // 5. Validate message length (prevent abuse)
        if (typeof message !== "string" || message.length > 10000) {
            logWarn("message_too_long", { userId, length: message?.length })
            return NextResponse.json(
                { error: "Message too long. Please keep messages under 10,000 characters." },
                { status: 400 }
            )
        }

        // 6. Sanitize input and check for PII
        const sanitizedMessage = sanitizeInputForLLM(message)
        const piiResult = detectPII(message)

        if (piiResult.hasPII) {
            logWarn("pii_detected", {
                userId,
                projectId,
                types: piiResult.types
            })
            // We continue but log the warning - PII was already redacted by sanitizeInputForLLM
        }

        // 7. Estimate tokens and check budget
        const estimatedTokens = estimateMessageTokens([
            { role: "system", content: "" }, // System prompt ~900 tokens
            { role: "user", content: sanitizedMessage }
        ]) + 1500 // Add buffer for system prompt and expected response

        const budgetCheck = await checkBudgetLimit(userId, estimatedTokens)
        if (!budgetCheck.allowed) {
            logWarn("budget_exceeded", {
                userId,
                projectId,
                reason: budgetCheck.reason
            })
            return NextResponse.json(
                {
                    error: budgetCheck.reason,
                    budgetExceeded: true
                },
                { status: 429 }
            )
        }

        // 8. Log request start
        log({
            level: "info",
            action: "generate_request",
            userId,
            projectId,
            details: {
                messageLength: sanitizedMessage.length,
                estimatedTokens,
                hasContext: !!context,
                contextLength: context?.length || 0
            }
        })

        // 9. Get current blueprint if projectId provided (for context)
        // Authorization already verified in step 4
        let currentBlueprint: UBPContent | null = null
        if (projectId) {
            const blueprint = await getBlueprintByProjectId(projectId)
            if (blueprint?.content) {
                currentBlueprint = blueprint.content
            }
        }

        // 10. Generate response from LLM with full context
        // Phase 2: Uses LangChain service when enabled via feature flag
        const generateFromMessage = getGenerateService(userId)
        const result = await generateFromMessage({
            message: sanitizedMessage,
            context,
            currentBlueprint
        })

        // 11. Record usage for cost tracking
        const responseTokens = estimateMessageTokens([
            { role: "assistant", content: result.rawContent }
        ])
        const model = process.env.OPENROUTER_MODEL || "deepseek/deepseek-v3.2"
        await recordUsage(userId, estimatedTokens, responseTokens, model)

        // 12. Save messages to subcollection and handle blueprint auto-versioning
        // Authorization already verified in step 4 - projectId access is guaranteed
        let userMessageId: string | undefined
        let assistantMessageId: string | undefined

        if (projectId) {
            // Add user message to subcollection
                const userMsg = await addMessage(projectId, {
                    role: "user",
                    content: message,
                    intent: "discussion", // User messages are always discussion
                    timestamp: Timestamp.now(),
                })
                userMessageId = userMsg.id

                // Add assistant message to subcollection
                const assistantMsg = await addMessage(projectId, {
                    role: "assistant",
                    content: result.rawContent,
                    intent: result.intent,
                    proposedChanges: result.proposedChanges ? result.proposedChanges.changes as Partial<UBPContent> : undefined,
                    timestamp: Timestamp.now(),
                })
                assistantMessageId = assistantMsg.id

                // Auto-versioning: Update blueprint on initial or proposal intents
                if ((result.intent === "initial" || result.intent === "proposal") && result.content) {
                    try {
                        const ubpContent = result.content as UBPContent
                        await upsertBlueprintFromAI(
                            projectId,
                            ubpContent,
                            assistantMessageId,
                            result.proposedChanges?.summary || `AI ${result.intent} update`
                        )
                        logInfo("blueprint_auto_versioned", {
                            projectId,
                            intent: result.intent,
                            messageId: assistantMessageId
                        })
                    } catch (err) {
                        // Blueprint update failed but chat was saved - log and continue
                        logError("blueprint_update_failed", {
                            projectId,
                            error: err instanceof Error ? err.message : "Unknown"
                        })
                    }
                }

                // Update project name if AI suggested one (initial generation)
                if (result.intent === "initial" && result.productName) {
                    try {
                        await updateProject(projectId, { name: result.productName })
                        logInfo("project_name_updated", { projectId, name: result.productName })
                    } catch (err) {
                        logError("project_name_update_failed", {
                            projectId,
                            error: err instanceof Error ? err.message : "Unknown"
                        })
                    }
                }
        }

        // 13. Log success
        const duration = Date.now() - startTime
        log({
            level: "info",
            action: "generate_success",
            userId,
            projectId,
            details: {
                intent: result.intent,
                responseLength: result.rawContent.length,
                durationMs: duration,
                hasProposedChanges: !!result.proposedChanges
            }
        })

        // 14. Return the full response with intent for frontend handling
        return NextResponse.json({
            intent: result.intent,
            message: result.message,
            content: result.content,
            proposedChanges: result.proposedChanges,
            productName: result.productName, // Include product name so frontend can update UI
        })

    } catch (error) {
        const duration = Date.now() - startTime

        logError("generate_failed", {
            userId,
            projectId,
            error: error instanceof Error ? error.message : "Unknown error",
            durationMs: duration
        })

        // Handle OpenRouterError with user-friendly messages
        if (error instanceof OpenRouterError) {
            const statusCode = error.errorType === "rate_limit" ? 429
                : error.errorType === "auth" ? 503
                    : error.errorType === "timeout" ? 504
                        : 502 // Bad gateway for upstream errors

            return NextResponse.json(
                {
                    error: error.message,
                    errorType: error.errorType,
                    retryable: error.retryable,
                },
                { status: statusCode }
            )
        }

        // Generic error
        return NextResponse.json(
            { error: "Something went wrong. Please try again." },
            { status: 500 }
        )
    }
}
