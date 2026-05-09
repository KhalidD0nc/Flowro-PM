import { extractBuildBody, runSlideCode, runSlideCodeInBrowser, validateSlideCode } from "../lib/slides/sandbox"
import { PreviewPres } from "../lib/slides/previewPres"
import { SAMPLE_CHART_SLIDE_CODE, SAMPLE_COMPARISON_SLIDE_CODE, SAMPLE_COVER_SLIDE_CODE, buildMinimalFallbackSlideCode } from "../lib/slides/sampleDecks"

interface TestResult { name: string; passed: boolean; detail?: string }

async function runTests(): Promise<TestResult[]> {
  const results: TestResult[] = []

  // ── Static gate: rejects forbidden tokens ─────────────────────────────────
  const attackCorpus: Array<{ name: string; code: string; expectReject: boolean }> = [
    { name: "rejects require()", code: `const fs = require("fs"); fs.unlinkSync("/")`, expectReject: true },
    { name: "rejects import()", code: `await import("node:fs")`, expectReject: true },
    { name: "rejects eval()", code: `eval("1+1")`, expectReject: true },
    { name: "rejects new Function()", code: `new Function("return process")()`, expectReject: true },
    { name: "rejects __proto__ access", code: `({}).__proto__.polluted = 1`, expectReject: true },
    { name: "rejects process reference", code: `process.exit(0)`, expectReject: true },
    { name: "rejects fetch", code: `fetch("https://evil.example")`, expectReject: true },
    { name: "rejects XMLHttpRequest", code: `new XMLHttpRequest()`, expectReject: true },
    { name: "accepts harmless code", code: `const s = pres.addSlide(); s.addText("hi", { x: 0, y: 0, w: 1, h: 1 })`, expectReject: false },
  ]

  for (const test of attackCorpus) {
    const validated = validateSlideCode(test.code)
    const rejected = !validated.ok
    results.push({
      name: `static gate ${test.name}`,
      passed: rejected === test.expectReject,
      detail: validated.ok ? "ok" : validated.reason,
    })
  }

  // ── extractBuildBody handles fenced + bare + wrapped forms ────────────────
  const fenced = "```js\nconst s = pres.addSlide()\n```"
  const fencedExtracted = extractBuildBody(fenced)
  results.push({
    name: "extracts fenced ```js code block",
    passed: !("error" in fencedExtracted) && fencedExtracted.body.includes("addSlide"),
  })
  const wrapped = `export async function build(pres, assets) {\n  const s = pres.addSlide()\n}`
  const wrappedExtracted = extractBuildBody(wrapped)
  results.push({
    name: "extracts async function build wrapper",
    passed: !("error" in wrappedExtracted) && wrappedExtracted.body.includes("addSlide"),
  })

  // ── PreviewPres records primitives accurately ─────────────────────────────
  const previewPres = new PreviewPres()
  const previewResult = await runSlideCodeInBrowser({ code: SAMPLE_COVER_SLIDE_CODE, pres: previewPres, assets: {} })
  const previewDeck = previewPres.finalize()
  results.push({
    name: "preview cover slide executes successfully",
    passed: previewResult.ok && previewDeck.slides.length === 1,
    detail: previewResult.ok ? `primitives=${previewDeck.slides[0]?.primitives.length}` : previewResult.error,
  })
  results.push({
    name: "preview cover slide has decorative shapes + text",
    passed:
      previewDeck.slides[0]?.primitives.some((p) => p.kind === "shape" && p.shape === "ellipse") === true &&
      previewDeck.slides[0]?.primitives.some((p) => p.kind === "text" && p.text.includes("Workflow Intelligence")) === true,
  })

  // ── Chart slide renders chart primitive with values ───────────────────────
  const chartPres = new PreviewPres()
  const chartResult = await runSlideCodeInBrowser({ code: SAMPLE_CHART_SLIDE_CODE, pres: chartPres, assets: {} })
  const chartDeck = chartPres.finalize()
  const chartPrimitive = chartDeck.slides[0]?.primitives.find((p) => p.kind === "chart")
  results.push({
    name: "preview chart slide records native chart with 5 data points",
    passed: chartResult.ok && chartPrimitive?.kind === "chart" && chartPrimitive.series[0]?.values.length === 5,
    detail: chartResult.ok ? undefined : chartResult.error,
  })

  // ── Comparison slide renders both panels ─────────────────────────────────
  const compPres = new PreviewPres()
  const compResult = await runSlideCodeInBrowser({ code: SAMPLE_COMPARISON_SLIDE_CODE, pres: compPres, assets: {} })
  const compDeck = compPres.finalize()
  const compTexts = compDeck.slides[0]?.primitives.filter((p) => p.kind === "text") ?? []
  results.push({
    name: "preview comparison slide includes BEFORE and AFTER labels",
    passed:
      compResult.ok &&
      compTexts.some((t) => t.kind === "text" && t.text.includes("BEFORE")) &&
      compTexts.some((t) => t.kind === "text" && t.text.includes("AFTER")),
    detail: compResult.ok ? undefined : compResult.error,
  })

  // ── Server-side vm sandbox executes successfully ──────────────────────────
  const vmPres = new PreviewPres()
  const vmResult = await runSlideCode({
    code: SAMPLE_COVER_SLIDE_CODE,
    options: { target: "preview" },
    pres: vmPres,
  })
  results.push({
    name: "node:vm sandbox executes preview slideCode",
    passed: vmResult.ok && vmPres.finalize().slides.length === 1,
    detail: vmResult.ok ? `duration=${vmResult.diagnostics.durationMs}ms` : `${vmResult.stage}: ${vmResult.error}`,
  })

  // ── Sandbox rejects forbidden code at runtime ─────────────────────────────
  const malicious = `process.exit(0)`
  const blocked = await runSlideCode({ code: malicious, options: { target: "preview" }, pres: new PreviewPres() })
  results.push({
    name: "sandbox blocks process.exit before execution",
    passed: !blocked.ok && blocked.stage === "validate",
    detail: blocked.ok ? "unexpectedly succeeded" : blocked.error,
  })

  // ── Resource limit: wall clock ─────────────────────────────────────────────
  const infinite = `while(true){}`
  const tooLong = await runSlideCode({ code: infinite, options: { target: "preview", wallClockMs: 200 }, pres: new PreviewPres() })
  results.push({
    name: "sandbox enforces wall-clock timeout on infinite loop",
    passed: !tooLong.ok && /exceed|time(d)?\s*out/i.test(tooLong.error ?? ""),
    detail: tooLong.ok ? "unexpectedly succeeded" : tooLong.error,
  })

  // ── Minimal fallback slideCode is itself valid ────────────────────────────
  const fb = buildMinimalFallbackSlideCode({ title: "Test", subtitle: "Subtitle", theme: { background: "FFFFFF", foreground: "151515", accent: "00E5C3", muted: "5F6B7A" } })
  const fbValidated = validateSlideCode(fb)
  const fbPres = new PreviewPres()
  const fbResult = await runSlideCodeInBrowser({ code: fb, pres: fbPres })
  results.push({
    name: "minimal fallback slideCode passes gate and executes",
    passed: fbValidated.ok && fbResult.ok && fbPres.finalize().slides.length === 1,
    detail: fbResult.ok ? undefined : fbResult.error,
  })

  return results
}

if (require.main === module) {
  runTests().then((results) => {
    const passed = results.filter((r) => r.passed).length
    console.log("\nSlides Sandbox Tests\n")
    results.forEach((r) => console.log(`${r.passed ? "PASS" : "FAIL"}  ${r.name}${r.detail ? ` (${r.detail})` : ""}`))
    console.log(`\nSummary: ${passed}/${results.length} passed`)
    if (passed !== results.length) process.exit(1)
  })
}
