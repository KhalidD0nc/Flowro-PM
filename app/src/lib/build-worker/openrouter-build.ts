import { generateCompletion, type Message } from "@/lib/openrouter"

const BUILD_MODEL = process.env.OPENROUTER_MODEL_BUILD || "moonshotai/kimi-k2"
const BUILD_MAX_TOKENS = 12000
const BUILD_TIMEOUT_MS = 90000
const BUILD_MAX_RETRIES = 1

export interface BuildCompletionOptions {
    messages: Message[]
    maxTokens?: number
    timeoutMs?: number
    maxRetries?: number
    signal?: AbortSignal
    model?: string
}

/**
 * Generate a non-streaming completion for build tasks using the dedicated build model.
 */
export async function generateBuildCompletion(options: BuildCompletionOptions): Promise<string> {
    const response = await generateCompletion({
        messages: options.messages,
        stream: false,
        reasoning: false,
        maxTokens: options.maxTokens || BUILD_MAX_TOKENS,
        timeoutMs: options.timeoutMs || BUILD_TIMEOUT_MS,
        maxRetries: options.maxRetries ?? BUILD_MAX_RETRIES,
        signal: options.signal,
        model: options.model,
    })

    const data = await response.json()

    // Log the raw response shape for debugging (truncated)
    const dataStr = JSON.stringify(data)
    if (dataStr.length > 500) {
        console.log("[openrouter-build] Response preview:", dataStr.slice(0, 500), "...")
    } else {
        console.log("[openrouter-build] Response:", dataStr)
    }

    // Handle OpenRouter error-in-body format
    if (data.error) {
        throw new Error(`OpenRouter error: ${JSON.stringify(data.error)}`)
    }

    const content = data.choices?.[0]?.message?.content
    if (!content) {
        // Log full response for debugging when content is missing
        console.error("[openrouter-build] Empty content. Full response:", JSON.stringify(data, null, 2))
        throw new Error(`Empty response from build model. Model: ${process.env.OPENROUTER_MODEL || BUILD_MODEL}`)
    }
    return content as string
}

/**
 * Override the model for build completions by temporarily replacing the env var.
 * This is a workaround because generateCompletion reads from process.env.OPENROUTER_MODEL.
 */
export async function generateBuildCompletionWithModel(
    options: BuildCompletionOptions,
    model: string = BUILD_MODEL
): Promise<string> {
    return generateBuildCompletion({ ...options, model })
}

export const buildCompletionDefaults = {
    maxTokens: BUILD_MAX_TOKENS,
    timeoutMs: BUILD_TIMEOUT_MS,
    maxRetries: BUILD_MAX_RETRIES,
}
