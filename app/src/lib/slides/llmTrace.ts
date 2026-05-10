import { logError, logInfo, logWarn } from "@/lib/logger"
import type { Message } from "@/lib/openrouter"

type TraceLevel = "info" | "warn" | "error"

type TraceRequest = {
  requestId: string
  stage: string
  provider: "openrouter" | "openai"
  model: string
  attempt?: number
  messages?: Message[]
  inputChars?: number
  metadata?: Record<string, unknown>
}

export function createSlidesTraceId(stage: string): string {
  const suffix = Math.random().toString(36).slice(2, 8)
  return `slides_${stage}_${Date.now().toString(36)}_${suffix}`
}

function messageSummary(messages?: Message[]) {
  if (!messages?.length) return undefined
  return messages.map((message) => ({
    role: message.role,
    chars: message.content.length,
    preview: message.content.replace(/\s+/g, " ").slice(0, 180),
  }))
}

function emit(level: TraceLevel, action: string, details: Record<string, unknown>) {
  if (level === "error") logError(action, details)
  else if (level === "warn") logWarn(action, details)
  else logInfo(action, details)
}

export function traceSlidesLlmRequest({
  requestId,
  stage,
  provider,
  model,
  attempt = 1,
  messages,
  inputChars,
  metadata,
}: TraceRequest) {
  emit("info", "slides_llm_request", {
    requestId,
    stage,
    provider,
    model,
    attempt,
    inputChars: inputChars ?? messages?.reduce((sum, message) => sum + message.content.length, 0) ?? 0,
    messages: messageSummary(messages),
    ...metadata,
  })
}

export function traceSlidesLlmResponse(args: {
  requestId: string
  stage: string
  provider: "openrouter" | "openai"
  model: string
  ok: boolean
  status?: number
  durationMs: number
  outputChars?: number
  usage?: unknown
  metadata?: Record<string, unknown>
}) {
  emit(args.ok ? "info" : "warn", "slides_llm_response", {
    requestId: args.requestId,
    stage: args.stage,
    provider: args.provider,
    model: args.model,
    ok: args.ok,
    status: args.status,
    durationMs: args.durationMs,
    outputChars: args.outputChars ?? 0,
    usage: args.usage,
    ...args.metadata,
  })
}

export function traceSlidesLlmFailure(args: {
  requestId: string
  stage: string
  provider: "openrouter" | "openai"
  model: string
  durationMs: number
  error: unknown
  metadata?: Record<string, unknown>
}) {
  emit("error", "slides_llm_failure", {
    requestId: args.requestId,
    stage: args.stage,
    provider: args.provider,
    model: args.model,
    durationMs: args.durationMs,
    error: args.error instanceof Error ? args.error.message : String(args.error),
    ...args.metadata,
  })
}
