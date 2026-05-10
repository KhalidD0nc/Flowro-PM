// Sandbox for executing LLM-emitted slideCode against a constrained pptxgenjs surface.
// Two execution targets share one validator:
//   - "pptx"    → real pptxgenjs instance, used server-side to write a .pptx buffer
//   - "preview" → PreviewPres shim, used client- or server-side to capture primitives for DOM render
//
// Static gate (regex-based to avoid an extra parser dep) rejects anything that can break out of
// the sandbox: imports, eval, Function ctor, prototype access, fs/process/require, top-level await
// outside the build body, etc. Runtime adds wall-clock + shape-count + image-size limits.

import vm from "node:vm"
import {
  extractBuildBody,
  formatLog,
  validateSlideCode,
  type SandboxDiagnostics,
  type SandboxOptions,
  type SandboxResult,
} from "@/lib/slides/sandboxShared"

export { extractBuildBody, validateSlideCode, type PreviewExecution } from "@/lib/slides/sandboxShared"
export { runSlideCodeInBrowser } from "@/lib/slides/sandboxBrowser"

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
