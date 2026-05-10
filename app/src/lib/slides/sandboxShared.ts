import type { PreviewDeck } from "./previewPres"

export type SandboxTarget = "pptx" | "preview"

export type SandboxOptions = {
  target: SandboxTarget
  assets?: Record<string, unknown>
  wallClockMs?: number
  maxSlides?: number
  maxShapesPerSlide?: number
  maxImageBytes?: number
}

export type SandboxResult<T> = {
  ok: true
  value: T
  diagnostics: SandboxDiagnostics
} | {
  ok: false
  error: string
  stage: "validate" | "execute" | "limit"
  diagnostics: SandboxDiagnostics
}

export type SandboxDiagnostics = {
  slideCount: number
  shapeCount: number
  imageBytes: number
  durationMs: number
  logs: string[]
}

const FORBIDDEN_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /\bimport\s*\(?/, label: "import" },
  { re: /\brequire\s*\(/, label: "require" },
  { re: /\beval\s*\(/, label: "eval" },
  { re: /\bnew\s+Function\b/, label: "Function constructor" },
  { re: /\b(__proto__|constructor\s*\[|prototype\s*\[)/, label: "prototype access" },
  { re: /\bprocess\b/, label: "process" },
  { re: /\bglobalThis\b/, label: "globalThis" },
  { re: /\bglobal\b\s*\./, label: "global" },
  { re: /\bFunction\s*\(/, label: "Function call" },
  { re: /\bSymbol\s*\(/, label: "Symbol" },
  { re: /\bWebAssembly\b/, label: "WebAssembly" },
  { re: /\bfetch\s*\(/, label: "fetch" },
  { re: /\bXMLHttpRequest\b/, label: "XMLHttpRequest" },
  { re: /\bworker\b\s*=/i, label: "Worker" },
  { re: /\bsetImmediate\b/, label: "setImmediate" },
  { re: /\bsetInterval\b/, label: "setInterval" },
  { re: /\brequire\.resolve/, label: "require.resolve" },
]

export function extractBuildBody(code: string): { body: string; warnings: string[] } | { error: string } {
  const trimmed = code.trim()
  const fenced = /```(?:js|javascript|ts)?\s*([\s\S]*?)```/m.exec(trimmed)
  const source = fenced ? fenced[1].trim() : trimmed

  const fnMatch = /(?:export\s+)?async\s+function\s+build\s*\(\s*pres\s*,\s*assets\s*\)\s*\{([\s\S]*)\}\s*$/m.exec(source)
  if (fnMatch) {
    return { body: fnMatch[1], warnings: [] }
  }
  if (!/\bfunction\b|\bclass\b/.test(source)) {
    return { body: source, warnings: ["bare-body"] }
  }
  return { error: "Could not locate `async function build(pres, assets) { ... }` in emitted code." }
}

export function validateSlideCode(body: string): { ok: true } | { ok: false; reason: string } {
  if (body.length > 120_000) return { ok: false, reason: "code too large (>120k chars)" }
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.re.test(body)) return { ok: false, reason: `forbidden token: ${pattern.label}` }
  }
  return { ok: true }
}

export function formatLog(value: unknown): string {
  if (typeof value === "string") return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

export type PreviewExecution = { deck: PreviewDeck; diagnostics: SandboxDiagnostics }
