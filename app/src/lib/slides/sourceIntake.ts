import { generateCompletion } from "@/lib/openrouter"
import {
  SLIDES_SOURCE_ROLE_LABELS,
  slidesSourceSchema,
  type SlidesSource,
  type SlidesSourceInput,
  type SlidesSourceRole,
} from "@/lib/slides/schema"

const DOCUMENT_EXTENSIONS = new Set(["pdf", "doc", "docx", "txt", "md"])
const DECK_EXTENSIONS = new Set(["ppt", "pptx", "key"])
const DATA_EXTENSIONS = new Set(["csv", "tsv", "xls", "xlsx", "json"])
const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif", "svg"])
const BRAND_HINTS = ["brand", "logo", "identity", "guideline", "style guide", "brandbook"]
const SCREENSHOT_HINTS = ["screenshot", "screen shot", "capture", "product", "ui"]

function extensionFor(source: SlidesSourceInput): string {
  const name = source.name.toLowerCase()
  const match = /\.([a-z0-9]+)$/.exec(name)
  return match?.[1] ?? ""
}

export function inferSlidesSourceRole(source: SlidesSourceInput): SlidesSourceRole {
  const ext = extensionFor(source)
  const name = source.name.toLowerCase()
  const mimeType = source.mimeType?.toLowerCase() ?? ""

  if (source.kind === "link" || source.url) return "web_link_source"
  if (DATA_EXTENSIONS.has(ext) || mimeType.includes("spreadsheet") || mimeType.includes("csv")) return "data_file"
  if (DECK_EXTENSIONS.has(ext) || mimeType.includes("presentation")) return "reference_deck"
  if (BRAND_HINTS.some((hint) => name.includes(hint))) return "brand_asset"
  if (source.kind === "image" || IMAGE_EXTENSIONS.has(ext) || mimeType.startsWith("image/")) {
    return SCREENSHOT_HINTS.some((hint) => name.includes(hint)) ? "product_screenshot" : "image_library"
  }
  if (DOCUMENT_EXTENSIONS.has(ext) || mimeType.includes("pdf") || mimeType.includes("document")) return "source_material"

  return "source_material"
}

function summaryFor(source: SlidesSourceInput, role: SlidesSourceRole): string {
  if (role === "web_link_source") return `Use ${source.url ?? source.name} as a link-backed source.`
  if (role === "data_file") return "Use this file as structured data for charts, tables, or quantitative proof."
  if (role === "reference_deck") return "Use this deck as a reference for narrative structure or prior presentation content."
  if (role === "style_template_guide") return "Use this asset as visual direction for layout, tone, or template choices."
  if (role === "brand_asset") return "Use this asset for brand cues such as logo, colors, or identity rules."
  if (role === "product_screenshot") return "Use this image as product evidence or UI context."
  if (role === "image_library") return "Use this image only when it directly supports a slide claim."
  return "Use this file as source material for deck claims and supporting context."
}

export function classifySlidesSources(sources: SlidesSourceInput[]): SlidesSource[] {
  return sources.map((source) => {
    const role = inferSlidesSourceRole(source)
    return {
      ...source,
      role,
      roleLabel: SLIDES_SOURCE_ROLE_LABELS[role],
      summary: summaryFor(source, role),
      status: "classified",
      classificationProvider: "deterministic",
    }
  })
}

function cleanJson(raw: string): string {
  return raw.trim().replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "")
}

export async function classifySlidesSourcesWithOpenRouter(sources: SlidesSourceInput[]): Promise<SlidesSource[]> {
  const fallback = classifySlidesSources(sources)
  if (!sources.length || !process.env.OPENROUTER_API_KEY) return fallback

  try {
    const response = await generateCompletion({
      model: process.env.OPENROUTER_MODEL || "deepseek/deepseek-chat",
      reasoning: false,
      maxTokens: 1200,
      timeoutMs: 20000,
      maxRetries: 0,
      messages: [
        {
          role: "system",
          content: `Classify presentation source metadata. Return JSON only: {"sources":[{"id":"...","role":"source_material|reference_deck|style_template_guide|brand_asset|data_file|product_screenshot|image_library|web_link_source","summary":"one concise sentence"}]}.`,
        },
        {
          role: "user",
          content: JSON.stringify({ sources }),
        },
      ],
    })
    const data = await response.json()
    const content = data?.choices?.[0]?.message?.content
    if (typeof content !== "string") return fallback

    const parsed = JSON.parse(cleanJson(content)) as { sources?: Array<{ id?: string; role?: unknown; summary?: unknown }> }
    const byId = new Map(parsed.sources?.map((source) => [source.id, source]) ?? [])

    return fallback.map((source) => {
      const aiSource = byId.get(source.id)
      const candidate = {
        ...source,
        role: aiSource?.role ?? source.role,
        roleLabel: SLIDES_SOURCE_ROLE_LABELS[(aiSource?.role as SlidesSourceRole) ?? source.role] ?? source.roleLabel,
        summary: typeof aiSource?.summary === "string" && aiSource.summary.trim()
          ? aiSource.summary.trim().slice(0, 260)
          : source.summary,
        status: "summarized",
        classificationProvider: "openrouter",
      }
      const validated = slidesSourceSchema.safeParse(candidate)
      return validated.success ? validated.data : source
    })
  } catch {
    return fallback
  }
}
