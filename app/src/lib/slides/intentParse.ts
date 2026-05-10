// User prompt intent parsing — finds assertive asset-intent statements and maps them
// to role/usage overrides. This runs last in the intake pipeline and beats every other signal.

import type { AssetRole, AssetUsage } from "@/lib/slides/schema"

export type IntentOverride = {
  // Which source to override (matched by index when only one upload, or by filename fragment)
  sourceIndex: number | "all"
  intentRole?: AssetRole
  addUsage?: AssetUsage[]
  userIntent: string
}

type Pattern = {
  regex: RegExp
  intentRole?: AssetRole
  addUsage?: AssetUsage[]
}

const PATTERNS: Pattern[] = [
  // Logo
  { regex: /use\s+(this|it)\s+(as\s+)?(the\s+)?(brand\s+)?logo/i, intentRole: "logo", addUsage: ["cover_logo", "closing_logo"] },
  { regex: /this\s+(is|'s)\s+(our|the)\s+(brand\s+)?logo/i, intentRole: "logo", addUsage: ["cover_logo", "closing_logo"] },
  // Brand guidelines / colors
  { regex: /this\s+is\s+(our\s+)?brand\s+(colors?|guidelines?|palette|identity)/i, intentRole: "brand_guideline", addUsage: ["color_palette_source"] },
  { regex: /use\s+(this|these)\s+(for|as)\s+(our\s+)?brand\s+colou?rs/i, intentRole: "brand_guideline", addUsage: ["color_palette_source"] },
  // Cover / background
  { regex: /use\s+(this|it)\s+(image\s+)?(as\s+)?(the\s+)?cover\s+(background|image|photo)/i, addUsage: ["full_bleed_background"] },
  { regex: /use\s+(this|it)\s+(image\s+)?(as\s+)?background/i, addUsage: ["full_bleed_background"] },
  // Product screenshots / app / dashboard
  { regex: /this\s+(screenshot|image|photo)\s+is\s+(our|the)\s+(product|app|dashboard|ui)/i, intentRole: "product_screenshot", addUsage: ["framed_screenshot"] },
  { regex: /(this\s+is|use\s+(this|it)\s+as)\s+(our|the)\s+(product|app|dashboard|ui)\s+(screenshot|screen|view)/i, intentRole: "product_screenshot", addUsage: ["framed_screenshot"] },
  { regex: /use\s+(this|it)\s+(for|as|in)\s+the\s+product\s+(slide|section|demo)/i, intentRole: "product_screenshot", addUsage: ["framed_screenshot"] },
  // Data / charts
  { regex: /use\s+(this|these|the)\s+(data|numbers?|stats?|metrics?|csv|spreadsheet)\s+(for|to\s+build)\s+(the\s+)?(chart|graph)/i, intentRole: "data_table", addUsage: ["chart_source_data"] },
  { regex: /this\s+(csv|spreadsheet|table|file)\s+(has|contains|is)\s+(the\s+)?(revenue|data|numbers|metrics)/i, intentRole: "data_table", addUsage: ["chart_source_data"] },
]

export function parseUserIntent(
  userMessage: string | undefined,
  sourceCount: number,
): IntentOverride[] {
  if (!userMessage?.trim() || !sourceCount) return []

  const overrides: IntentOverride[] = []
  const msg = userMessage.trim()

  for (const pattern of PATTERNS) {
    if (!pattern.regex.test(msg)) continue
    // If only one source, bind to it. Multiple sources → "all" (operator should surface a clarifying question).
    overrides.push({
      sourceIndex: sourceCount === 1 ? 0 : "all",
      ...(pattern.intentRole ? { intentRole: pattern.intentRole } : {}),
      ...(pattern.addUsage ? { addUsage: pattern.addUsage } : {}),
      userIntent: msg.slice(0, 280),
    })
    // One match per message is enough to avoid duplicate overrides
    break
  }

  return overrides
}
