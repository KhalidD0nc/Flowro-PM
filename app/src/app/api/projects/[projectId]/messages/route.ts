import { NextRequest, NextResponse } from "next/server"
import { Timestamp } from "firebase-admin/firestore"
import { verifyAuthToken, isAuthError, unauthorizedResponse } from "../../../blueprints/auth"
import {
    getProject,
    addMessage,
    getMessages,
    getMessagesPaginated,
} from "@/lib/firebase/collections"
import {
    timestampToISO,
    type MessageIntent,
    type MessageRole,
    type UBPContent,
    type ProposedChanges,
} from "@/lib/firebase/schema"

// Pagination safety constants
const PAGINATION = {
    DEFAULT_PAGE_SIZE: 50,
    MIN_PAGE_SIZE: 1,
    MAX_PAGE_SIZE: 100,
    MAX_ALL_MESSAGES: 500, // Hard cap for all=true requests
} as const

/**
 * Validate and clamp pagination page size to safe range.
 * Returns a safe integer between MIN and MAX, defaulting if invalid.
 */
function validatePageSize(input: string | null): number {
    const parsed = parseInt(input || "", 10)
    
    // If NaN, undefined, or invalid, use default
    if (!Number.isFinite(parsed) || parsed < PAGINATION.MIN_PAGE_SIZE) {
        return PAGINATION.DEFAULT_PAGE_SIZE
    }
    
    // Clamp to max
    return Math.min(parsed, PAGINATION.MAX_PAGE_SIZE)
}

/**
 * Verify that the authenticated user owns the project
 */
async function verifyOwnership(projectId: string, userId: string): Promise<void> {
    const project = await getProject(projectId)
    if (!project) {
        throw new Error("Project not found")
    }
    if (project.userId !== userId) {
        throw new Error("Access denied: you do not own this project")
    }
}

/**
 * GET /api/projects/[projectId]/messages - Fetch messages with pagination
 * 
 * Query Parameters:
 * - pageSize: Number of messages to return (default: 50)
 * - cursor: Message ID to start after (for pagination)
 * - all: If "true", returns all messages without pagination
 * 
 * @returns { messages: MessageDocument[], hasMore: boolean, nextCursor?: string }
 */
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
        const { searchParams } = new URL(request.url)
        
        // Verify ownership
        await verifyOwnership(projectId, authResult.userId)

        // Check if requesting all messages
        const fetchAll = searchParams.get("all") === "true"

        if (fetchAll) {
            // Return messages with hard cap (for initial chat load)
            const allMessages = await getMessages(projectId)
            
            // Apply hard cap to prevent unbounded responses
            const cappedMessages = allMessages.slice(-PAGINATION.MAX_ALL_MESSAGES)
            const wasTruncated = allMessages.length > PAGINATION.MAX_ALL_MESSAGES
            
            return NextResponse.json({
                messages: cappedMessages.map((msg) => ({
                    id: msg.id,
                    role: msg.role,
                    content: msg.content,
                    intent: msg.intent,
                    proposedChanges: msg.proposedChanges,
                    timestamp: timestampToISO(msg.timestamp),
                })),
                hasMore: wasTruncated, // Indicate older messages exist if truncated
            })
        }

        // Paginated fetch with validated inputs
        const pageSize = validatePageSize(searchParams.get("pageSize"))
        const cursor = searchParams.get("cursor") || undefined

        const result = await getMessagesPaginated(projectId, pageSize, cursor)

        return NextResponse.json({
            messages: result.messages.map((msg) => ({
                id: msg.id,
                role: msg.role,
                content: msg.content,
                intent: msg.intent,
                proposedChanges: msg.proposedChanges,
                timestamp: timestampToISO(msg.timestamp),
            })),
            hasMore: result.hasMore,
            nextCursor: result.nextCursor,
        })
    } catch (error) {
        console.error("Get messages error:", error)
        const message = error instanceof Error ? error.message : "Failed to get messages"
        const status = message.includes("Access denied")
            ? 403
            : message.includes("not found")
              ? 404
              : 500
        return NextResponse.json({ error: message }, { status })
    }
}

/**
 * POST /api/projects/[projectId]/messages - Add message to subcollection
 * 
 * @body {
 *   role: "user" | "assistant",
 *   content: string,
 *   intent: "initial" | "discussion" | "proposal",
 *   proposedChanges?: Partial<UBPContent>
 * }
 * @returns MessageDocument with ISO timestamp
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const authResult = await verifyAuthToken(request)

        if (isAuthError(authResult)) {
            return unauthorizedResponse(authResult)
        }

        const { projectId } = await params
        const body = await request.json()

        // Validate required fields
        const { role, content, intent, proposedChanges } = body as {
            role?: MessageRole
            content?: string
            intent?: MessageIntent
            proposedChanges?: Partial<UBPContent> | ProposedChanges
        }

        if (!role || !["user", "assistant"].includes(role)) {
            return NextResponse.json(
                { error: "Invalid or missing 'role'. Must be 'user' or 'assistant'." },
                { status: 400 }
            )
        }

        if (!content || typeof content !== "string") {
            return NextResponse.json(
                { error: "Invalid or missing 'content'. Must be a non-empty string." },
                { status: 400 }
            )
        }

        if (!intent || !["initial", "discussion", "proposal"].includes(intent)) {
            return NextResponse.json(
                { error: "Invalid or missing 'intent'. Must be 'initial', 'discussion', or 'proposal'." },
                { status: 400 }
            )
        }

        // Verify ownership
        await verifyOwnership(projectId, authResult.userId)

        // Create message in subcollection
        const message = await addMessage(projectId, {
            role,
            content,
            intent,
            proposedChanges,
            timestamp: Timestamp.now(),
        })

        return NextResponse.json({
            id: message.id,
            role: message.role,
            content: message.content,
            intent: message.intent,
            proposedChanges: message.proposedChanges,
            timestamp: timestampToISO(message.timestamp),
        })
    } catch (error) {
        console.error("Add message error:", error)
        const message = error instanceof Error ? error.message : "Failed to add message"
        const status = message.includes("Access denied")
            ? 403
            : message.includes("not found")
              ? 404
              : 500
        return NextResponse.json({ error: message }, { status })
    }
}
