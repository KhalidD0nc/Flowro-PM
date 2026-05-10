// Hand-authored slideCode used by tests and as a deterministic fallback when LLM emission fails.
// Each export is the body of an `async function build(pres, assets) { ... }`.

export const SAMPLE_COVER_SLIDE_CODE = `
const C = { navy: "0D1B3E", accent: "00E5C3", white: "FFFFFF", muted: "DDE3EA" }
const s = pres.addSlide()
s.background = { color: C.navy }
s.addShape(pres.shapes.OVAL, { x: 8.4, y: -1.6, w: 5.6, h: 5.6, fill: { color: C.accent, transparency: 78 }, line: { color: C.accent, transparency: 100 } })
s.addShape(pres.shapes.OVAL, { x: 9.4, y: 4.6, w: 3.4, h: 3.4, fill: { color: C.accent, transparency: 88 }, line: { color: C.accent, transparency: 100 } })
s.addShape(pres.shapes.RECTANGLE, { x: 0.6, y: 1.7, w: 0.5, h: 0.06, fill: { color: C.accent }, line: { color: C.accent } })
s.addText("Workflow Intelligence\\nThat Pays For Itself.", { x: 0.6, y: 2.0, w: 8.5, h: 2.0, fontSize: 44, bold: true, color: C.white, fontFace: "Trebuchet MS" })
s.addText("A flagship walkthrough of the Flowro execution workspace and how it converts founder intent into shipped artifacts.", { x: 0.6, y: 4.4, w: 8.0, h: 1.2, fontSize: 16, color: C.muted, fontFace: "Aptos" })
s.addText("FLOWRO  ·  INVESTOR DECK  ·  2026", { x: 0.6, y: 6.4, w: 6.0, h: 0.3, fontSize: 9, bold: true, color: C.accent, charSpacing: 1.6, fontFace: "Aptos" })
s.addNotes("Open with the headline value proposition; emphasise the payback story.")
`.trim()

export const SAMPLE_CHART_SLIDE_CODE = `
const C = { navy: "0D1B3E", accent: "00E5C3", muted: "5F6B7A", panel: "F4F6FB", fg: "151515" }
const s = pres.addSlide()
s.background = { color: "FFFFFF" }
s.addText("ARR ACCELERATION", { x: 0.6, y: 0.55, w: 4.0, h: 0.22, fontSize: 9, bold: true, color: C.accent, charSpacing: 1.4, fontFace: "Aptos" })
s.addText("Revenue compounds as workspaces ship more decks per founder", { x: 0.6, y: 0.95, w: 12.0, h: 1.0, fontSize: 28, bold: true, color: C.fg, fontFace: "Georgia" })
s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.6, y: 2.2, w: 6.0, h: 4.6, rectRadius: 0.1, fill: { color: C.panel }, line: { color: "D9DEE8", transparency: 30 } })
s.addChart(pres.charts.BAR, [
  { name: "ARR ($M)", labels: ["Q1", "Q2", "Q3", "Q4", "Q1+1"], values: [1.2, 2.0, 3.1, 4.6, 6.4] }
], { x: 0.85, y: 2.5, w: 5.5, h: 4.0, barDir: "col", showLegend: false, chartColors: [C.accent], catAxisLabelFontSize: 9, valAxisLabelFontSize: 9 })
s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 6.95, y: 2.2, w: 6.0, h: 4.6, rectRadius: 0.1, fill: { color: C.navy }, line: { color: C.navy } })
s.addText("5.3×", { x: 7.2, y: 2.6, w: 5.5, h: 1.6, fontSize: 80, bold: true, color: C.accent, fontFace: "Trebuchet MS" })
s.addText("growth across the past 5 quarters", { x: 7.2, y: 4.1, w: 5.5, h: 0.6, fontSize: 16, color: "FFFFFF", fontFace: "Aptos" })
s.addText("Driven by activation in design-led teams and the new agentic export pipeline.", { x: 7.2, y: 5.0, w: 5.5, h: 1.6, fontSize: 11, color: "DDE3EA", fontFace: "Aptos" })
s.addNotes("Walk through the chart; tie growth to specific shipped features.")
`.trim()

export const SAMPLE_COMPARISON_SLIDE_CODE = `
const C = { navy: "0D1B3E", accent: "00E5C3", muted: "5F6B7A", panel: "F4F6FB", fg: "151515", bad: "9CA3AF" }
const s = pres.addSlide()
s.background = { color: "FFFFFF" }
s.addText("BEFORE / AFTER", { x: 0.6, y: 0.55, w: 4.0, h: 0.22, fontSize: 9, bold: true, color: C.accent, charSpacing: 1.4, fontFace: "Aptos" })
s.addText("Founders waste hours on chat answers; Flowro returns artifacts", { x: 0.6, y: 0.95, w: 12.0, h: 1.0, fontSize: 26, bold: true, color: C.fg, fontFace: "Georgia" })
s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.6, y: 2.3, w: 6.0, h: 4.6, rectRadius: 0.1, fill: { color: C.panel }, line: { color: "D9DEE8" } })
s.addText("BEFORE", { x: 0.85, y: 2.55, w: 5.5, h: 0.3, fontSize: 10, bold: true, color: C.muted, charSpacing: 1.2, fontFace: "Aptos" })
s.addText("Manual handoff", { x: 0.85, y: 2.95, w: 5.5, h: 0.5, fontSize: 20, bold: true, color: C.fg, fontFace: "Georgia" })
s.addText("• Context lost between threads\\n• Decisions stay abstract\\n• Decks rebuilt every week\\n• 4 hrs/week reporting", { x: 0.85, y: 3.7, w: 5.5, h: 2.8, fontSize: 12, color: C.muted, fontFace: "Aptos", paraSpaceAfter: 6 })
s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 6.95, y: 2.3, w: 6.0, h: 4.6, rectRadius: 0.1, fill: { color: C.navy }, line: { color: C.navy } })
s.addText("AFTER · WITH FLOWRO", { x: 7.2, y: 2.55, w: 5.5, h: 0.3, fontSize: 10, bold: true, color: C.accent, charSpacing: 1.2, fontFace: "Aptos" })
s.addText("Continuous artifact loop", { x: 7.2, y: 2.95, w: 5.5, h: 0.5, fontSize: 20, bold: true, color: "FFFFFF", fontFace: "Georgia" })
s.addText("• Decision-grade artifacts\\n• Evidence stays attached\\n• 10 min/week reporting\\n• 5.3× faster founder cycle", { x: 7.2, y: 3.7, w: 5.5, h: 2.8, fontSize: 12, color: "FFFFFF", fontFace: "Aptos", paraSpaceAfter: 6 })
s.addNotes("Anchor the comparison to the prospect's exact pain.")
`.trim()

export function buildMinimalFallbackSlideCode(opts: { title: string; subtitle: string; theme: { background: string; foreground: string; accent: string; muted: string } }): string {
  const t = opts.theme
  const safe = (value: string, max = 200) => value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').slice(0, max)
  return `
const s = pres.addSlide()
s.background = { color: "${safe(t.background)}" }
s.addShape(pres.shapes.RECTANGLE, { x: 0.6, y: 1.0, w: 0.4, h: 0.06, fill: { color: "${safe(t.accent)}" }, line: { color: "${safe(t.accent)}" } })
s.addText("${safe(opts.title, 120)}", { x: 0.6, y: 1.3, w: 12.0, h: 1.4, fontSize: 36, bold: true, color: "${safe(t.foreground)}", fontFace: "Georgia" })
s.addText("${safe(opts.subtitle, 200)}", { x: 0.6, y: 3.0, w: 12.0, h: 1.0, fontSize: 16, color: "${safe(t.muted)}", fontFace: "Aptos" })
s.addText("Slides AI could not generate this deck, so a minimal placeholder was rendered.", { x: 0.6, y: 4.5, w: 12.0, h: 0.4, fontSize: 11, color: "${safe(t.muted)}", fontFace: "Aptos" })
s.addNotes("Fallback deck — re-run generation when assets and prompt are ready.")
`.trim()
}
