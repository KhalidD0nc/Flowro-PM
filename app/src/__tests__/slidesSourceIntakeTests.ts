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
    {
      id: "brand",
      kind: "image",
      name: "brand-logo.svg",
      mimeType: "image/svg+xml",
      size: 1200,
      dataUrl: "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20fill%3D%22%23ffffff%22%2F%3E%3Cpath%20fill%3D%22%23ff3366%22%2F%3E%3Ccircle%20fill%3D%22%2300aa55%22%2F%3E%3C%2Fsvg%3E",
    },
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
      name: "extracts SVG brand colors during source intake",
      passed: byId.get("brand")?.brandColors?.primary === "#ff3366" && byId.get("brand")?.brandColors?.accent === "#00aa55",
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
