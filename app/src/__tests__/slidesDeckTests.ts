import { fallbackSlidesDeck, normalizeSlidesDeckJson } from "../lib/slides/deck"
import { fallbackStory } from "../lib/slides/story"
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
