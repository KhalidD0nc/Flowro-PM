// SSE Streaming helper for real-time LLM responses
// Enables ChatGPT-like typing effect instead of 30-second spinner

import { generateCompletion, Message } from "./openrouter"

export interface StreamChunk {
  type: "chunk" | "done" | "error"
  content?: string
  rawContent?: string
  error?: string
}

export interface StreamOptions {
  messages: Message[]
  model?: string
  maxTokens?: number
}

/**
 * Async generator that yields streaming chunks from OpenRouter
 * Usage: for await (const chunk of generateStream(messages)) { ... }
 */
export async function* generateStream(options: StreamOptions): AsyncGenerator<StreamChunk> {
  const { messages, model = "deepseek/deepseek-v3.2", maxTokens = 4000 } = options

  try {
    // Request streaming from OpenRouter
    const response = await generateCompletion({
      messages,
      stream: true,
      reasoning: false, // Disable reasoning for streaming (simpler)
      maxTokens
    })

    if (!response.ok) {
      const errorText = await response.text()
      yield {
        type: "error",
        error: `Stream failed (${response.status}): ${errorText.substring(0, 200)}`
      }
      return
    }

    // Read SSE stream
    const reader = response.body?.getReader()
    if (!reader) {
      yield { type: "error", error: "No stream reader available" }
      return
    }

    const decoder = new TextDecoder()
    let accumulated = ""

    // Read chunks until stream ends
    while (true) {
      const { done, value } = await reader.read()

      if (done) break

      const chunk = decoder.decode(value, { stream: true })

      // Parse SSE format: "data: {...}\n\n"
      const lines = chunk.split('\n').filter(line => line.trim())

      for (const line of lines) {
        // Skip lines that aren't data lines
        if (!line.startsWith('data: ')) continue

        const data = line.slice(6) // Remove "data: " prefix

        // Check for end marker
        if (data === '[DONE]') {
          yield { type: "done", rawContent: accumulated }
          return
        }

        // Try to parse JSON chunk
        try {
          const parsed = JSON.parse(data)

          // OpenRouter streaming format: choices[0].delta.content
          if (parsed.choices?.[0]?.delta?.content) {
            const content = parsed.choices[0].delta.content
            accumulated += content

            // Yield individual chunk for real-time display
            yield {
              type: "chunk",
              content,
              rawContent: accumulated
            }
          }
        } catch (parseError) {
          // Not valid JSON yet, continue
          // (partial chunk in stream)
        }
      }
    }

    // Stream completed successfully
    yield { type: "done", rawContent: accumulated }

  } catch (error) {
    process.stderr.write(`[stream] Generation error: ${error instanceof Error ? error.message : String(error)}\n`)
    yield {
      type: "error",
      error: error instanceof Error ? error.message : "Unknown stream error"
    }
  }
}

/**
 * Parse accumulated stream content into structured result
 * Handles both partial and complete JSON
 */
export function parseStreamContent(rawContent: string): {
  isComplete: boolean
  intent?: string
  message?: string
  content?: unknown
  error?: string
} {
  try {
    const parsed = JSON.parse(rawContent)

    // Check for required UBP fields
    if (parsed.intent && parsed.message) {
      return {
        isComplete: true,
        intent: parsed.intent,
        message: parsed.message,
        content: parsed.content
      }
    }

    // Partial content
    return {
      isComplete: false,
      content: rawContent
    }

  } catch {
    // Not valid JSON yet (streaming in progress)
    return {
      isComplete: false,
      error: "Incomplete JSON"
    }
  }
}

/**
 * Check if content is a complete UBP structure
 */
export function isCompleteUBP(content: unknown): boolean {
  if (!content || typeof content !== "object") return false

  const obj = content as Record<string, unknown>

  // Check for UBP signature keys
  const requiredKeys = ["productVision", "scope", "actors", "behaviors", "techStack"]
  return requiredKeys.some(key => key in obj)
}
