// Multi-stage asset intake pipeline (Phase 2b).
//
// Pipeline per asset:
//   1. Metadata sniff  — extension, mime, size (deterministic, free)
//   2. Vision pass     — for image files with a dataUrl, call visionClassify
//   3. Document pass   — for text/pdf/docx, call documentExtract
//   4. Data pass       — for CSV/TSV, call dataExtract
//   5. Deck pass       — for PPTX/PPT (stub; LibreOffice not yet available)
//   6. Intent reconcile — apply user-stated overrides from the prompt
//
// Falls back to deterministic classification when vision is unavailable or errors.
// The legacy classifySlidesSources / classifySlidesSourcesWithOpenRouter exports are
// kept for backward compatibility with existing callers.

import {
  SLIDES_SOURCE_ROLE_LABELS,
  slidesSourceSchema,
  type AssetRecord,
  type AssetRole,
  type SlidesSource,
  type SlidesSourceInput,
  type SlidesSourceRole,
} from "@/lib/slides/schema"
import { extractBrandColorsFromSvg } from "@/lib/slides/colorExtract"
import { classifyImageWithVision } from "@/lib/slides/visionClassify"
import { extractFromDocument, dataUrlToBuffer } from "@/lib/slides/documentExtract"
import { extractFromData } from "@/lib/slides/dataExtract"
import { extractFromDeck } from "@/lib/slides/deckExtract"
import { parseUserIntent } from "@/lib/slides/intentParse"
import { generateCompletion } from "@/lib/openrouter"
import type { Message } from "@/lib/openrouter"
import { createSlidesTraceId, traceSlidesLlmFailure, traceSlidesLlmRequest, traceSlidesLlmResponse } from "@/lib/slides/llmTrace"

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

// ─── Legacy deterministic classification (kept for backward compatibility) ────

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
    const brandColors =
      role === "brand_asset" && source.dataUrl && !source.brandColors
        ? extractBrandColorsFromSvg(source.dataUrl) ?? undefined
        : source.brandColors
    return {
      ...source,
      role,
      roleLabel: SLIDES_SOURCE_ROLE_LABELS[role],
      summary: summaryFor(source, role),
      status: "classified",
      classificationProvider: "deterministic",
      ...(brandColors ? { brandColors } : {}),
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
    const model = process.env.OPENROUTER_MODEL_SOURCE_INTAKE || "openai/gpt-mini-latest"
    const requestId = createSlidesTraceId("source_classify")
    const messages: Message[] = [
      {
        role: "system",
        content: `Classify presentation source metadata. Return JSON only: {"sources":[{"id":"...","role":"source_material|reference_deck|style_template_guide|brand_asset|data_file|product_screenshot|image_library|web_link_source","summary":"one concise sentence"}]}.`,
      },
      {
        role: "user",
        content: JSON.stringify({ sources }),
      },
    ]
    const startedAt = Date.now()
    traceSlidesLlmRequest({ requestId, stage: "source_classify", provider: "openrouter", model, messages, metadata: { sourceCount: sources.length } })
    const response = await generateCompletion({
      model,
      reasoning: false,
      maxTokens: 1200,
      timeoutMs: 20000,
      maxRetries: 0,
      messages,
    })
    const data = await response.json()
    const content = data?.choices?.[0]?.message?.content
    traceSlidesLlmResponse({ requestId, stage: "source_classify", provider: "openrouter", model, ok: typeof content === "string", status: response.status, durationMs: Date.now() - startedAt, outputChars: typeof content === "string" ? content.length : 0, usage: data?.usage })
    if (typeof content !== "string") return fallback

    const parsed = JSON.parse(cleanJson(content)) as { sources?: Array<{ id?: string; role?: unknown; summary?: unknown }> }
    const byId = new Map(parsed.sources?.map((source) => [source.id, source]) ?? [])

    return fallback.map((source) => {
      const aiSource = byId.get(source.id)
      const role = (aiSource?.role as SlidesSourceRole) ?? source.role
      const brandColors =
        role === "brand_asset" && source.dataUrl && !source.brandColors
          ? extractBrandColorsFromSvg(source.dataUrl) ?? source.brandColors
          : source.brandColors
      const candidate = {
        ...source,
        role,
        roleLabel: SLIDES_SOURCE_ROLE_LABELS[role] ?? source.roleLabel,
        summary: typeof aiSource?.summary === "string" && aiSource.summary.trim()
          ? aiSource.summary.trim().slice(0, 260)
          : source.summary,
        status: "summarized",
        classificationProvider: "openrouter",
        ...(brandColors ? { brandColors } : {}),
      }
      const validated = slidesSourceSchema.safeParse(candidate)
      return validated.success ? validated.data : source
    })
  } catch (error) {
    traceSlidesLlmFailure({ requestId: createSlidesTraceId("source_classify_error"), stage: "source_classify", provider: "openrouter", model: process.env.OPENROUTER_MODEL_SOURCE_INTAKE || "openai/gpt-mini-latest", durationMs: 0, error })
    return fallback
  }
}

// ─── Phase 2b: vision-driven multi-stage analyzer ────────────────────────────

function isImageSource(source: SlidesSourceInput): boolean {
  const ext = extensionFor(source)
  const mimeType = source.mimeType?.toLowerCase() ?? ""
  return (
    source.kind === "image" ||
    IMAGE_EXTENSIONS.has(ext) ||
    mimeType.startsWith("image/")
  )
}

function isDocumentSource(source: SlidesSourceInput): boolean {
  const ext = extensionFor(source)
  const mimeType = source.mimeType?.toLowerCase() ?? ""
  return (
    DOCUMENT_EXTENSIONS.has(ext) ||
    mimeType.includes("pdf") ||
    mimeType.includes("document") ||
    mimeType.startsWith("text/")
  )
}

function isDataSource(source: SlidesSourceInput): boolean {
  const ext = extensionFor(source)
  const mimeType = source.mimeType?.toLowerCase() ?? ""
  return (
    DATA_EXTENSIONS.has(ext) ||
    mimeType.includes("spreadsheet") ||
    mimeType.includes("csv") ||
    mimeType.includes("tab-separated")
  )
}

function isDeckSource(source: SlidesSourceInput): boolean {
  const ext = extensionFor(source)
  const mimeType = source.mimeType?.toLowerCase() ?? ""
  return DECK_EXTENSIONS.has(ext) || mimeType.includes("presentation")
}

// Map vision role → SlidesSource role (for backward-compatible role labels)
function visionRoleToSourceRole(visionRole: AssetRole): SlidesSourceRole {
  const map: Partial<Record<AssetRole, SlidesSourceRole>> = {
    logo: "brand_asset",
    brand_guideline: "brand_asset",
    product_screenshot: "product_screenshot",
    photo: "image_library",
    illustration: "image_library",
    icon: "image_library",
    chart_image: "image_library",
    diagram: "image_library",
    reference_deck: "reference_deck",
    data_table: "data_file",
    document: "source_material",
    web_link: "web_link_source",
  }
  return map[visionRole] ?? "image_library"
}

/**
 * analyzeAssets — Phase 2b multi-stage asset intake.
 * Returns AssetRecord[] with vision-classified roles, extracted content, and intent overrides.
 * Vision calls run in parallel. Falls back to deterministic if API is unavailable.
 */
export async function analyzeAssets(
  sources: SlidesSourceInput[],
  userMessage?: string,
): Promise<AssetRecord[]> {
  if (!sources.length) return []

  const intentOverrides = parseUserIntent(userMessage, sources.length)
  const overrideByIndex = new Map(
    intentOverrides
      .filter((o) => typeof o.sourceIndex === "number")
      .map((o) => [o.sourceIndex as number, o]),
  )

  // Run all vision/document/data passes in parallel
  const records = await Promise.all(
    sources.map(async (source, idx): Promise<AssetRecord> => {
      const mimeType = source.mimeType?.toLowerCase() ?? ""
      const isLink = source.kind === "link" || Boolean(source.url)

      // ── 1. Sniff ──────────────────────────────────────────────────────────
      let role: AssetRole = "document"
      if (isLink) role = "web_link"
      else if (isDeckSource(source)) role = "reference_deck"
      else if (isDataSource(source)) role = "data_table"
      else if (BRAND_HINTS.some((h) => source.name.toLowerCase().includes(h))) role = "logo"
      else if (isImageSource(source)) {
        role = SCREENSHOT_HINTS.some((h) => source.name.toLowerCase().includes(h))
          ? "product_screenshot"
          : "photo"
      }

      let description = ""
      let looksLikeLogo = false
      let looksLikeScreenshot = false
      let dominantColors: string[] = []
      let textInImage = ""
      let usableAs: AssetRecord["usableAs"] = []
      let isMonochrome = false
      let hasTransparency = false
      let subjectFocus: { x: number; y: number } | null = null
      let extracted: AssetRecord["extracted"] | undefined

      // ── 2. Vision pass (images with dataUrl) ──────────────────────────────
      if (isImageSource(source) && source.dataUrl) {
        try {
          const vision = await classifyImageWithVision(source.dataUrl, source.name, userMessage)
          role = vision.role
          description = vision.description
          looksLikeLogo = vision.looksLikeLogo
          looksLikeScreenshot = vision.looksLikeScreenshot
          dominantColors = vision.dominantColors
          textInImage = vision.textInImage
          usableAs = vision.usableAs
          isMonochrome = vision.isMonochrome
          hasTransparency = vision.hasTransparency
          subjectFocus = vision.subjectFocus

          // Vision says logo but user naming suggests otherwise → vision wins
          if (vision.looksLikeLogo) role = "logo"
          else if (vision.looksLikeScreenshot) role = "product_screenshot"
        } catch {
          // Vision timed out or errored — keep sniff role
        }
      }

      // ── 3. Document pass ──────────────────────────────────────────────────
      if (isDocumentSource(source) && source.dataUrl) {
        const buf = dataUrlToBuffer(source.dataUrl)
        if (buf) {
          const doc = extractFromDocument(buf, mimeType, source.name)
          if (doc.text || doc.headings.length) {
            extracted = {
              text: doc.text || undefined,
              headings: doc.headings.length ? doc.headings : undefined,
              pageCount: doc.pageCount,
            }
          }
          if (!usableAs.length) usableAs = ["narrative_source"]
        }
      }

      // ── 4. Data pass ──────────────────────────────────────────────────────
      if (isDataSource(source) && source.dataUrl) {
        const buf = dataUrlToBuffer(source.dataUrl)
        if (buf) {
          const table = extractFromData(buf, mimeType, source.name)
          if (table) {
            extracted = { tables: [table] }
            role = "data_table"
            if (!usableAs.includes("chart_source_data")) usableAs = [...usableAs, "chart_source_data"]
          }
        }
      }

      // ── 5. Deck pass (stub) ───────────────────────────────────────────────
      if (isDeckSource(source) && source.dataUrl) {
        const buf = dataUrlToBuffer(source.dataUrl)
        if (buf) {
          const slides = extractFromDeck(buf, source.name)
          if (slides.length) {
            extracted = { referenceSlides: slides, pageCount: slides.length }
          }
          role = "reference_deck"
          if (!usableAs.includes("narrative_source")) usableAs = [...usableAs, "narrative_source"]
        }
      }

      // ── 6. Intent reconcile ───────────────────────────────────────────────
      const intentOverride = overrideByIndex.get(idx)
      const finalRole = intentOverride?.intentRole ?? role
      const finalUsableAs = intentOverride?.addUsage
        ? [...new Set([...usableAs, ...intentOverride.addUsage])]
        : usableAs.length ? usableAs : defaultUsageForRole(finalRole)

      // Brand colors: try SVG extraction first, then vision dominantColors
      let brandColors = source.brandColors
      if (!brandColors && source.dataUrl?.startsWith("data:image/svg+xml")) {
        const extracted_ = extractBrandColorsFromSvg(source.dataUrl)
        if (extracted_) brandColors = extracted_
      }
      if (!brandColors && dominantColors.length >= 2) {
        brandColors = {
          primary: dominantColors[0],
          accent: dominantColors[1] ?? dominantColors[0],
          background: dominantColors.find((c) => isLightColor(c)) ?? "#FFFFFF",
        }
      }

      const record: AssetRecord = {
        id: source.id,
        filename: source.name,
        mimeType: source.mimeType,
        role: finalRole,
        description,
        usableAs: finalUsableAs,
        properties: {
          ...(dominantColors.length ? { dominantColors } : {}),
          ...(hasTransparency ? { hasTransparency } : {}),
          ...(source.width && source.height ? { aspectRatio: source.width / source.height } : {}),
          ...(subjectFocus ? { subjectFocus } : {}),
          ...(textInImage ? { textInImage } : {}),
          ...(isMonochrome ? { isMonochrome } : {}),
          ...(looksLikeLogo ? { looksLikeLogo } : {}),
          ...(looksLikeScreenshot ? { looksLikeScreenshot } : {}),
        },
        ...(extracted ? { extracted } : {}),
        ...(intentOverride ? { userIntent: intentOverride.userIntent, intentRole: intentOverride.intentRole } : {}),
        // Backward-compat fields
        ...(source.dataUrl ? { dataUrl: source.dataUrl } : {}),
        ...(source.url ? { url: source.url } : {}),
        ...(brandColors ? { brandColors } : {}),
      }

      return record
    }),
  )

  return records
}

function defaultUsageForRole(role: AssetRole): AssetRecord["usableAs"] {
  const map: Record<AssetRole, AssetRecord["usableAs"]> = {
    logo: ["cover_logo", "closing_logo"],
    brand_guideline: ["color_palette_source"],
    product_screenshot: ["framed_screenshot", "inline_evidence"],
    photo: ["inline_evidence"],
    illustration: ["inline_evidence"],
    icon: ["inline_icon"],
    chart_image: ["inline_evidence"],
    diagram: ["inline_evidence"],
    reference_deck: ["narrative_source"],
    data_table: ["chart_source_data", "narrative_source"],
    document: ["narrative_source"],
    web_link: ["narrative_source"],
  }
  return map[role] ?? ["inline_evidence"]
}

function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r + g + b) / 3 > 180
}

// ─── Utility: build a compact manifest string for the LLM prompt ─────────────

export function describeAssetRecords(records: AssetRecord[]): string {
  if (!records.length) return "(no assets)"
  return records.map((r) => {
    const parts: string[] = [`- assets.${assetKey(r)} (${r.role}`]
    if (r.description) parts[0] += `, "${r.description.slice(0, 80)}"`
    if (r.properties.dominantColors?.length) {
      parts[0] += `, dominant ${r.properties.dominantColors.slice(0, 3).join(" ")}`
    }
    if (r.userIntent) parts[0] += `, intent: "${r.userIntent.slice(0, 80)}"`
    parts[0] += `)`
    if (r.extracted?.tables?.length) {
      const t = r.extracted.tables[0]
      const count = t.rowCount ?? t.rows.length
      parts.push(`  columns: ${t.headers.slice(0, 6).join(", ")} (${count} rows)`)
    }
    if (r.extracted?.headings?.length) {
      parts.push(`  headings: ${r.extracted.headings.slice(0, 4).join("; ")}`)
    }
    return parts.join("\n")
  }).join("\n")
}

// Deterministic asset key used in the bag and manifest
export function assetKey(r: AssetRecord): string {
  if (r.role === "logo" || (r.properties.looksLikeLogo && r.usableAs.includes("cover_logo"))) return "logo"
  if (r.role === "product_screenshot" || r.usableAs.includes("framed_screenshot")) return "screenshot"
  if (r.role === "data_table" || r.usableAs.includes("chart_source_data")) return "data"
  if (r.role === "reference_deck") return "ref_deck"
  if (r.role === "brand_guideline") return "brand"
  return r.id.replace(/[^a-z0-9_]/gi, "_").slice(0, 24)
}

// Re-export for backward compat
export { visionRoleToSourceRole }
