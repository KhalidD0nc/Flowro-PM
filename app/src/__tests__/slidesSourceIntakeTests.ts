import { classifySlidesSources, inferSlidesSourceRole } from "../lib/slides/sourceIntake"
import type { SlidesSourceInput } from "../lib/slides/schema"

interface TestResult {
  name: string
  passed: boolean
}

function runSlidesSourceIntakeTests(): TestResult[] {
  const sources: SlidesSourceInput[] = [
    { id: "pdf", kind: "file", name: "market-research.pdf", mimeType: "application/pdf", size: 1200 },
    { id: "deck", kind: "file", name: "board-update.pptx", size: 1200 },
    { id: "data", kind: "file", name: "revenue.csv", mimeType: "text/csv", size: 1200 },
    { id: "brand", kind: "image", name: "brand-logo.svg", mimeType: "image/svg+xml", size: 1200 },
    { id: "shot", kind: "image", name: "product-screenshot.png", mimeType: "image/png", size: 1200, dataUrl: "data:image/png;base64,abc", width: 1440, height: 900 },
    { id: "link", kind: "link", name: "example.com", url: "https://example.com/report" },
  ]

  const classified = classifySlidesSources(sources)
  const byId = new Map(classified.map((source) => [source.id, source]))

  return [
    {
      name: "classifies documents as source material",
      passed: inferSlidesSourceRole(sources[0]) === "source_material",
    },
    {
      name: "classifies deck files as reference decks",
      passed: byId.get("deck")?.role === "reference_deck",
    },
    {
      name: "classifies spreadsheets as data files",
      passed: byId.get("data")?.role === "data_file",
    },
    {
      name: "classifies brand hints before generic images",
      passed: byId.get("brand")?.role === "brand_asset",
    },
    {
      name: "classifies screenshots separately from image libraries",
      passed: byId.get("shot")?.role === "product_screenshot",
    },
    {
      name: "preserves renderable image metadata",
      passed: byId.get("shot")?.dataUrl?.startsWith("data:image/png") === true && byId.get("shot")?.width === 1440 && byId.get("shot")?.height === 900,
    },
    {
      name: "classifies links as web link sources",
      passed: byId.get("link")?.role === "web_link_source",
    },
    {
      name: "adds user-facing labels and summaries",
      passed: classified.every((source) => source.roleLabel.length > 0 && source.summary.length > 0),
    },
  ]
}

if (require.main === module) {
  const results = runSlidesSourceIntakeTests()
  const passed = results.filter((result) => result.passed).length

  console.log("\nSlides Source Intake Tests\n")
  results.forEach((result) => {
    console.log(`${result.passed ? "PASS" : "FAIL"}  ${result.name}`)
  })
  console.log(`\nSummary: ${passed}/${results.length} passed`)

  if (passed !== results.length) {
    process.exit(1)
  }
}
