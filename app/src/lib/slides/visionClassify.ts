// Single-image vision classification via OpenRouter multimodal.
// Falls back gracefully when no API key or image is too small to classify usefully.

import type { AssetRole, AssetUsage } from "@/lib/slides/schema"

export type VisionClassification = {
  role: AssetRole
  description: string
  looksLikeLogo: boolean
  looksLikeScreenshot: boolean
  subjectFocus: { x: number; y: number } | null
  dominantColors: string[]
  textInImage: string
  usableAs: AssetUsage[]
  isMonochrome: boolean
  hasTransparency: boolean
  warnings: string[]
}

const FALLBACK: VisionClassification = {
  role: "photo",
  description: "",
  looksLikeLogo: false,
  looksLikeScreenshot: false,
  subjectFocus: null,
  dominantColors: [],
  textInImage: "",
  usableAs: ["inline_evidence"],
  isMonochrome: false,
  hasTransparency: false,
  warnings: [],
}

const VALID_USAGES = new Set<AssetUsage>([
  "cover_logo", "closing_logo", "inline_icon",
  "full_bleed_background", "framed_screenshot",
  "inline_evidence", "color_palette_source",
  "chart_source_data", "narrative_source",
])
const VALID_ROLES = new Set<AssetRole>([
  "logo", "brand_guideline", "product_screenshot", "photo",
  "illustration", "icon", "chart_image", "diagram",
  "reference_deck", "data_table", "document", "web_link",
])

function cleanJson(raw: string): string {
  return raw.trim().replace(/^```(?:json)?\s*/m, "").replace(/\s*```$/m, "")
}

function isValidHex(c: string): c is string {
  return /^#[0-9a-f]{6}$/i.test(c)
}

export async function classifyImageWithVision(
  dataUrl: string,
  filename: string,
  userMessage?: string,
): Promise<VisionClassification> {
  if (!process.env.OPENROUTER_API_KEY) {
    return { ...FALLBACK, description: "Vision classification skipped (no API key)" }
  }

  const model =
    process.env.OPENROUTER_MODEL_VISION ||
    process.env.OPENROUTER_MODEL_SLIDES_CODE ||
    "anthropic/claude-sonnet-4-6"

  const systemPrompt = `You are classifying an uploaded asset for a slide deck. Examine the image and return JSON only — no prose, no markdown fences:
{
  "role": "logo|brand_guideline|product_screenshot|photo|illustration|icon|chart_image|diagram|reference_deck|data_table|document|web_link",
  "description": "1–3 sentences describing what this image depicts",
  "looksLikeLogo": boolean,
  "looksLikeScreenshot": boolean,
  "subjectFocus": {"x":0.0,"y":0.0} or null,
  "dominantColors": ["#RRGGBB"],
  "textInImage": "any visible text or empty string",
  "usableAs": ["cover_logo"|"closing_logo"|"inline_icon"|"full_bleed_background"|"framed_screenshot"|"inline_evidence"|"color_palette_source"|"chart_source_data"|"narrative_source"],
  "isMonochrome": boolean,
  "hasTransparency": boolean,
  "warnings": ["low_resolution"|"watermark"|"contains_pii"|"distorted"]
}

Rules:
- looksLikeLogo: true → simple mark/symbol, transparent or solid bg, high contrast, minimal text
- looksLikeScreenshot: true → app/browser chrome, UI elements, dashboard
- dominantColors: up to 5 hex colors by area coverage, most dominant first
- usableAs: pick ALL that apply${userMessage ? `\n\nUSER'S STATED INTENT: "${userMessage.slice(0, 280)}"` : ""}`

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "Flowro-PM",
      },
      body: JSON.stringify({
        model,
        max_tokens: 700,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: dataUrl } },
              { type: "text", text: `Filename: ${filename}. Classify this asset for a slide deck.` },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(20000),
    })

    if (!res.ok) return { ...FALLBACK }
    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> }
    const content = data?.choices?.[0]?.message?.content
    if (typeof content !== "string") return { ...FALLBACK }

    const parsed = JSON.parse(cleanJson(content)) as Partial<VisionClassification>
    return {
      role: VALID_ROLES.has(parsed.role as AssetRole) ? (parsed.role as AssetRole) : FALLBACK.role,
      description: typeof parsed.description === "string" ? parsed.description.slice(0, 300) : "",
      looksLikeLogo: Boolean(parsed.looksLikeLogo),
      looksLikeScreenshot: Boolean(parsed.looksLikeScreenshot),
      subjectFocus: parsed.subjectFocus ?? null,
      dominantColors: Array.isArray(parsed.dominantColors)
        ? parsed.dominantColors.filter(isValidHex).slice(0, 5)
        : [],
      textInImage: typeof parsed.textInImage === "string" ? parsed.textInImage.slice(0, 500) : "",
      usableAs: Array.isArray(parsed.usableAs)
        ? (parsed.usableAs as string[]).filter((u): u is AssetUsage => VALID_USAGES.has(u as AssetUsage))
        : ["inline_evidence"],
      isMonochrome: Boolean(parsed.isMonochrome),
      hasTransparency: Boolean(parsed.hasTransparency),
      warnings: Array.isArray(parsed.warnings)
        ? (parsed.warnings as unknown[]).filter((w): w is string => typeof w === "string")
        : [],
    }
  } catch {
    return { ...FALLBACK }
  }
}
