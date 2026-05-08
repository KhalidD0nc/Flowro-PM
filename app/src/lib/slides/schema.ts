import { z } from "zod"

export const projectTypeSchema = z.enum(["app", "slides"])
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

export const slidesProofObjectSchema = z.object({
  type: z.enum(["chart", "image", "comparison", "timeline", "diagram", "table", "source_backed_visual"]),
  title: z.string().min(1).max(80),
  description: z.string().min(1).max(160),
  data: z.array(z.object({
    label: z.string().min(1).max(40),
    value: z.string().min(1).max(60),
    numericValue: z.number().finite().optional(),
    group: z.string().min(1).max(40).optional(),
    tone: z.enum(["accent", "positive", "warning", "neutral", "muted"]).optional(),
  })).max(8).default([]),
})
export type SlidesProofObject = z.infer<typeof slidesProofObjectSchema>

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
  layout: z.enum(["cover", "claim_visual", "comparison", "timeline", "data_table", "closing"]),
  visualTone: z.string().min(1).max(160),
  visualAsset: slidesVisualAssetSchema,
})
export type SlidesStructuredSlide = z.infer<typeof slidesStructuredSlideSchema>

export const slidesDeckSchema = z.object({
  title: z.string().min(1).max(160),
  subtitle: z.string().max(220).optional(),
  theme: z.object({
    background: z.string().min(1).max(40),
    foreground: z.string().min(1).max(40),
    accent: z.string().min(1).max(40),
    muted: z.string().min(1).max(40),
  }),
  slides: z.array(slidesStructuredSlideSchema).min(1).max(24),
  provider: z.enum(["openrouter", "deterministic"]),
  updatedAt: z.string().min(1),
  diagnostics: z.object({
    fallbackReason: z.string().min(1).max(240).optional(),
    webEvidenceStatus: z.enum(["none", "ready", "skipped", "failed"]).optional(),
    visualAssetKinds: z.array(z.enum(["none", "source_image", "web_image", "generated_visual"])).max(24).optional(),
  }).optional(),
})
export type SlidesDeck = z.infer<typeof slidesDeckSchema>

export function normalizeProjectType(value: unknown): ProjectType {
  return value === "slides" ? "slides" : "app"
}
