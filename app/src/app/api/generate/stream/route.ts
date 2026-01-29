import { NextRequest } from "next/server"
import { verifyAuthToken, isAuthError, unauthorizedResponse } from "../../blueprints/auth"
import { generateStream, StreamChunk } from "@/lib/stream"
import { UBP_SYSTEM_PROMPT, Message } from "@/lib/openrouter"
import { logInfo, logError } from "@/lib/logger"

/**
 * POST /api/generate/stream
 * Server-Sent Events (SSE) endpoint for real-time LLM streaming
 * Returns streaming chunks instead of waiting for complete response
 *
 * Body: { messages: Message[] }
 */
export async function POST(request: NextRequest) {
  // 1. Verify Firebase token
  const authResult = await verifyAuthToken(request)

  if (isAuthError(authResult)) {
    return unauthorizedResponse(authResult)
  }

  // 2. Parse request body
  try {
    const body = await request.json()
    let { messages }: { messages: Message[] } = body

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "messages array is required" }),
        { status: 400 }
      )
    }

    // 2.5. Replace/inject the full UBP system prompt for proper blueprint generation
    // The client sends a simplified prompt, but we need the full one for UBP creation
    const hasSystemMessage = messages.length > 0 && messages[0].role === "system"
    if (hasSystemMessage) {
      // Replace the client's system prompt with the full UBP prompt
      messages = [
        { role: "system", content: UBP_SYSTEM_PROMPT },
        ...messages.slice(1)
      ]
    } else {
      // No system message - prepend the full UBP prompt
      messages = [
        { role: "system", content: UBP_SYSTEM_PROMPT },
        ...messages
      ]
    }

    // 3. Log streaming start
    logInfo("stream_start", {
      userId: authResult.userId,
      messageCount: messages.length,
      model: process.env.OPENROUTER_MODEL || "deepseek/deepseek-v3.2"
    })

    // 4. Create SSE stream
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const generator = generateStream({ messages })

          // Stream chunks to client
          for await (const chunk of generator) {
            const data = `data: ${JSON.stringify(chunk)}\n\n`
            controller.enqueue(encoder.encode(data))

            logInfo("stream_chunk", {
              userId: authResult.userId,
              chunkType: chunk.type,
              contentLength: chunk.content?.length || 0
            })

            // Close stream on completion or error
            if (chunk.type === "done" || chunk.type === "error") {
              logInfo("stream_complete", {
                userId: authResult.userId,
                result: chunk.type
              })
              controller.close()
              break
            }
          }
        } catch (error) {
          logError("stream_error", {
            userId: authResult.userId,
            error: error instanceof Error ? error.message : "Unknown error"
          })

          const errorData = JSON.stringify({
            type: "error",
            error: error instanceof Error ? error.message : "Stream failed"
          })
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
          controller.close()
        }
      }
    })

    // 5. Return SSE response with proper headers
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      }
    })

  } catch (error) {
    logError("stream_init_error", {
      userId: authResult.userId,
      error: error instanceof Error ? error.message : "Unknown error"
    })

    return new Response(
      JSON.stringify({ error: "Stream initialization failed" }),
      { status: 500 }
    )
  }
}
