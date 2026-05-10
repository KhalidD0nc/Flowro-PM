import {
  extractBuildBody,
  formatLog,
  validateSlideCode,
  type SandboxDiagnostics,
  type SandboxResult,
} from "@/lib/slides/sandboxShared"

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
