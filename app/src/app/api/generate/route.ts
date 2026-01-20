import { NextRequest, NextResponse } from "next/server"
import { verifyAuthToken, isAuthError, unauthorizedResponse } from "../blueprints/auth"
import { getProjectById, updateProjectChatHistory, getLatestBlueprint, updateBlueprintContent, ChatMessage } from "../blueprints/service"
import { generateFromMessage } from "./service"
import { OpenRouterError } from "@/lib/openrouter"

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
    try {
        // 1. Verify Firebase token
        const authResult = await verifyAuthToken(request)

        if (isAuthError(authResult)) {
            return unauthorizedResponse(authResult)
        }

        // 2. Check rate limit
        const rateLimitSeconds = checkRateLimit(authResult.userId)
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

        // 3. Parse request body
        const body = await request.json()
        const { message, projectId, context } = body

        if (!message) {
            return NextResponse.json({ error: "Message required" }, { status: 400 })
        }

        // Validate message length (prevent abuse)
        if (typeof message !== "string" || message.length > 10000) {
            return NextResponse.json(
                { error: "Message too long. Please keep messages under 10,000 characters." },
                { status: 400 }
            )
        }

        // 4. Get current blueprint if projectId provided (for context)
        let currentBlueprint = null
        if (projectId) {
            const latestBp = await getLatestBlueprint(projectId)
            if (latestBp && latestBp.content) {
                currentBlueprint = latestBp.content
            }
        }

        // 5. Generate response from LLM with full context
        const result = await generateFromMessage({ message, context, currentBlueprint })

        // 6. Save chat history to Project (not Blueprint) if projectId provided
        if (projectId) {
            const project = await getProjectById(projectId)

            if (project && project.userId === authResult.userId) {
                const newMessages: ChatMessage[] = [
                    {
                        role: "user",
                        content: message,
                        timestamp: new Date().toISOString(),
                    },
                    {
                        role: "assistant",
                        content: result.rawContent,
                        timestamp: new Date().toISOString(),
                    },
                ]

                // Save chat history to project (continues even when blueprints are locked)
                await updateProjectChatHistory(projectId, newMessages)

                // Only update blueprint content on INITIAL intent (new UBP generation)
                // For discussions and proposals, we don't auto-update the blueprint
                if (result.intent === 'initial' && result.content) {
                    const latestBlueprint = await getLatestBlueprint(projectId)
                    if (latestBlueprint && latestBlueprint.status === "draft") {
                        try {
                            await updateBlueprintContent(latestBlueprint.id, result.content)
                        } catch {
                            // Blueprint might be locked, that's okay - chat still saved to project
                            console.log("Blueprint is locked, chat history saved to project only")
                        }
                    }
                }
            }
        }

        // 7. Return the full response with intent for frontend handling
        return NextResponse.json({
            intent: result.intent,
            message: result.message,
            content: result.content,
            proposedChanges: result.proposedChanges,
        })

    } catch (error) {
        console.error("Generate error:", error)

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
