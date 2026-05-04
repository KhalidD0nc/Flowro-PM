import { normalizePreviewPath } from "../lib/previewRoutes"

export function runPreviewRoutesTests(): Array<{ name: string; passed: boolean }> {
  const cases: Array<[string, string]> = [
    ["/", "/"],
    ["/dashboard", "/app/dashboard"],
    ["dashboard", "/app/dashboard"],
    ["/habits/new", "/app/habits/new"],
    ["/reports", "/app/reports"],
    ["/app", "/app"],
    ["/app/dashboard", "/app/dashboard"],
  ]

  return cases.map(([input, expected]) => ({
    name: `${input} normalizes to ${expected}`,
    passed: normalizePreviewPath(input) === expected,
  }))
}

if (require.main === module) {
  const results = runPreviewRoutesTests()
  const passed = results.filter((result) => result.passed).length

  console.log("\nPreviewRoutes Tests\n")
  results.forEach((result) => {
    console.log(`${result.passed ? "PASS" : "FAIL"}  ${result.name}`)
  })
  console.log(`\nSummary: ${passed}/${results.length} passed`)

  if (passed !== results.length) {
    process.exit(1)
  }
}
