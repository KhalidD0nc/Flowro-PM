import { generateCompletion, type Message } from "@/lib/openrouter"

const BUILD_MODEL_PRIMARY = process.env.OPENROUTER_MODEL_BUILD || "moonshotai/kimi-k2.6"
const BUILD_MODEL_FALLBACKS = [
    "anthropic/claude-sonnet-4.6",
    "minimax/minimax-m2.7",
    "google/gemini-3-flash-preview",
]
const BUILD_MAX_TOKENS = 12000
const BUILD_MIN_TOKENS = 4000
const BUILD_TIMEOUT_MS = 90000
const BUILD_MAX_RETRIES = 1

export class EmptyCompletionError extends Error {
    constructor(public readonly model: string, public readonly finishReason: string | undefined) {
        super(`Empty response from build model. Model: ${model} (finish_reason=${finishReason ?? "unknown"})`)
        this.name = "EmptyCompletionError"
    }
}

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
    const requestedMaxTokens = Math.max(options.maxTokens || BUILD_MAX_TOKENS, BUILD_MIN_TOKENS)
    const response = await generateCompletion({
        messages: options.messages,
        stream: false,
        reasoning: false,
        maxTokens: requestedMaxTokens,
        timeoutMs: options.timeoutMs || BUILD_TIMEOUT_MS,
        maxRetries: options.maxRetries ?? BUILD_MAX_RETRIES,
        signal: options.signal,
        model,
    })

    const data = await response.json()

    if (data.error) {
        throw new Error(`OpenRouter error: ${JSON.stringify(data.error)}`)
    }

    const choice = data.choices?.[0]
    const content = choice?.message?.content
    const finishReason: string | undefined = choice?.finish_reason ?? choice?.native_finish_reason
    const reasoningTokens: number = data.usage?.completion_tokens_details?.reasoning_tokens ?? 0

    if (!content) {
        process.stderr.write(`[openrouter-build] Empty content (model=${model}, finish_reason=${finishReason}, reasoning_tokens=${reasoningTokens}).\n`)
        throw new EmptyCompletionError(model, finishReason)
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
            process.stdout.write(`[openrouter-build] Trying model: ${model}\n`)
            const content = await generateBuildCompletion({ ...options, model })
            process.stdout.write(`[openrouter-build] Success with model: ${model} (${content.length} chars)\n`)
            return { content, model }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            process.stderr.write(`[openrouter-build] Model ${model} failed: ${message}\n`)
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
