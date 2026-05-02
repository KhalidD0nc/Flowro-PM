import { generateCompletion, type Message } from "@/lib/openrouter"

const BUILD_MODEL_PRIMARY = process.env.OPENROUTER_MODEL_BUILD || "moonshotai/kimi-k2.6"
const BUILD_MODEL_FALLBACKS = [
    "anthropic/claude-sonnet-4.6",
    "minimax/minimax-m2.7",
    "google/gemini-3-flash-preview",
]
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

export interface BuildCompletionResult {
    content: string
    model: string
}

/**
 * Generate a non-streaming completion for build tasks using the dedicated build model.
 */
export async function generateBuildCompletion(options: BuildCompletionOptions): Promise<string> {
    const model = options.model || BUILD_MODEL_PRIMARY
    const response = await generateCompletion({
        messages: options.messages,
        stream: false,
        reasoning: false,
        maxTokens: options.maxTokens || BUILD_MAX_TOKENS,
        timeoutMs: options.timeoutMs || BUILD_TIMEOUT_MS,
        maxRetries: options.maxRetries ?? BUILD_MAX_RETRIES,
        signal: options.signal,
        model,
    })

    const data = await response.json()

    const dataStr = JSON.stringify(data)
    if (dataStr.length > 500) {
        console.log("[openrouter-build] Response preview:", dataStr.slice(0, 500), "...")
    } else {
        console.log("[openrouter-build] Response:", dataStr)
    }

    if (data.error) {
        throw new Error(`OpenRouter error: ${JSON.stringify(data.error)}`)
    }

    const content = data.choices?.[0]?.message?.content
    if (!content) {
        console.error("[openrouter-build] Empty content. Full response:", JSON.stringify(data, null, 2))
        throw new Error(`Empty response from build model. Model: ${model}`)
    }
    return content as string
}

/**
 * Generate a completion with automatic model fallback chain.
 * Tries the primary model first, then falls back through the chain if it fails.
 */
export async function generateBuildCompletionWithFallback(
    options: BuildCompletionOptions,
): Promise<BuildCompletionResult> {
    const models = [options.model || BUILD_MODEL_PRIMARY, ...BUILD_MODEL_FALLBACKS]
    const errors: string[] = []

    for (const model of models) {
        try {
            console.log(`[openrouter-build] Trying model: ${model}`)
            const content = await generateBuildCompletion({ ...options, model })
            console.log(`[openrouter-build] Success with model: ${model} (${content.length} chars)`)
            return { content, model }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            console.warn(`[openrouter-build] Model ${model} failed: ${message}`)
            errors.push(`${model}: ${message}`)
            continue
        }
    }

    throw new Error(`All build models failed. Errors: ${errors.join("; ")}`)
}

/**
 * Override the model for build completions by temporarily replacing the env var.
 */
export async function generateBuildCompletionWithModel(
    options: BuildCompletionOptions,
    model: string = BUILD_MODEL_PRIMARY
): Promise<string> {
    return generateBuildCompletion({ ...options, model })
}

export const buildCompletionDefaults = {
    maxTokens: BUILD_MAX_TOKENS,
    timeoutMs: BUILD_TIMEOUT_MS,
    maxRetries: BUILD_MAX_RETRIES,
}
