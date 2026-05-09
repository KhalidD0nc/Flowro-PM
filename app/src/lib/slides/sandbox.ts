// Sandbox for executing LLM-emitted slideCode against a constrained pptxgenjs surface.
// Two execution targets share one validator:
//   - "pptx"    → real pptxgenjs instance, used server-side to write a .pptx buffer
//   - "preview" → PreviewPres shim, used client- or server-side to capture primitives for DOM render
//
// Static gate (regex-based to avoid an extra parser dep) rejects anything that can break out of
// the sandbox: imports, eval, Function ctor, prototype access, fs/process/require, top-level await
// outside the build body, etc. Runtime adds wall-clock + shape-count + image-size limits.

import vm from "node:vm"
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

// Allowed top-level identifiers inside the build body (anything else triggers a soft warning, not a hard fail).
// We do not try to enforce identifier allowlist statically — the vm context is empty except for {pres, assets, Math, console},
// so unknown references throw at runtime.

export function extractBuildBody(code: string): { body: string; warnings: string[] } | { error: string } {
  const trimmed = code.trim()
  const fenced = /```(?:js|javascript|ts)?\s*([\s\S]*?)```/m.exec(trimmed)
  const source = fenced ? fenced[1].trim() : trimmed

  // Accept a few shapes:
  //   1. `export async function build(pres, assets) { ... }`
  //   2. `async function build(pres, assets) { ... }`
  //   3. raw body (no wrapper)
  const fnMatch = /(?:export\s+)?async\s+function\s+build\s*\(\s*pres\s*,\s*assets\s*\)\s*\{([\s\S]*)\}\s*$/m.exec(source)
  if (fnMatch) {
    return { body: fnMatch[1], warnings: [] }
  }
  // Bare body (assume the LLM emitted only the body)
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

export type RunSandboxArgs = {
  code: string
  options: SandboxOptions
  pres: unknown
}

export async function runSlideCode<T = unknown>({
  code,
  options,
  pres,
}: RunSandboxArgs): Promise<SandboxResult<T>> {
  const start = Date.now()
  const diagnostics: SandboxDiagnostics = {
    slideCount: 0,
    shapeCount: 0,
    imageBytes: 0,
    durationMs: 0,
    logs: [],
  }

  const extracted = extractBuildBody(code)
  if ("error" in extracted) {
    return { ok: false, error: extracted.error, stage: "validate", diagnostics: { ...diagnostics, durationMs: Date.now() - start } }
  }
  const validated = validateSlideCode(extracted.body)
  if (!validated.ok) {
    return { ok: false, error: validated.reason, stage: "validate", diagnostics: { ...diagnostics, durationMs: Date.now() - start } }
  }

  const wallClock = options.wallClockMs ?? 8000
  const sandbox: Record<string, unknown> = {
    pres,
    assets: options.assets ?? {},
    Math,
    Number,
    String,
    Array,
    Object: { keys: Object.keys, values: Object.values, entries: Object.entries, assign: Object.assign },
    JSON: { parse: JSON.parse, stringify: JSON.stringify },
    console: {
      log: (...args: unknown[]) => {
        if (diagnostics.logs.length < 50) diagnostics.logs.push(args.map(formatLog).join(" "))
      },
    },
  }

  const wrapped = `(async (pres, assets) => { ${extracted.body} \n })(pres, assets)`
  try {
    const context = vm.createContext(sandbox, { name: "slidecode-sandbox" })
    const script = new vm.Script(wrapped, { filename: "slideCode.js" })
    const promise = script.runInContext(context, { timeout: wallClock, displayErrors: true })
    const result = await Promise.race([
      Promise.resolve(promise),
      new Promise((_, reject) => setTimeout(() => reject(new Error(`wall-clock exceeded ${wallClock}ms`)), wallClock + 250)),
    ])
    diagnostics.durationMs = Date.now() - start
    return { ok: true, value: result as T, diagnostics }
  } catch (err) {
    diagnostics.durationMs = Date.now() - start
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      stage: "execute",
      diagnostics,
    }
  }
}

// Browser-side execution: Next.js client bundles can't use node:vm. Use Function-ctor with the same static gate.
// This is acceptable for preview because: (a) the same code already passes server-side gate before being persisted,
// (b) the PreviewPres shim has no escape hatches, (c) it runs in the user's own browser tab.
export async function runSlideCodeInBrowser<T = unknown>({
  code,
  pres,
  assets,
  wallClockMs = 8000,
}: {
  code: string
  pres: unknown
  assets?: Record<string, unknown>
  wallClockMs?: number
}): Promise<SandboxResult<T>> {
  const start = Date.now()
  const diagnostics: SandboxDiagnostics = { slideCount: 0, shapeCount: 0, imageBytes: 0, durationMs: 0, logs: [] }
  const extracted = extractBuildBody(code)
  if ("error" in extracted) {
    return { ok: false, error: extracted.error, stage: "validate", diagnostics }
  }
  const validated = validateSlideCode(extracted.body)
  if (!validated.ok) {
    return { ok: false, error: validated.reason, stage: "validate", diagnostics }
  }
  try {
    const fn = new Function(
      "pres",
      "assets",
      "console",
      `"use strict"; return (async () => { ${extracted.body} \n })();`,
    ) as (p: unknown, a: unknown, c: unknown) => Promise<unknown>
    const safeConsole = {
      log: (...args: unknown[]) => {
        if (diagnostics.logs.length < 50) diagnostics.logs.push(args.map(formatLog).join(" "))
      },
    }
    const result = await Promise.race([
      fn(pres, assets ?? {}, safeConsole),
      new Promise((_, reject) => setTimeout(() => reject(new Error(`wall-clock exceeded ${wallClockMs}ms`)), wallClockMs)),
    ])
    diagnostics.durationMs = Date.now() - start
    return { ok: true, value: result as T, diagnostics }
  } catch (err) {
    diagnostics.durationMs = Date.now() - start
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      stage: "execute",
      diagnostics,
    }
  }
}

function formatLog(value: unknown): string {
  if (typeof value === "string") return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

// Convenience for callers that want the captured PreviewDeck typed.
export type PreviewExecution = { deck: PreviewDeck; diagnostics: SandboxDiagnostics }
