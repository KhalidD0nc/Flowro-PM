import { z } from "zod"

export const projectTypeSchema = z.enum(["app", "slides"])

// ─── AssetRecord — Phase 2b vision-classified asset ──────────────────────────

export const assetRoleSchema = z.enum([
  "logo", "brand_guideline", "product_screenshot", "photo",
  "illustration", "icon", "chart_image", "diagram",
  "reference_deck", "data_table", "document", "web_link",
])
export type AssetRole = z.infer<typeof assetRoleSchema>

export const assetUsageSchema = z.enum([
  "cover_logo", "closing_logo", "inline_icon",
  "full_bleed_background", "framed_screenshot",
  "inline_evidence", "color_palette_source",
  "chart_source_data", "narrative_source",
])
export type AssetUsage = z.infer<typeof assetUsageSchema>

export const assetRecordSchema = z.object({
  id: z.string().min(1),
  filename: z.string().min(1),
  mimeType: z.string().optional(),
  role: assetRoleSchema,
  description: z.string().max(300).default(""),
  usableAs: z.array(assetUsageSchema).default([]),
  properties: z.object({
    dominantColors: z.array(z.string()).optional(),
    hasTransparency: z.boolean().optional(),
    aspectRatio: z.number().optional(),
    subjectFocus: z.object({ x: z.number(), y: z.number() }).optional(),
    textInImage: z.string().optional(),
    isMonochrome: z.boolean().optional(),
    looksLikeLogo: z.boolean().optional(),
    looksLikeScreenshot: z.boolean().optional(),
  }).default({}),
  extracted: z.object({
    text: z.string().max(8000).optional(),
    pageCount: z.number().optional(),
    headings: z.array(z.string()).optional(),
    tables: z.array(z.object({
      headers: z.array(z.string()),
      rows: z.array(z.array(z.string())),
      rowCount: z.number().optional(),
    })).optional(),
    embeddedImages: z.array(z.object({
      index: z.number(),
      description: z.string(),
    })).optional(),
    referenceSlides: z.array(z.object({
      index: z.number(),
      thumbnail: z.string(),
      title: z.string().optional(),
      bullets: z.array(z.string()).optional(),
      palette: z.array(z.string()).optional(),
    })).optional(),
  }).optional(),
  userIntent: z.string().optional(),
  intentRole: assetRoleSchema.optional(),
  // Fields carried over from SlidesSource so assetBag.ts can work with both types
  dataUrl: z.string().optional(),
  url: z.string().optional(),
  brandColors: z.object({
    primary: z.string(),
    accent: z.string(),
    background: z.string(),
  }).optional(),
})
export type AssetRecord = z.infer<typeof assetRecordSchema>
export type ProjectType = z.infer<typeof projectTypeSchema>

export const slidesSourceRoleSchema = z.enum([
  "source_material",
  "reference_deck",
  "style_template_guide",
  "brand_asset",
  "data_file",
  "product_screenshot",
  "image_library",
  "web_link_source",
])
export type SlidesSourceRole = z.infer<typeof slidesSourceRoleSchema>

export const SLIDES_SOURCE_ROLE_LABELS: Record<SlidesSourceRole, string> = {
  source_material: "Source material",
  reference_deck: "Reference deck",
  style_template_guide: "Style/template guide",
  brand_asset: "Brand asset",
  data_file: "Data file",
  product_screenshot: "Product screenshot",
  image_library: "Image library",
  web_link_source: "Web/link source",
}

export const slidesSourceKindSchema = z.enum(["file", "image", "link"])
export type SlidesSourceKind = z.infer<typeof slidesSourceKindSchema>

export const brandColorsSchema = z.object({
  primary: z.string().regex(/^#[0-9a-f]{6}$/i),
  accent: z.string().regex(/^#[0-9a-f]{6}$/i),
  background: z.string().regex(/^#[0-9a-f]{6}$/i),
})
export type BrandColors = z.infer<typeof brandColorsSchema>

export const slidesSourceInputSchema = z.object({
  id: z.string().min(1),
  kind: slidesSourceKindSchema,
  name: z.string().min(1).max(180),
  mimeType: z.string().max(120).optional(),
  size: z.number().int().nonnegative().optional(),
  url: z.string().url().optional(),
  dataUrl: z.string().startsWith("data:image/").max(900_000).optional(),
  storagePath: z.string().min(1).max(500).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  brandColors: brandColorsSchema.optional(),
})
export type SlidesSourceInput = z.infer<typeof slidesSourceInputSchema>

export const slidesSourceStatusSchema = z.enum(["queued", "classified", "summarized", "failed"])
export type SlidesSourceStatus = z.infer<typeof slidesSourceStatusSchema>

export const slidesSourceSchema = slidesSourceInputSchema.extend({
  role: slidesSourceRoleSchema,
  roleLabel: z.string().min(1),
  summary: z.string().min(1),
  status: slidesSourceStatusSchema,
  classificationProvider: z.enum(["openrouter", "deterministic"]),
})
export type SlidesSource = z.infer<typeof slidesSourceSchema>

export const slidesGenerationStatusSchema = z.enum([
  "reading_sources",
  "searching_web",
  "building_story",
  "designing_slides",
  "drafting",
  "rendering",
  "ready",
  "needs_attention",
  "failed",
])
export type SlidesGenerationStatus = z.infer<typeof slidesGenerationStatusSchema>

export const slidesEvidenceCitationSchema = z.object({
  title: z.string().min(1).max(220),
  url: z.string().url(),
})
export type SlidesEvidenceCitation = z.infer<typeof slidesEvidenceCitationSchema>

export const slidesEvidenceSchema = z.object({
  id: z.string().min(1),
  query: z.string().min(1).max(300),
  summary: z.string().min(1).max(900),
  citations: z.array(slidesEvidenceCitationSchema).max(8),
  visualCandidates: z.array(z.object({
    title: z.string().min(1).max(180),
    url: z.string().url(),
    sourceUrl: z.string().url().optional(),
    alt: z.string().min(1).max(220),
  })).max(6).default([]),
  provider: z.enum(["openai_web_search", "skipped", "failed"]),
})
export type SlidesEvidence = z.infer<typeof slidesEvidenceSchema>

export const slidesDeckBriefSchema = z.object({
  objective: z.string().min(1).max(700),
  audience: z.string().min(1).max(240),
  desiredOutcome: z.string().min(1).max(320),
  tone: z.string().min(1).max(160),
  sourceStrategy: z.string().min(1).max(500),
  blockerQuestion: z.string().min(1).max(260).optional(),
})
export type SlidesDeckBrief = z.infer<typeof slidesDeckBriefSchema>

export const slidesOutlineItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(60),
  claim: z.string().min(1).max(110),
  proofType: z.enum(["chart", "image", "comparison", "timeline", "diagram", "table", "source_backed_visual"]),
  sourceIds: z.array(z.string().min(1)).max(8),
  evidenceIds: z.array(z.string().min(1)).max(6),
  speakerIntent: z.string().min(1).max(360),
})
export type SlidesOutlineItem = z.infer<typeof slidesOutlineItemSchema>

export const slidesDeckStorySchema = z.object({
  brief: slidesDeckBriefSchema,
  outline: z.array(slidesOutlineItemSchema).min(1).max(18),
  evidence: z.array(slidesEvidenceSchema).max(12),
  provider: z.enum(["openrouter", "deterministic"]),
})
export type SlidesDeckStory = z.infer<typeof slidesDeckStorySchema>

export const chartTypeSchema = z.enum(["bar_horizontal", "bar_vertical", "line", "area", "donut", "progress", "scatter", "funnel"])
export type ChartType = z.infer<typeof chartTypeSchema>

export const slidesProofObjectSchema = z.object({
  type: z.enum(["chart", "image", "comparison", "timeline", "diagram", "table", "source_backed_visual"]),
  chartType: chartTypeSchema.optional(),
  title: z.string().min(1).max(80),
  description: z.string().min(1).max(160),
  data: z.array(z.object({
    label: z.string().min(1).max(40),
    value: z.string().min(1).max(60),
    xValue: z.number().finite().optional(),
    numericValue: z.number().finite().optional(),
    group: z.string().min(1).max(40).optional(),
    tone: z.enum(["accent", "positive", "warning", "neutral", "muted"]).optional(),
  })).max(8).default([]),
})
export type SlidesProofObject = z.infer<typeof slidesProofObjectSchema>
export type SlidesProofDatum = SlidesProofObject["data"][number]

export function numericValueFromProofDatum(row: SlidesProofDatum): number {
  if (row.numericValue !== undefined) return row.numericValue
  const parsed = Number(String(row.value).replace(/[^\d.-]/g, ""))
  return Number.isFinite(parsed) ? parsed : 0
}

export function inferSlidesChartType(proof: Pick<SlidesProofObject, "chartType" | "data"> & Partial<Pick<SlidesProofObject, "title" | "description">>): ChartType {
  if (proof.chartType) return proof.chartType
  const items = proof.data ?? []
  if (!items.length) return "bar_horizontal"
  if (items.length === 1) return "progress"

  const hasTime = items.some((item) => /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|q[1-4]|20\d\d|week|month|day)\b/i.test(item.label))
  const allNumeric = items.every((item) => item.numericValue !== undefined)
  const total = allNumeric ? items.reduce((sum, item) => sum + (item.numericValue ?? 0), 0) : 0
  const isProportional = allNumeric && items.length <= 5 && total >= 95 && total <= 105
  const context = `${proof.title ?? ""} ${proof.description ?? ""} ${items.map((item) => item.label).join(" ")}`.toLowerCase()
  const hasFunnelContext = /\b(visitor|signup|sign-up|registered|activated|paid|lead|mql|sql|qualified|opportunity|pipeline|stage|conversion|checkout|cart|trial|demo|retained)\b/.test(context)
  const isDescending = allNumeric && items.length >= 3 && items.every((item, index) => index === 0 || (item.numericValue ?? 0) <= (items[index - 1].numericValue ?? 0))

  if (isProportional) return "donut"
  if (hasTime && items.length >= 5) return "line"
  if (isDescending && hasFunnelContext) return "funnel"
  return "bar_horizontal"
}

export const slidesVisualAssetSchema = z.object({
  kind: z.enum(["none", "source_image", "web_image", "generated_visual"]),
  sourceId: z.string().min(1).optional(),
  evidenceId: z.string().min(1).optional(),
  url: z.string().url().optional(),
  dataUrl: z.string().startsWith("data:image/").max(900_000).optional(),
  query: z.string().min(1).max(180).optional(),
  alt: z.string().min(1).max(220).optional(),
  rationale: z.string().min(1).max(240).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
}).default({ kind: "none" })
export type SlidesVisualAsset = z.infer<typeof slidesVisualAssetSchema>

export const slidesStructuredSlideSchema = z.object({
  id: z.string().min(1),
  slideNumber: z.number().int().positive(),
  title: z.string().min(1).max(60),
  claim: z.string().min(1).max(110),
  body: z.array(z.string().min(1).max(72)).min(1).max(3),
  proof: slidesProofObjectSchema,
  speakerNotes: z.string().min(1).max(700),
  sourceIds: z.array(z.string().min(1)).max(8),
  evidenceIds: z.array(z.string().min(1)).max(6),
  layout: z.enum([
    "cover",
    "claim_visual",
    "comparison",
    "timeline",
    "data_table",
    "closing",
    "big_number",
    "side_by_side",
    "quote_highlight",
    "timeline_vertical",
    "image_left",
    "image_full",
  ]),
  visualTone: z.string().min(1).max(160),
  visualAsset: slidesVisualAssetSchema,
})
export type SlidesStructuredSlide = z.infer<typeof slidesStructuredSlideSchema>

// AssetBag — pre-built collection of base64 PNGs the sandbox can use via `assets.<key>`.
// Built by assetBag.ts before sandbox execution; consumed by both the LLM prompt (via key list) and
// the runtime (via lookup). Keys are stable IDs; values are data URLs (data:image/...;base64,...).
export const slidesAssetBagSchema = z.record(
  z.string().min(1).max(80),
  z.string().min(1).max(900_000),
)
export type SlidesAssetBag = z.infer<typeof slidesAssetBagSchema>

export const slidesDeckSchema = z.object({
  title: z.string().min(1).max(160),
  subtitle: z.string().max(220).optional(),
  theme: z.object({
    background: z.string().min(1).max(40),
    foreground: z.string().min(1).max(40),
    accent: z.string().min(1).max(40),
    muted: z.string().min(1).max(40),
  }),
  // Legacy structured slides — kept while the JSON pipeline still drives most renderers/exports.
  // Will be marked optional once Path A (slideCode) replaces it end-to-end. Keep until Phase 3 polish lands.
  slides: z.array(slidesStructuredSlideSchema).min(1).max(24),
  // Path A — LLM-emitted JS that builds the deck against pptxgenjs primitives. Optional during transition.
  slideCode: z.string().min(1).max(120_000).optional(),
  assets: slidesAssetBagSchema.optional(),
  provider: z.enum(["openrouter", "deterministic"]),
  updatedAt: z.string().min(1),
  diagnostics: z.object({
    fallbackReason: z.string().min(1).max(240).optional(),
    webEvidenceStatus: z.enum(["none", "ready", "skipped", "failed"]).optional(),
    visualAssetKinds: z.array(z.enum(["none", "source_image", "web_image", "generated_visual"])).max(24).optional(),
    sandboxStage: z.enum(["validate", "execute", "limit", "ok"]).optional(),
    sandboxError: z.string().min(1).max(400).optional(),
    sandboxDurationMs: z.number().int().nonnegative().optional(),
    slideCodeProvider: z.enum(["openrouter", "deterministic"]).optional(),
    themePreset: z.enum(["navy", "forest", "mono", "warm"]).optional(),
    slideCodeAttemptCount: z.number().int().nonnegative().optional(),
    slideCodeRequestIds: z.array(z.string().min(1).max(80)).max(4).optional(),
    slideCodeDebugFiles: z.array(z.string().min(1).max(260)).max(4).optional(),
    slideCodeNotesCount: z.number().int().nonnegative().optional(),
    slideCodeThumbnailCount: z.number().int().nonnegative().optional(),
  }).optional(),
})
export type SlidesDeck = z.infer<typeof slidesDeckSchema>

export function normalizeProjectType(value: unknown): ProjectType {
  return value === "slides" ? "slides" : "app"
}
