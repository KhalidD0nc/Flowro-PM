import { fallbackSlidesDeck, normalizeSlidesDeckJson } from "../lib/slides/deck"
import { fallbackStory } from "../lib/slides/story"
import { classifySlidesSources } from "../lib/slides/sourceIntake"
import { extractBrandColorsFromSvg } from "../lib/slides/colorExtract"
import { inferSlidesChartType, slidesDeckSchema, type SlidesSource } from "../lib/slides/schema"

interface TestResult {
  name: string
  passed: boolean
  detail?: string
}

function runSlidesDeckTests(): TestResult[] {
  const sources: SlidesSource[] = [{
    id: "source-shot",
    kind: "image",
    name: "product-screenshot.png",
    mimeType: "image/png",
    size: 1200,
    dataUrl: "data:image/png;base64,abc",
    width: 1440,
    height: 900,
    role: "product_screenshot",
    roleLabel: "Product screenshot",
    summary: "Use this image as product evidence or UI context.",
    status: "classified",
    classificationProvider: "deterministic",
  }]

  const normalized = normalizeSlidesDeckJson({
    title: "Flowro investor deck",
    subtitle: "Execution workspace narrative",
    theme: {
      background: "#f8fafc",
      foreground: "#101010",
      accent: "#0f766e",
      muted: "#52616b",
    },
    slides: [
      {
        id: "slide-1",
        slideNumber: 1,
        title: "Flowro closes the execution gap",
        claim: "Founders need buildable artifacts, not another chat transcript.",
        body: ["Idea capture becomes structured execution context."],
        proof: {
          type: "chart",
          title: "Execution gap",
          description: "The strongest proof is the shift from prompt to artifact.",
          data: [
            { label: "Chat answer", value: "35", numericValue: 35, tone: "muted" },
            { label: "Flowro workspace", value: "90", xValue: 2, numericValue: 90, tone: "positive" },
          ],
        },
        speakerNotes: "Show the execution gap.",
        sourceIds: ["source-shot"],
        evidenceIds: [],
        layout: "claim_visual",
        visualTone: "Sharp and product-specific",
        visualAsset: { kind: "source_image", sourceId: "source-shot" },
      },
    ],
  }, sources)

  const parsed = slidesDeckSchema.safeParse({
    ...normalized,
    provider: "openrouter",
    updatedAt: "2026-05-07T00:00:00.000Z",
  })
  const firstSlide = parsed.success ? parsed.data.slides[0] : undefined
  const genericStory = fallbackStory("Create a 5-slide market entry deck for solar financing", [], [])
  const genericDeck = fallbackSlidesDeck(genericStory)
  const fallbackText = JSON.stringify({ genericStory, genericDeck }).toLowerCase()
  const dataStory = fallbackStory("Create a 5-slide market entry deck for solar financing", [{
    ...sources[0],
    id: "source-data",
    kind: "file",
    name: "metrics.csv",
    mimeType: "text/csv",
    dataUrl: undefined,
    width: undefined,
    height: undefined,
    role: "data_file",
    roleLabel: "Data file",
    summary: "Use this file as quantitative proof.",
  }], [])
  const chartFallback = fallbackSlidesDeck(dataStory).slides.find((slide) => slide.proof.type === "chart")

  // ── M3.1 — Brand color extraction ───────────────────────────────────────────
  const SVG_WITH_COLORS = `data:image/svg+xml;base64,${Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg"><rect fill="#0f766e"/><rect fill="#f59e0b"/><rect fill="#ffffff"/></svg>`
  ).toString("base64")}`
  const extractedColors = extractBrandColorsFromSvg(SVG_WITH_COLORS)

  const brandSource = classifySlidesSources([{
    id: "logo-1",
    kind: "image",
    name: "company-logo.svg",
    mimeType: "image/svg+xml",
    dataUrl: SVG_WITH_COLORS,
  }])
  const logoClassified = brandSource[0]

  // ── M2 — New layout schema validation ────────────────────────────────────────
  const newLayoutDeck = normalizeSlidesDeckJson({
    title: "Layout test deck",
    theme: { background: "#ffffff", foreground: "#111111", accent: "#7c3aed", muted: "#6b7280" },
    slides: [
      { id: "s1", slideNumber: 1, layout: "cover", title: "Cover slide", claim: "Opening.", body: ["Intro."], proof: { type: "chart", title: "T", description: "D", data: [{ label: "A", value: "1", numericValue: 1 }] }, speakerNotes: "N", sourceIds: [], evidenceIds: [], visualTone: "bold", visualAsset: { kind: "none" } },
      { id: "s2", slideNumber: 2, layout: "big_number", title: "Big KPI", claim: "3× growth.", body: ["Q4 result."], proof: { type: "chart", title: "T", description: "D", data: [{ label: "Growth", value: "3×", numericValue: 300 }] }, speakerNotes: "N", sourceIds: [], evidenceIds: [], visualTone: "bold", visualAsset: { kind: "none" } },
      { id: "s3", slideNumber: 3, layout: "side_by_side", title: "Compare", claim: "Two options.", body: ["Option A.", "Option B."], proof: { type: "comparison", title: "T", description: "D", data: [] }, speakerNotes: "N", sourceIds: [], evidenceIds: [], visualTone: "bold", visualAsset: { kind: "none" } },
      { id: "s4", slideNumber: 4, layout: "quote_highlight", title: "Quote", claim: "Testimonial.", body: ["Context."], proof: { type: "source_backed_visual", title: "T", description: "D", data: [{ label: "CEO, Acme", value: "CFO" }] }, speakerNotes: "N", sourceIds: [], evidenceIds: [], visualTone: "bold", visualAsset: { kind: "none" } },
      { id: "s5", slideNumber: 5, layout: "timeline_vertical", title: "Roadmap", claim: "Five phases.", body: ["Phase detail."], proof: { type: "timeline", title: "T", description: "D", data: [{ label: "Phase 1", value: "Q1" }, { label: "Phase 2", value: "Q2" }] }, speakerNotes: "N", sourceIds: [], evidenceIds: [], visualTone: "bold", visualAsset: { kind: "none" } },
      { id: "s6", slideNumber: 6, layout: "image_left", title: "Product shot", claim: "Visual proof.", body: ["Screenshot."], proof: { type: "image", title: "T", description: "D", data: [] }, speakerNotes: "N", sourceIds: [], evidenceIds: [], visualTone: "bold", visualAsset: { kind: "none" } },
      { id: "s7", slideNumber: 7, layout: "image_full", title: "Section break", claim: "Transition.", body: ["Next chapter."], proof: { type: "source_backed_visual", title: "T", description: "D", data: [] }, speakerNotes: "N", sourceIds: [], evidenceIds: [], visualTone: "bold", visualAsset: { kind: "none" } },
      { id: "s8", slideNumber: 8, layout: "closing", title: "Recommendation", claim: "Action item.", body: ["Next step."], proof: { type: "chart", title: "T", description: "D", data: [{ label: "A", value: "1", numericValue: 1 }] }, speakerNotes: "N", sourceIds: [], evidenceIds: [], visualTone: "bold", visualAsset: { kind: "none" } },
    ],
  }, [])
  const newLayoutValidated = slidesDeckSchema.safeParse({
    ...newLayoutDeck,
    provider: "openrouter",
    updatedAt: "2026-05-09T00:00:00.000Z",
  })

  return [
    {
      name: "validates normalized deck JSON",
      passed: parsed.success,
      detail: parsed.success ? undefined : parsed.error.issues.map((issue) => issue.path.join(".")).join(", "),
    },
    {
      name: "preserves numeric chart data",
      passed: firstSlide?.proof.type === "chart" && firstSlide.proof.data[1]?.numericValue === 90,
    },
    {
      name: "preserves scatter x-axis values",
      passed: firstSlide?.proof.data[1]?.xValue === 2,
    },
    {
      name: "infers proportions as donut before funnel",
      passed: inferSlidesChartType({
        data: [
          { label: "Startups", value: "40%", numericValue: 40 },
          { label: "Agencies", value: "30%", numericValue: 30 },
          { label: "Consultants", value: "20%", numericValue: 20 },
          { label: "Enterprise", value: "10%", numericValue: 10 },
        ],
      }) === "donut",
    },
    {
      name: "infers conversion stages as funnel",
      passed: inferSlidesChartType({
        title: "Signup conversion",
        data: [
          { label: "Visitors", value: "12000", numericValue: 12000 },
          { label: "Signups", value: "2400", numericValue: 2400 },
          { label: "Activated", value: "960", numericValue: 960 },
          { label: "Paid", value: "288", numericValue: 288 },
        ],
      }) === "funnel",
    },
    {
      name: "resolves source image asset",
      passed: firstSlide?.visualAsset.kind === "source_image" && firstSlide.visualAsset.dataUrl === "data:image/png;base64,abc",
    },
    {
      name: "keeps deterministic fallback prompt-specific",
      passed: !fallbackText.includes("flowro") && !fallbackText.includes("chat tool") && fallbackText.includes("solar financing"),
    },
    {
      name: "deterministic chart fallback has 4 numeric points",
      passed: chartFallback?.proof.chartType === "bar_horizontal" &&
        chartFallback.proof.data.length >= 4 &&
        chartFallback.proof.data.every((item) => typeof item.numericValue === "number"),
    },

    // ── M3.1 — Brand color extraction ─────────────────────────────────────────
    {
      name: "M3.1 extracts chromatic colors from SVG data URL",
      passed: extractedColors !== null && /^#[0-9a-f]{6}$/i.test(extractedColors.primary),
      detail: extractedColors ? `primary=${extractedColors.primary} accent=${extractedColors.accent}` : "null",
    },
    {
      name: "M3.1 primary color is from SVG fill (not white/black)",
      passed: extractedColors?.primary === "#0f766e" || extractedColors?.primary === "#f59e0b",
    },
    {
      name: "M3.1 classifySlidesSources attaches brandColors to brand_asset",
      passed: logoClassified?.role === "brand_asset" && logoClassified?.brandColors !== undefined,
      detail: logoClassified?.brandColors ? JSON.stringify(logoClassified.brandColors) : "missing",
    },

    // ── M2 — New layout schema validation ──────────────────────────────────────
    {
      name: "M2 schema accepts all 6 new layout types",
      passed: newLayoutValidated.success,
      detail: newLayoutValidated.success
        ? undefined
        : newLayoutValidated.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    },
    {
      name: "M2 big_number layout preserved through normalize",
      passed: newLayoutValidated.success &&
        newLayoutValidated.data.slides.find((s) => s.id === "s2")?.layout === "big_number",
    },
    {
      name: "M2 quote_highlight layout preserved through normalize",
      passed: newLayoutValidated.success &&
        newLayoutValidated.data.slides.find((s) => s.id === "s4")?.layout === "quote_highlight",
    },
    {
      name: "M2 image_full layout preserved through normalize",
      passed: newLayoutValidated.success &&
        newLayoutValidated.data.slides.find((s) => s.id === "s7")?.layout === "image_full",
    },
  ]
}

if (require.main === module) {
  const results = runSlidesDeckTests()
  const passed = results.filter((result) => result.passed).length

  console.log("\nSlides Deck Tests\n")
  results.forEach((result) => {
    console.log(`${result.passed ? "PASS" : "FAIL"}  ${result.name}${result.detail ? ` (${result.detail})` : ""}`)
  })
  console.log(`\nSummary: ${passed}/${results.length} passed`)

  if (passed !== results.length) process.exit(1)
}
