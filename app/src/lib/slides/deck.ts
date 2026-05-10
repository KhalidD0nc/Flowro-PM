import { generateCompletion } from "@/lib/openrouter"
import type { Message } from "@/lib/openrouter"
import { logWarn } from "@/lib/logger"
import {
  slidesDeckSchema,
  type AssetRecord,
  type ChartType,
  type SlidesAssetBag,
  type SlidesDeck,
  type SlidesDeckStory,
  type SlidesEvidence,
  type SlidesProofObject,
  type SlidesSource,
  type SlidesStructuredSlide,
  type SlidesVisualAsset,
} from "@/lib/slides/schema"
import { buildAssetBag, describeAssetBag } from "@/lib/slides/assetBag"
import { describeAssetRecords } from "@/lib/slides/sourceIntake"
import { createSlidesTraceId, traceSlidesLlmFailure, traceSlidesLlmRequest, traceSlidesLlmResponse } from "@/lib/slides/llmTrace"
import { PreviewPres } from "@/lib/slides/previewPres"
import { validatePreviewDeckPrimitives } from "@/lib/slides/primitiveValidation"
import { extractBuildBody, runSlideCode, validateSlideCode } from "@/lib/slides/sandbox"
import { buildMinimalFallbackSlideCode } from "@/lib/slides/sampleDecks"
import { mkdir, writeFile } from "fs/promises"
import path from "path"

const SLIDES_CODE_OUTPUT_DIR = process.env.SLIDES_CODE_OUTPUT_DIR || "/Users/khalidr/Desktop/Flowro-Slides-Code"

function cleanJson(raw: string): string {
  return raw.trim().replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "")
}

function truncate(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : ""
}

function filenameSafe(value: string): string {
  return value.replace(/[^a-z0-9_-]+/gi, "_").replace(/^_+|_+$/g, "").slice(0, 100) || "slide_code"
}

function normalizeDebugSlideCode(content: string): string {
  const trimmed = content.trim()
  const fenced = /```(?:js|javascript|ts)?\s*([\s\S]*?)```/m.exec(trimmed)
  const source = fenced ? fenced[1] : trimmed.replace(/^```(?:js|javascript|ts)?\s*/i, "").replace(/\s*```$/, "")
  return source.trimEnd()
}

async function saveGeneratedSlideCodeFile(args: {
  requestId: string
  stage: string
  model: string
  attempt: number
  content: string
  finishReason?: unknown
}): Promise<string | undefined> {
  try {
    await mkdir(SLIDES_CODE_OUTPUT_DIR, { recursive: true })
    const stamp = new Date().toISOString().replace(/[:.]/g, "-")
    const filename = `${stamp}_${filenameSafe(args.stage)}_${filenameSafe(args.requestId)}.js`
    const filePath = path.join(SLIDES_CODE_OUTPUT_DIR, filename)
    const header = [
      "// Flowro Slides generated slideCode debug file.",
      `// requestId: ${args.requestId}`,
      `// stage: ${args.stage}`,
      `// model: ${args.model}`,
      `// attempt: ${args.attempt}`,
      `// finishReason: ${String(args.finishReason ?? "unknown")}`,
      "",
    ].join("\n")
    await writeFile(filePath, `${header}${normalizeDebugSlideCode(args.content)}\n`, "utf8")
    return filePath
  } catch (error) {
    logWarn("slides_slide_code_debug_write_failed", {
      requestId: args.requestId,
      stage: args.stage,
      outputDir: SLIDES_CODE_OUTPUT_DIR,
      error: error instanceof Error ? error.message : String(error),
    })
    return undefined
  }
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value !== "string") return undefined
  const parsed = Number(value.replace(/[^\d.-]/g, ""))
  return Number.isFinite(parsed) ? parsed : undefined
}

function firstRenderableImage(sources: SlidesSource[]): SlidesSource | undefined {
  return sources.find((source) =>
    (source.role === "product_screenshot" || source.role === "brand_asset" || source.role === "image_library" || source.kind === "image") &&
    Boolean(source.dataUrl || source.url)
  )
}

function visualAssetFromSource(source?: SlidesSource): SlidesVisualAsset | undefined {
  if (!source) return undefined
  return {
    kind: "source_image",
    sourceId: source.id,
    ...(source.url ? { url: source.url } : {}),
    ...(source.dataUrl ? { dataUrl: source.dataUrl } : {}),
    ...(source.width ? { width: source.width } : {}),
    ...(source.height ? { height: source.height } : {}),
    alt: source.summary || source.name,
    rationale: "Attached source image selected as slide evidence.",
  }
}

function generatedVisualAsset(type: SlidesProofObject["type"], claim: string): SlidesVisualAsset {
  return {
    kind: "generated_visual",
    query: `${type.replace(/_/g, " ")} for ${claim}`.slice(0, 180),
    alt: "Generated structured visual proof.",
    rationale: "Rendered from structured proof data when no direct image asset is available.",
  }
}

export function normalizeSlidesDeckJson(value: unknown, sources: SlidesSource[] = []) {
  const proofTypes = new Set(["chart", "image", "comparison", "timeline", "diagram", "table", "source_backed_visual"])
  const chartTypes = new Set<ChartType>(["bar_horizontal", "bar_vertical", "line", "area", "donut", "progress", "scatter", "funnel"])
  const layouts = new Set(["cover", "claim_visual", "comparison", "timeline", "data_table", "closing", "big_number", "side_by_side", "quote_highlight", "timeline_vertical", "image_left", "image_full"])
  const visualKinds = new Set(["none", "source_image", "web_image", "generated_visual"])
  const raw = value as {
    title?: unknown
    subtitle?: unknown
    theme?: Record<string, unknown>
    slides?: Array<Record<string, unknown>>
  }
  return {
    ...raw,
    title: truncate(raw.title, 160) || "Generated deck",
    subtitle: truncate(raw.subtitle, 220),
    theme: {
      background: truncate(raw.theme?.background, 40) || DEFAULT_THEME.background,
      foreground: truncate(raw.theme?.foreground, 40) || DEFAULT_THEME.foreground,
      accent: truncate(raw.theme?.accent, 40) || DEFAULT_THEME.accent,
      muted: truncate(raw.theme?.muted, 40) || DEFAULT_THEME.muted,
    },
    slides: (Array.isArray(raw.slides) ? raw.slides : []).map((slide, index) => {
      const proof = slide.proof as Record<string, unknown> | undefined
      const visualAsset = slide.visualAsset as Record<string, unknown> | undefined
      const body = (Array.isArray(slide.body) ? slide.body : [])
        .map((item) => truncate(item, 72))
        .filter(Boolean)
        .slice(0, 3)
      return {
        id: truncate(slide.id, 80) || `slide-${index + 1}`,
        slideNumber: typeof slide.slideNumber === "number" && slide.slideNumber > 0 ? Math.floor(slide.slideNumber) : index + 1,
        title: truncate(slide.title, 60),
        claim: truncate(slide.claim, 110),
        body: body.length ? body : [truncate(slide.claim, 72) || "Use this slide to advance the deck narrative."],
        proof: {
          type: typeof proof?.type === "string" && proofTypes.has(proof.type) ? proof.type : "source_backed_visual",
          ...(typeof proof?.chartType === "string" && chartTypes.has(proof.chartType as ChartType) ? { chartType: proof.chartType as ChartType } : {}),
          title: truncate(proof?.title, 80) || truncate(slide.title, 60) || "Visual proof",
          description: truncate(proof?.description, 160) || truncate(slide.claim, 110) || "Designed proof for the slide claim.",
          data: (Array.isArray(proof?.data) ? proof.data : [])
            .map((item) => item as Record<string, unknown>)
            .map((item) => ({
              label: truncate(item.label, 40),
              value: truncate(item.value, 60),
              ...(numberValue(item.xValue) !== undefined ? { xValue: numberValue(item.xValue) } : {}),
              ...(numberValue(item.numericValue ?? item.value) !== undefined ? { numericValue: numberValue(item.numericValue ?? item.value) } : {}),
              ...(truncate(item.group, 40) ? { group: truncate(item.group, 40) } : {}),
              ...(typeof item.tone === "string" && ["accent", "positive", "warning", "neutral", "muted"].includes(item.tone) ? { tone: item.tone } : {}),
            }))
            .filter((item) => item.label && item.value)
            .slice(0, 8),
        },
        speakerNotes: truncate(slide.speakerNotes, 700) || truncate(slide.claim, 280) || "Present this slide as part of the deck narrative.",
        sourceIds: Array.isArray(slide.sourceIds) ? slide.sourceIds.filter((id): id is string => typeof id === "string").slice(0, 8) : [],
        evidenceIds: Array.isArray(slide.evidenceIds) ? slide.evidenceIds.filter((id): id is string => typeof id === "string").slice(0, 6) : [],
        layout: typeof slide.layout === "string" && layouts.has(slide.layout) ? slide.layout : index === 0 ? "cover" : "claim_visual",
        visualTone: truncate(slide.visualTone, 160) || "Premium, sharp, and content-specific",
        visualAsset: (() => {
          const sourceAsset = visualAssetFromSource(
            truncate(visualAsset?.sourceId, 120)
              ? sources.find((source) => source.id === truncate(visualAsset?.sourceId, 120))
              : firstRenderableImage(sources)
          )
          const kind = typeof visualAsset?.kind === "string" && visualKinds.has(visualAsset.kind) ? visualAsset.kind : "none"
          if (kind === "source_image" && sourceAsset) return sourceAsset
          const normalized = {
          kind: typeof visualAsset?.kind === "string" && visualKinds.has(visualAsset.kind) ? visualAsset.kind : "none",
          ...(truncate(visualAsset?.sourceId, 120) ? { sourceId: truncate(visualAsset?.sourceId, 120) } : {}),
          ...(truncate(visualAsset?.evidenceId, 120) ? { evidenceId: truncate(visualAsset?.evidenceId, 120) } : {}),
          ...(truncate(visualAsset?.url, 500) ? { url: truncate(visualAsset?.url, 500) } : {}),
          ...(truncate(visualAsset?.dataUrl, 900_000) && truncate(visualAsset?.dataUrl, 900_000).startsWith("data:image/") ? { dataUrl: truncate(visualAsset?.dataUrl, 900_000) } : {}),
          ...(truncate(visualAsset?.query, 180) ? { query: truncate(visualAsset?.query, 180) } : {}),
          ...(truncate(visualAsset?.alt, 220) ? { alt: truncate(visualAsset?.alt, 220) } : {}),
          ...(truncate(visualAsset?.rationale, 240) ? { rationale: truncate(visualAsset?.rationale, 240) } : {}),
          ...(numberValue(visualAsset?.width) ? { width: numberValue(visualAsset?.width) } : {}),
          ...(numberValue(visualAsset?.height) ? { height: numberValue(visualAsset?.height) } : {}),
          }
          return normalized.kind === "none" && sourceAsset && (proof?.type === "image" || index === 0)
            ? sourceAsset
            : normalized.kind === "none"
              ? generatedVisualAsset((typeof proof?.type === "string" && proofTypes.has(proof.type) ? proof.type : "source_backed_visual") as SlidesProofObject["type"], truncate(slide.claim, 180))
              : normalized
        })(),
      }
    }),
  }
}

const DEFAULT_THEME = {
  background: "#ffffff",
  foreground: "#151515",
  accent: "#0f766e",
  muted: "#5f6b7a",
}

const THEME_PRESETS = {
  navy: {
    background: "#FFFFFF",
    foreground: "#151515",
    accent: "#00E5C3",
    muted: "#5F6B7A",
    primary: "#0D1B3E",
    description: "navy preset: primary #0D1B3E, accent #00E5C3, light slides #FFFFFF/#F4F6FB, strong executive contrast",
  },
  forest: {
    background: "#FBFCF8",
    foreground: "#17231C",
    accent: "#2FA36B",
    muted: "#657166",
    primary: "#123326",
    description: "forest preset: primary #123326, accent #2FA36B, warm off-white background #FBFCF8, calm credible tone",
  },
  mono: {
    background: "#FFFFFF",
    foreground: "#111111",
    accent: "#111111",
    muted: "#6F6F6A",
    primary: "#111111",
    description: "mono preset: black/white base with grayscale panels, restrained editorial hierarchy, no bright generic blue",
  },
  warm: {
    background: "#FFF9F1",
    foreground: "#211814",
    accent: "#D96035",
    muted: "#7B6B61",
    primary: "#3A2118",
    description: "warm preset: primary #3A2118, accent #D96035, cream background #FFF9F1, energetic but polished",
  },
} as const

type ThemePresetName = keyof typeof THEME_PRESETS

function selectThemePreset(story?: SlidesDeckStory): ThemePresetName {
  const text = `${story?.brief.objective ?? ""} ${story?.brief.tone ?? ""} ${story?.brief.audience ?? ""}`.toLowerCase()
  if (/\b(finance|legal|enterprise|board|security|investor|executive)\b/.test(text)) return "navy"
  if (/\b(sustainability|health|wellness|education|community|nature|climate)\b/.test(text)) return "forest"
  if (/\b(luxury|fashion|portfolio|agency|editorial|minimal|mono)\b/.test(text)) return "mono"
  if (/\b(creator|consumer|food|retail|launch|marketing|brand|social)\b/.test(text)) return "warm"
  return "navy"
}

function fallbackProof(item: SlidesDeckStory["outline"][number], index: number): SlidesProofObject {
  const proofDataByType: Record<string, SlidesProofObject["data"]> = {
    chart: [
      { label: "Problem", value: "62", numericValue: 62 },
      { label: "Urgency", value: "74", numericValue: 74 },
      { label: "Fit", value: "81", numericValue: 81 },
      { label: "Action", value: "88", numericValue: 88 },
    ],
    comparison: [
      { label: "Current path", value: "Manual", group: "left" },
      { label: "Slow handoff", value: "Context gets lost", group: "left" },
      { label: "Weak proof", value: "Decision stays abstract", group: "left" },
      { label: "Recommended path", value: "Focused", group: "right" },
      { label: "Clear artifact", value: "Evidence drives action", group: "right" },
      { label: "Next step", value: "Decision becomes executable", group: "right" },
    ],
    timeline: [
      { label: "Frame", value: "Clarify the decision" },
      { label: "Prove", value: "Use available evidence" },
      { label: "Choose", value: "Select the strongest path" },
      { label: "Act", value: "Commit the next step" },
    ],
    table: [
      { label: "Context", value: "What the audience knows" },
      { label: "Implication", value: "What the evidence means" },
      { label: "Decision", value: "What should happen next" },
    ],
    diagram: [
      { label: "Input", value: "Prompt and sources" },
      { label: "Signal", value: "Relevant evidence" },
      { label: "Outcome", value: "Actionable recommendation" },
    ],
  }
  const data = proofDataByType[item.proofType] ?? [
    { label: `Proof ${index + 1}`, value: item.claim.slice(0, 120) },
    { label: "Evidence", value: item.evidenceIds.length ? "Web-backed context" : "Prompt-grounded context" },
  ]
  return {
    type: item.proofType,
    ...(item.proofType === "chart" ? { chartType: "bar_horizontal" as ChartType } : {}),
    title: item.title,
    description: item.speakerIntent,
    data,
  }
}

function fallbackSlide(story: SlidesDeckStory, item: SlidesDeckStory["outline"][number], index: number, sources: SlidesSource[]): SlidesStructuredSlide {
  const isCover = index === 0
  const isLast = index === story.outline.length - 1
  const sourceAsset = visualAssetFromSource(firstRenderableImage(sources))
  const proof = fallbackProof(item, index)
  return {
    id: item.id,
    slideNumber: index + 1,
    title: item.title,
    claim: item.claim,
    body: [
      truncate(item.speakerIntent, 72) || "Supporting context for the claim.",
      item.sourceIds.length || item.evidenceIds.length
        ? "Grounded in source inventory and mapped evidence."
        : "Use prompt context without inventing unsupported metrics.",
      isLast
        ? "Convert recommendation into one concrete next step."
        : "Visual proof makes the claim inspectable at a glance.",
    ],
    proof,
    speakerNotes: item.speakerIntent,
    sourceIds: item.sourceIds,
    evidenceIds: item.evidenceIds,
    layout: isCover ? "cover" : isLast ? "closing" : item.proofType === "timeline" ? "timeline" : item.proofType === "table" ? "data_table" : item.proofType === "comparison" ? "comparison" : "claim_visual",
    visualTone: `${story.brief.tone}; premium, sharp, and execution-oriented`,
    visualAsset: sourceAsset && (item.proofType === "image" || isCover)
      ? sourceAsset
      : generatedVisualAsset(proof.type, item.claim),
  }
}

export function fallbackSlidesDeck(story: SlidesDeckStory, sources: SlidesSource[] = [], reason = "Slides AI was unavailable, so a deterministic visual fallback was rendered."): SlidesDeck {
  const slides = story.outline.map((item, index) => fallbackSlide(story, item, index, sources))
  return {
    title: story.outline[0]?.title || "Generated deck",
    subtitle: story.brief.desiredOutcome,
    theme: DEFAULT_THEME,
    slides,
    provider: "deterministic",
    updatedAt: new Date().toISOString(),
    diagnostics: {
      fallbackReason: reason.slice(0, 240),
      webEvidenceStatus: story.evidence.length
        ? story.evidence.some((item) => item.provider === "openai_web_search") ? "ready" : story.evidence.some((item) => item.provider === "failed") ? "failed" : "skipped"
        : "none",
      visualAssetKinds: slides.map((slide) => slide.visualAsset.kind),
    },
  }
}

export async function generateSlidesDeck({
  story,
  sources,
}: {
  story: SlidesDeckStory
  sources: SlidesSource[]
}): Promise<SlidesDeck> {
  const fallback = fallbackSlidesDeck(story, sources)
  if (!process.env.OPENROUTER_API_KEY) return fallback

  try {
    const model = process.env.OPENROUTER_MODEL_SLIDES || process.env.OPENROUTER_MODEL || "openai/gpt-mini-latest"
    const requestId = createSlidesTraceId("deck_json")
    const messages: Message[] = [
      {
        role: "system",
        content: `You generate structured presentation slides for Flowro Slides. Return JSON only with {"title","subtitle","theme":{"background","foreground","accent","muted"},"slides":[{"id","slideNumber","title","claim","body":["max 3 bullets"],"proof":{"type":"chart|image|comparison|timeline|diagram|table|source_backed_visual","chartType":"bar_horizontal|bar_vertical|line|area|donut|progress|scatter|funnel","title","description","data":[{"label","value","xValue":0,"numericValue":0,"group":"optional","tone":"accent|positive|warning|neutral|muted"}]},"speakerNotes","sourceIds":["..."],"evidenceIds":["..."],"layout":"cover|claim_visual|comparison|timeline|data_table|closing|big_number|side_by_side|quote_highlight|timeline_vertical|image_left|image_full","visualTone","visualAsset":{"kind":"none|source_image|web_image|generated_visual","sourceId":"optional","evidenceId":"optional","url":"optional direct public image URL","query":"optional visual search direction","alt":"optional","rationale":"optional"}}]}.

TEXT RULES:
Title: echo and amplify the claim in ≤8 words. Hard limit: 60 characters. Assertive, not a topic label.
Claim: one sharp assertion, max 16 words. No hedging. No "we believe that". Hard limit: 110 characters.
Body bullets: max 3 items, each under 10 words. Use fragments: "Revenue up 3× in Q4", not sentences. Cut every word that adds no signal. Hard limit per bullet: 72 characters.
Proof title: scannable headline only, hard limit 80 characters.
Proof description: 25 words max, hard limit 160 characters.

CHART TYPE RULES:
When proof.type is "chart", set chartType based on the data story:
bar_horizontal — comparing discrete categories side by side (feature scores, market share by company)
bar_vertical   — ranked values or distribution with short labels (monthly revenue by quarter)
line           — trend over time with 5+ data points (weekly active users, churn over months)
area           — same as line but emphasizing volume/cumulative growth (ARR growth, total signups)
donut          — part-to-whole proportions, 2–5 segments (revenue by segment, traffic sources)
progress       — progress toward a single goal (78% of target reached) — 1 data point only
scatter        — correlation between two variables (deal size vs close rate)
funnel         — conversion drop-off through sequential stages (sign-up → activation → paid)
Rules: use line/area for time-series with 5+ points; bar_horizontal for long category labels; bar_vertical for short labels/ranked data; donut only for proportions; funnel only for sequential conversion; NEVER use bar_horizontal for time-series.

CHART DATA RULES:
Every data point MUST have a numericValue (integer or decimal). Bar, line, area, donut, scatter, and funnel charts need at least 4 data points when the source data supports it. Progress charts use 1 primary data point and may include 1 optional goal/context point. Scatter charts MUST include xValue for the x-axis and numericValue for the y-axis. Labels max 5 words, hard limit 40 characters. Values are real numbers or percentages, hard limit 60 characters. The highest bar tells the story — name it clearly.

COMPARISON RULES:
Two sides MUST have named headers. Use group field: "left" for the before/without side, "right" for the after/with side. First item in each group is the header (label = header text, value = short descriptor). Each side max 3 items after the header. Last item in the right group = the win. Example: {"label":"Without Flowro","value":"Manual","group":"left"},{"label":"4hr/week","value":"reporting","group":"left"},{"label":"With Flowro","value":"Automated","group":"right"},{"label":"10min/week","value":"reporting","group":"right"}.

TIMELINE RULES:
4–5 steps. Each step = a verb phrase (action, not noun). Max 6 words per step.

LAYOUT VARIETY:
Slide 1: always layout=cover. Last slide: always layout=closing.
Middle slides: include at least one timeline or comparison when content supports it.
Never more than 2 consecutive slides with layout=claim_visual.

AVAILABLE LAYOUTS (use the right one for the content):
cover            — title slide; hero treatment, bold headline
claim_visual     — standard slide: left text column, right visual/proof panel
comparison       — two-column before/after or option A vs B (use with proof.type=comparison)
timeline         — horizontal step flow (4–5 steps, use with proof.type=timeline)
data_table       — tabular data with multiple rows (use with proof.type=table)
closing          — final recommendation/CTA slide
big_number       — giant KPI or metric centered on slide; use when one number tells the story (e.g. "3× growth", "$12M ARR")
side_by_side     — two equal columns each with a heading + 3 bullets; for dual-concept or feature-pair slides
quote_highlight  — large pull quote with attribution; for testimonials, analyst quotes, or memorable sound-bites
timeline_vertical— vertical stepped timeline for 5+ steps or roadmap/process with longer descriptions
image_left       — full-bleed image on left 50%, content on right; use when proof.visualAsset has a strong image
image_full       — full-bleed background image with centered overlay text; for section breaks or emotional beats

LOGO RULES:
logo (brand_asset source) appears ONLY on cover and closing slides — never on middle slides.
Do not reference logoSourceId in visualAsset for middle slides.

THEME RULES:
When a source has brandColors (primary, accent, background), use those EXACT hex values for the deck theme — do not invent or approximate colors.
If brandColors.primary and brandColors.accent differ, use primary for theme.accent and adjust foreground/background for contrast.
If no brandColors are provided, derive accent from brand_asset or style_template_guide descriptions.
Never use generic blue (#0066ff range) as accent unless the brand explicitly uses it.
background + foreground must have contrast ratio ≥ 4.5:1.

IMAGE POLICY: Images are optional. Prefer charts, comparisons, timelines, tables, or designed visual panels over raw images. Use source_image only for product/brand proof. Use web_image only when evidence includes a credible direct URL. Otherwise use generated_visual with a descriptive query. Preserve sourceIds and evidenceIds from the outline.`,
      },
      {
        role: "user",
        content: JSON.stringify({
          brief: story.brief,
          outline: story.outline,
          evidence: story.evidence,
          sources: sources.map((source) => ({
            id: source.id,
            name: source.name,
            role: source.role,
            summary: source.summary,
            hasRenderableImage: Boolean(source.dataUrl || source.url),
            width: source.width,
            height: source.height,
            ...(source.brandColors ? { brandColors: source.brandColors } : {}),
          })),
          designSkillBrief: {
            intent: "Create distinctive, presentation-grade slides with varied layouts and no text-only slides.",
            imagePolicy: "Images are optional. Use them only when they clarify or elevate the claim; otherwise use charts, timelines, comparisons, tables, or designed visual panels.",
            visualCandidates: story.evidence.flatMap((item) => item.visualCandidates ?? []).slice(0, 8),
          },
        }),
      },
    ]
    const startedAt = Date.now()
    traceSlidesLlmRequest({ requestId, stage: "deck_json", provider: "openrouter", model, messages, metadata: { outlineCount: story.outline.length, sourceCount: sources.length } })
    const response = await generateCompletion({
      model,
      reasoning: false,
      maxTokens: 50000,
      timeoutMs: 900000,
      maxRetries: 0,
      messages,
    })
    const data = await response.json()
    const content = data?.choices?.[0]?.message?.content
    traceSlidesLlmResponse({ requestId, stage: "deck_json", provider: "openrouter", model, ok: typeof content === "string", status: response.status, durationMs: Date.now() - startedAt, outputChars: typeof content === "string" ? content.length : 0, usage: data?.usage })
    if (typeof content !== "string") {
      return fallbackSlidesDeck(story, sources, "Slides AI returned no deck content, so a deterministic visual fallback was rendered.")
    }

    const parsed = normalizeSlidesDeckJson(JSON.parse(cleanJson(content)), sources)
    const slides = parsed.slides as SlidesStructuredSlide[]
    const validated = slidesDeckSchema.safeParse({
      ...parsed,
      provider: "openrouter",
      updatedAt: new Date().toISOString(),
      diagnostics: {
        webEvidenceStatus: story.evidence.length
          ? story.evidence.some((item) => item.provider === "openai_web_search") ? "ready" : story.evidence.some((item) => item.provider === "failed") ? "failed" : "skipped"
          : "none",
        visualAssetKinds: slides.map((slide) => slide.visualAsset.kind),
      },
    })
    if (!validated.success) {
      return fallbackSlidesDeck(
        story,
        sources,
        `Slides AI returned an invalid deck (${validated.error.issues.map((issue) => issue.path.join(".")).slice(0, 4).join(", ")}), so a deterministic visual fallback was rendered.`
      )
    }
    return validated.data
  } catch (error) {
    traceSlidesLlmFailure({ requestId: createSlidesTraceId("deck_json_error"), stage: "deck_json", provider: "openrouter", model: process.env.OPENROUTER_MODEL_SLIDES || process.env.OPENROUTER_MODEL || "openai/gpt-mini-latest", durationMs: 0, error })
    return fallbackSlidesDeck(story, sources, error instanceof Error
      ? `Slides AI deck generation failed (${error.message.slice(0, 120)}), so a deterministic visual fallback was rendered.`
      : "Slides AI deck generation failed, so a deterministic visual fallback was rendered.")
  }
}

// ─── Path A: slideCode generation ─────────────────────────────────────────────
// Replaces the JSON-shaped deck with LLM-emitted JS that builds slides via pptxgenjs primitives.
// The legacy `generateSlidesDeck` / `slides[]` path stays in place for now so existing routes
// keep working; once Path A is fully wired through the UI and exporter, the legacy path can be
// deleted (Phase 3+ cleanup).

const PRES_API_DECLARATION = `
// AVAILABLE API (subset of pptxgenjs you may use)
type Color = string                 // 6-hex, no '#': e.g. "0D1B3E"
type Inches = number                // pptxgenjs canvas is 13.33 × 7.5 inches
type Fill = { color: Color; transparency?: number /* 0–100 */ }
type Line = { color: Color; transparency?: number; pt?: number; dashType?: "dash"|"solid" }
type TextOpts = {
  x: Inches; y: Inches; w: Inches; h: Inches
  fontSize?: number; fontFace?: string; bold?: boolean; italic?: boolean
  color?: Color; align?: "left"|"center"|"right"; valign?: "top"|"middle"|"bottom"
  charSpacing?: number; fill?: Fill; paraSpaceAfter?: number
}
type ShapeOpts = { x: Inches; y: Inches; w: Inches; h: Inches; rectRadius?: number; fill?: Fill; line?: Line; rotate?: number }
type ImageOpts = { x: Inches; y: Inches; w: Inches; h: Inches; data?: string; path?: string; altText?: string; rounding?: boolean }
type ChartData = Array<{ name: string; labels: string[]; values: number[] }>
type ChartOpts = { x: Inches; y: Inches; w: Inches; h: Inches; barDir?: "col"|"bar"; showLegend?: boolean; chartColors?: Color[]; catAxisLabelFontSize?: number; valAxisLabelFontSize?: number }

interface Slide {
  background: { color: Color }
  addShape(shape: string, opts: ShapeOpts): void
  addText(text: string, opts: TextOpts): void
  addImage(opts: ImageOpts): void
  addChart(chartType: string, data: ChartData, opts: ChartOpts): void
  addNotes(text: string): void
}

interface Pres {
  addSlide(): Slide
  shapes: { OVAL: string; RECTANGLE: string; ROUNDED_RECTANGLE: string; LINE: string; TRIANGLE: string; DIAMOND: string }
  charts: { BAR: string; LINE: string; DOUGHNUT: string; PIE: string; SCATTER: string; AREA: string }
}
`.trim()

const PRES_API_EXAMPLES = `
// EXAMPLE — Cover slide
const C = { navy: "0D1B3E", accent: "00E5C3", white: "FFFFFF", muted: "DDE3EA" }
{
  const s = pres.addSlide()
  s.background = { color: C.navy }
  // Decorative blob — low-opacity oval at the corner
  s.addShape(pres.shapes.OVAL, { x: 8.4, y: -1.6, w: 5.6, h: 5.6, fill: { color: C.accent, transparency: 78 }, line: { color: C.accent, transparency: 100 } })
  // Brand mark + headline
  if (assets.logo) s.addImage({ data: assets.logo, x: 0.6, y: 0.55, w: 0.6, h: 0.6 })
  s.addText("Workflow Intelligence\\nThat Pays For Itself.", { x: 0.6, y: 2.0, w: 8.5, h: 2.0, fontSize: 44, bold: true, color: C.white, fontFace: "Trebuchet MS" })
  s.addText("FLOWRO  ·  INVESTOR DECK  ·  2026", { x: 0.6, y: 6.4, w: 6.0, h: 0.3, fontSize: 9, bold: true, color: C.accent, charSpacing: 1.6, fontFace: "Aptos" })
  s.addNotes("Open with the value prop.")
}

// EXAMPLE — Chart slide (real native chart, not rectangles)
{
  const s = pres.addSlide()
  s.background = { color: "FFFFFF" }
  s.addText("ARR ACCELERATION", { x: 0.6, y: 0.55, w: 4.0, h: 0.22, fontSize: 9, bold: true, color: "00E5C3", charSpacing: 1.4 })
  s.addText("Revenue compounds as workspaces ship more decks per founder", { x: 0.6, y: 0.95, w: 12.0, h: 1.0, fontSize: 28, bold: true, color: "151515", fontFace: "Georgia" })
  s.addChart(pres.charts.BAR, [{ name: "ARR ($M)", labels: ["Q1","Q2","Q3","Q4","Q1+1"], values: [1.2,2.0,3.1,4.6,6.4] }],
    { x: 0.6, y: 2.2, w: 6.0, h: 4.6, barDir: "col", showLegend: false, chartColors: ["00E5C3"] })
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 6.95, y: 2.2, w: 6.0, h: 4.6, rectRadius: 0.1, fill: { color: "0D1B3E" }, line: { color: "0D1B3E" } })
  s.addText("5.3×", { x: 7.2, y: 2.6, w: 5.5, h: 1.6, fontSize: 80, bold: true, color: "00E5C3", fontFace: "Trebuchet MS" })
  s.addText("growth across the past 5 quarters", { x: 7.2, y: 4.1, w: 5.5, h: 0.6, fontSize: 16, color: "FFFFFF" })
}

// EXAMPLE — Comparison slide
{
  const s = pres.addSlide()
  s.background = { color: "FFFFFF" }
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.6, y: 2.3, w: 6.0, h: 4.6, rectRadius: 0.1, fill: { color: "F4F6FB" }, line: { color: "D9DEE8" } })
  s.addText("BEFORE", { x: 0.85, y: 2.55, w: 5.5, h: 0.3, fontSize: 10, bold: true, color: "5F6B7A", charSpacing: 1.2 })
  s.addText("• Context lost between threads\\n• 4 hrs/week reporting", { x: 0.85, y: 3.7, w: 5.5, h: 2.8, fontSize: 12, color: "5F6B7A", paraSpaceAfter: 6 })
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 6.95, y: 2.3, w: 6.0, h: 4.6, rectRadius: 0.1, fill: { color: "0D1B3E" }, line: { color: "0D1B3E" } })
  s.addText("AFTER · WITH FLOWRO", { x: 7.2, y: 2.55, w: 5.5, h: 0.3, fontSize: 10, bold: true, color: "00E5C3", charSpacing: 1.2 })
  s.addText("• Decision-grade artifacts\\n• 10 min/week reporting", { x: 7.2, y: 3.7, w: 5.5, h: 2.8, fontSize: 12, color: "FFFFFF", paraSpaceAfter: 6 })
}
`.trim()

function slideCodeSystemPrompt(args: { assetManifest: string; theme: string; dataContext?: string }): string {
  return `You are the slide-code emitter for Flowro Slides (Path A).

Your job: emit a JavaScript snippet that, when executed against a pptxgenjs-compatible \`pres\` object,
builds a designed presentation deck. Do NOT emit JSON. Do NOT emit prose. Emit ONE \`\`\`js code block whose
contents are the body of an \`async function build(pres, assets) { ... }\` (you do not need to write the
function declaration — just the body).

${PRES_API_DECLARATION}

ASSETS AVAILABLE TO YOU (reference as \`assets.<key>\`):
${args.assetManifest || "  (no asset bag — use only shapes, text, and charts)"}
${args.dataContext ? `\n${args.dataContext}\n` : ""}
THEME GUIDANCE: ${args.theme}
When a brand palette is provided above, you MUST use those exact hex values for backgrounds, accent bars,
chart colors, and highlight text. Do not substitute or approximate.
When no brand palette is provided, use exactly one named preset from this set and make the choice visible
through repeated color usage, not text labels: navy, forest, mono, warm. Do not drift into generic blue.

DESIGN RULES (non-negotiable):
1. 6–10 slides total. First slide = cover. Last slide = closing/call-to-action.
2. Every slide MUST have a unique composition. No two slides identical in layout.
3. Vary backgrounds: alternate dark (navy or brand primary) and light (#FFFFFF or #F4F6FB) slides for rhythm.
4. Every slide MUST include at least one decorative shape (oval, rounded rect, accent bar) that aids hierarchy.
5. Use REAL pres.charts.BAR / LINE / DOUGHNUT / SCATTER / AREA when the slide is data-driven.
   If real table data is provided above, use those exact numbers in chart values arrays.
   NEVER simulate a chart with rectangles when a real chart is appropriate.
6. assets.logo → ONLY on cover (top-left, w≈0.6, h≈0.6) and closing slide. NEVER on middle slides.
   If assets.screenshot_1 exists, place it on a dedicated product slide inside a slightly inset frame.
7. Pull real numbers from the brief, outline, and data tables; do not invent metrics.
8. Use Aptos / Trebuchet MS / Georgia as fontFace. Default body 11–14pt; headings 24–44pt.
9. Stay within the 13.33 × 7.5 canvas. Margins ≥ 0.5 in.
10. Add \`s.addNotes("...")\` to every slide with the speaker intent (≤ 280 chars). These notes are exported to PowerPoint speaker notes.

QUALITY BAR: A viewer should identify the main claim of any slide in 3 seconds. The deck should visually
rival a designer's deck in Keynote — not a templated SaaS deck.

WORKED EXAMPLES (do not copy verbatim — vary the composition for the user's content):

${PRES_API_EXAMPLES}

OUTPUT FORMAT: a single \`\`\`js block. Nothing else. No prose before or after.`
}

function themeFromSources(sources: SlidesSource[], story?: SlidesDeckStory): { background: string; foreground: string; accent: string; muted: string; description: string; preset?: ThemePresetName } {
  const brand = sources.find((s) => s.role === "brand_asset" && s.brandColors)
  if (brand?.brandColors) {
    return {
      background: brand.brandColors.background,
      foreground: "#151515",
      accent: brand.brandColors.accent,
      muted: "#5F6B7A",
      description: `Use the user's brand palette. Primary ${brand.brandColors.primary}, accent ${brand.brandColors.accent}, background ${brand.brandColors.background}.`,
    }
  }
  const presetName = selectThemePreset(story)
  const preset = THEME_PRESETS[presetName]
  return {
    background: preset.background,
    foreground: preset.foreground,
    accent: preset.accent,
    muted: preset.muted,
    preset: presetName,
    description: `No brand uploaded — use the ${preset.description}. Use preset primary ${preset.primary} for dark backgrounds and preset accent ${preset.accent} for charts, bars, and highlights.`,
  }
}

// Phase 3: theme derived from vision-classified AssetRecord[] dominantColors.
// Priority: intentRole=logo/brand brandColors > vision dominantColors > legacy SVG extraction > default.
function themeFromAssetRecords(records: AssetRecord[], story?: SlidesDeckStory): { background: string; foreground: string; accent: string; muted: string; description: string; preset?: ThemePresetName } {
  const logoRecord = records.find(
    (r) => (r.role === "logo" || r.role === "brand_guideline") && r.brandColors,
  )
  if (logoRecord?.brandColors) {
    const bc = logoRecord.brandColors
    return {
      background: bc.background,
      foreground: isLightHex(bc.background) ? "#151515" : "#FFFFFF",
      accent: bc.accent,
      muted: "#5F6B7A",
      description: `Brand palette from vision-classified asset. Primary ${bc.primary}, accent ${bc.accent}, background ${bc.background}. USE THESE EXACT HEX VALUES — do not approximate.`,
    }
  }
  // Fall back to any record that has dominantColors with at least 2 chromatic colors
  const withColors = records.find(
    (r) => r.properties.dominantColors && r.properties.dominantColors.length >= 2,
  )
  if (withColors?.properties.dominantColors) {
    const [primary, accent] = withColors.properties.dominantColors
    const background = withColors.properties.dominantColors.find(isLightHex) ?? "#FFFFFF"
    return {
      background,
      foreground: isLightHex(background) ? "#151515" : "#FFFFFF",
      accent: accent ?? primary,
      muted: "#5F6B7A",
      description: `Brand colors extracted from uploaded asset via vision. Dominant: ${withColors.properties.dominantColors.slice(0, 3).join(", ")}. Use these hex values for the deck palette.`,
    }
  }
  const presetName = selectThemePreset(story)
  const preset = THEME_PRESETS[presetName]
  return {
    background: preset.background,
    foreground: preset.foreground,
    accent: preset.accent,
    muted: preset.muted,
    preset: presetName,
    description: `No brand uploaded — use the ${preset.description}. Use preset primary ${preset.primary} for dark backgrounds and preset accent ${preset.accent} for charts, bars, and highlights.`,
  }
}

function isLightHex(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r + g + b) / 3 > 140
}

// Phase 3: build a data context block from AssetRecord extracted tables so the LLM
// can reference real numbers when writing chart calls.
function dataContextFromRecords(records: AssetRecord[]): string {
  const dataRecords = records.filter((r) => r.extracted?.tables?.length)
  if (!dataRecords.length) return ""
  const lines: string[] = ["DATA AVAILABLE FOR CHARTS (use real numbers from these tables):"]
  for (const r of dataRecords.slice(0, 3)) {
    const t = r.extracted?.tables?.[0]
    if (!t) continue
    lines.push(`Table from ${r.filename}:`)
    lines.push(`  Headers: ${t.headers.join(", ")}`)
    lines.push(`  Rows (first ${t.rows.length}):`)
    for (const row of t.rows.slice(0, 5)) {
      lines.push(`    ${row.join(" | ")}`)
    }
  }
  return lines.join("\n")
}

export async function generateSlidesDeckCode({
  story,
  sources,
  evidence,
  legacyDeck,
  assetRecords,
}: {
  story: SlidesDeckStory
  sources: SlidesSource[]
  evidence?: SlidesEvidence[]
  legacyDeck?: SlidesDeck
  assetRecords?: AssetRecord[]
}): Promise<{ slideCode: string; assets: SlidesAssetBag; theme: { background: string; foreground: string; accent: string; muted: string }; provider: "openrouter" | "deterministic"; diagnostics: { fallbackReason?: string; sandboxStage: "validate" | "execute" | "limit" | "ok"; sandboxError?: string; sandboxDurationMs?: number; themePreset?: ThemePresetName; slideCodeAttemptCount?: number; slideCodeRequestIds?: string[]; slideCodeDebugFiles?: string[]; slideCodeNotesCount?: number; slideCodeThumbnailCount?: number } }> {
  // Phase 3: prefer AssetRecord-derived theme (vision colors) over legacy SVG extraction
  const theme = assetRecords?.length ? themeFromAssetRecords(assetRecords, story) : themeFromSources(sources, story)
  const assets = await buildAssetBag({ sources, assetRecords, evidence: evidence ?? story.evidence ?? [] })
  // Richer manifest when AssetRecord[] is available (includes role, description, usableAs)
  const manifest = assetRecords?.length ? describeAssetRecords(assetRecords) : describeAssetBag(assets)
  const dataContext = assetRecords?.length ? dataContextFromRecords(assetRecords) : ""
  const fallbackTitle = story.outline[0]?.title || legacyDeck?.title || "Generated deck"
  const fallbackSubtitle = story.brief.desiredOutcome || ""

  const requestIds: string[] = []
  const debugFiles: string[] = []
  const lastRequestId = (stage: string) => requestIds[requestIds.length - 1] ?? createSlidesTraceId(stage)
  const fallback = (reason?: string) => ({
    slideCode: buildMinimalFallbackSlideCode({ title: fallbackTitle, subtitle: fallbackSubtitle, theme: { background: theme.background.replace(/^#/, ""), foreground: theme.foreground.replace(/^#/, ""), accent: theme.accent.replace(/^#/, ""), muted: theme.muted.replace(/^#/, "") } }),
    assets,
    theme,
    provider: "deterministic" as const,
    diagnostics: {
      ...(reason ? { fallbackReason: reason.slice(0, 240) } : {}),
      sandboxStage: "ok" as const,
      ...(theme.preset ? { themePreset: theme.preset } : {}),
      slideCodeAttemptCount: requestIds.length,
      ...(requestIds.length ? { slideCodeRequestIds: requestIds } : {}),
      ...(debugFiles.length ? { slideCodeDebugFiles: debugFiles } : {}),
    },
  })

  const validateCandidate = async (code: string) => {
    const extracted = extractBuildBody(code)
    if ("error" in extracted) {
      traceSlidesLlmResponse({ requestId: lastRequestId("slide_code_validate"), stage: "slide_code_validate", provider: "openrouter", model: process.env.OPENROUTER_MODEL_SLIDES_CODE || process.env.OPENROUTER_MODEL_SLIDES || process.env.OPENROUTER_MODEL || "anthropic/claude-sonnet-4-6", ok: false, durationMs: 0, outputChars: code.length, metadata: { reason: extracted.error } })
      return { ok: false as const, stage: "validate" as const, error: extracted.error, reasons: [extracted.error] }
    }
    const staticGate = validateSlideCode(extracted.body)
    if (!staticGate.ok) {
      traceSlidesLlmResponse({ requestId: lastRequestId("slide_code_validate"), stage: "slide_code_validate", provider: "openrouter", model: process.env.OPENROUTER_MODEL_SLIDES_CODE || process.env.OPENROUTER_MODEL_SLIDES || process.env.OPENROUTER_MODEL || "anthropic/claude-sonnet-4-6", ok: false, durationMs: 0, outputChars: code.length, metadata: { reason: staticGate.reason } })
      return { ok: false as const, stage: "validate" as const, error: staticGate.reason, reasons: [staticGate.reason] }
    }

    const previewPres = new PreviewPres({ maxSlides: 24, maxShapesPerSlide: 80 })
    const execution = await runSlideCode({
      code,
      pres: previewPres,
      options: {
        target: "preview",
        assets,
        wallClockMs: 8000,
        maxSlides: 24,
        maxShapesPerSlide: 80,
      },
    })

    if (!execution.ok) {
      traceSlidesLlmResponse({ requestId: lastRequestId("slide_code_validate"), stage: "slide_code_validate", provider: "openrouter", model: process.env.OPENROUTER_MODEL_SLIDES_CODE || process.env.OPENROUTER_MODEL_SLIDES || process.env.OPENROUTER_MODEL || "anthropic/claude-sonnet-4-6", ok: false, durationMs: execution.diagnostics.durationMs, outputChars: code.length, metadata: { sandboxStage: execution.stage, sandboxError: execution.error } })
      return {
        ok: false as const,
        stage: execution.stage,
        error: execution.error,
        reasons: [`sandbox ${execution.stage} failed: ${execution.error}`],
        durationMs: execution.diagnostics.durationMs,
      }
    }

    const previewDeck = previewPres.finalize()
    const primitiveValidation = validatePreviewDeckPrimitives(previewDeck)
    if (!primitiveValidation.ok) {
      traceSlidesLlmResponse({ requestId: lastRequestId("slide_code_validate"), stage: "slide_code_validate", provider: "openrouter", model: process.env.OPENROUTER_MODEL_SLIDES_CODE || process.env.OPENROUTER_MODEL_SLIDES || process.env.OPENROUTER_MODEL || "anthropic/claude-sonnet-4-6", ok: false, durationMs: execution.diagnostics.durationMs, outputChars: code.length, metadata: { rejectionReasons: primitiveValidation.reasons.slice(0, 8), slideCount: previewDeck.slides.length } })
      return {
        ok: false as const,
        stage: "validate" as const,
        error: primitiveValidation.reasons.join("; ").slice(0, 400),
        reasons: primitiveValidation.reasons,
        durationMs: execution.diagnostics.durationMs,
      }
    }

    traceSlidesLlmResponse({ requestId: lastRequestId("slide_code_validate"), stage: "slide_code_validate", provider: "openrouter", model: process.env.OPENROUTER_MODEL_SLIDES_CODE || process.env.OPENROUTER_MODEL_SLIDES || process.env.OPENROUTER_MODEL || "anthropic/claude-sonnet-4-6", ok: true, durationMs: execution.diagnostics.durationMs, outputChars: code.length, metadata: { slideCount: previewDeck.slides.length, notesCount: previewDeck.slides.filter((slide) => slide.notes.trim()).length, thumbnailCount: previewDeck.slides.length } })
    return {
      ok: true as const,
      durationMs: execution.diagnostics.durationMs,
      notesCount: previewDeck.slides.filter((slide) => slide.notes.trim()).length,
      thumbnailCount: previewDeck.slides.length,
    }
  }

  const requestSlideCode = async (retryPayload?: Record<string, unknown>) => {
    const model = process.env.OPENROUTER_MODEL_SLIDES_CODE || process.env.OPENROUTER_MODEL_SLIDES || process.env.OPENROUTER_MODEL || "anthropic/claude-sonnet-4-6"
    const requestId = createSlidesTraceId(retryPayload ? "slide_code_retry" : "slide_code")
    requestIds.push(requestId)
    const messages: Message[] = [
      { role: "system", content: slideCodeSystemPrompt({ assetManifest: manifest, theme: theme.description, dataContext }) },
      {
        role: "user",
        content: JSON.stringify({
          ...(retryPayload ?? {}),
          brief: story.brief,
          outline: story.outline,
          evidence: (evidence ?? story.evidence ?? []).map((e) => ({ id: e.id, query: e.query, summary: e.summary, citations: e.citations })),
          legacySlideHints: legacyDeck?.slides?.map((s) => ({ title: s.title, claim: s.claim, layout: s.layout, proofType: s.proof.type })) ?? [],
        }),
      },
    ]
    const startedAt = Date.now()
    traceSlidesLlmRequest({
      requestId,
      stage: retryPayload ? "slide_code_retry" : "slide_code",
      provider: "openrouter",
      model,
      attempt: requestIds.length,
      messages,
      metadata: {
        outlineCount: story.outline.length,
        sourceCount: sources.length,
        assetRecordCount: assetRecords?.length ?? 0,
        assetKeys: Object.keys(assets),
        themePreset: theme.preset ?? "brand",
        hasDataContext: Boolean(dataContext),
      },
    })
    const response = await generateCompletion({
      model,
      reasoning: false,
      maxTokens: 50000,
      timeoutMs: 90000,
      maxRetries: 0,
      messages,
    })
    const data = await response.json()
    const content = data?.choices?.[0]?.message?.content
    const finishReason = data?.choices?.[0]?.finish_reason
    if (typeof content === "string") {
      const savedPath = await saveGeneratedSlideCodeFile({
        requestId,
        stage: retryPayload ? "slide_code_retry" : "slide_code",
        model,
        attempt: requestIds.length,
        content,
        finishReason,
      })
      if (savedPath) debugFiles.push(savedPath)
    }
    traceSlidesLlmResponse({
      requestId,
      stage: retryPayload ? "slide_code_retry" : "slide_code",
      provider: "openrouter",
      model,
      ok: typeof content === "string",
      status: response.status,
      durationMs: Date.now() - startedAt,
      outputChars: typeof content === "string" ? content.length : 0,
      usage: data?.usage,
      metadata: { finishReason, ...(debugFiles.length ? { savedCodeFile: debugFiles[debugFiles.length - 1] } : {}) },
    })
    return typeof content === "string" ? content : undefined
  }

  if (!process.env.OPENROUTER_API_KEY) {
    return fallback("no OPENROUTER_API_KEY — using deterministic fallback")
  }

  try {
    const content = await requestSlideCode()
    if (typeof content !== "string") return fallback("LLM returned no slideCode content")

    const validated = await validateCandidate(content)
    if (validated.ok) {
      return {
        slideCode: content,
        assets,
        theme,
        provider: "openrouter",
        diagnostics: {
          sandboxStage: "ok",
          sandboxDurationMs: validated.durationMs,
          ...(theme.preset ? { themePreset: theme.preset } : {}),
          slideCodeAttemptCount: requestIds.length,
          slideCodeRequestIds: requestIds,
          ...(debugFiles.length ? { slideCodeDebugFiles: debugFiles } : {}),
          slideCodeNotesCount: validated.notesCount,
          slideCodeThumbnailCount: validated.thumbnailCount,
        },
      }
    }

    const retryContent = await requestSlideCode({
      previousAttempt: content.slice(0, 4000),
      rejectionReasons: validated.reasons,
      retryInstruction: "The previous slideCode failed validation. Fix the listed issues, preserve the same deck story, and emit ONLY the build body inside one ```js block.",
    })
    if (typeof retryContent !== "string") return fallback(`retry returned no content after ${validated.stage}: ${validated.error}`)

    const retryValidated = await validateCandidate(retryContent)
    if (!retryValidated.ok) {
      return fallback(`slideCode validation failed after retry: ${retryValidated.error}`)
    }
    return {
      slideCode: retryContent,
      assets,
      theme,
      provider: "openrouter",
      diagnostics: {
        sandboxStage: "ok",
        sandboxDurationMs: retryValidated.durationMs,
        ...(theme.preset ? { themePreset: theme.preset } : {}),
        slideCodeAttemptCount: requestIds.length,
        slideCodeRequestIds: requestIds,
        ...(debugFiles.length ? { slideCodeDebugFiles: debugFiles } : {}),
        slideCodeNotesCount: retryValidated.notesCount,
        slideCodeThumbnailCount: retryValidated.thumbnailCount,
      },
    }
  } catch (err) {
    traceSlidesLlmFailure({ requestId: lastRequestId("slide_code_error"), stage: "slide_code", provider: "openrouter", model: process.env.OPENROUTER_MODEL_SLIDES_CODE || process.env.OPENROUTER_MODEL_SLIDES || process.env.OPENROUTER_MODEL || "anthropic/claude-sonnet-4-6", durationMs: 0, error: err })
    return fallback(err instanceof Error ? err.message.slice(0, 200) : "unknown error")
  }
}

export async function editSlidesDeck({
  deck,
  story,
  instruction,
  slideId,
}: {
  deck: SlidesDeck
  story: SlidesDeckStory
  instruction: string
  slideId?: string
}): Promise<SlidesDeck> {
  const fallback = {
    ...deck,
    slides: deck.slides.map((slide) => {
      if (slideId && slide.id !== slideId) return slide
      return {
        ...slide,
        body: [`Edited instruction: ${instruction.slice(0, 140)}`, ...slide.body].slice(0, 5),
        speakerNotes: `${slide.speakerNotes}\n\nEdit applied: ${instruction.slice(0, 180)}`,
      }
    }),
    updatedAt: new Date().toISOString(),
  }
  if (!process.env.OPENROUTER_API_KEY) return fallback

  try {
    const model = process.env.OPENROUTER_MODEL_SLIDES || process.env.OPENROUTER_MODEL || "openai/gpt-mini-latest"
    const requestId = createSlidesTraceId("deck_edit")
    const messages: Message[] = [
      {
        role: "system",
        content: `Apply an AI edit to a structured deck. Return the full updated deck JSON only. Preserve sourceIds, evidenceIds, and useful visualAsset intent unless the instruction explicitly asks to change them. Keep slide claims specific and every non-cover slide proof-backed. Images remain optional: use them only when they materially improve the slide.`,
      },
      {
        role: "user",
        content: JSON.stringify({ instruction, slideId, story, deck }),
      },
    ]
    const startedAt = Date.now()
    traceSlidesLlmRequest({ requestId, stage: "deck_edit", provider: "openrouter", model, messages, metadata: { slideId: slideId ?? "deck", slideCount: deck.slides.length } })
    const response = await generateCompletion({
      model,
      reasoning: false,
      maxTokens: 50000,
      timeoutMs: 900000,
      maxRetries: 0,
      messages,
    })
    const data = await response.json()
    const content = data?.choices?.[0]?.message?.content
    traceSlidesLlmResponse({ requestId, stage: "deck_edit", provider: "openrouter", model, ok: typeof content === "string", status: response.status, durationMs: Date.now() - startedAt, outputChars: typeof content === "string" ? content.length : 0, usage: data?.usage })
    if (typeof content !== "string") return fallback

    const parsed = normalizeSlidesDeckJson(JSON.parse(cleanJson(content)), [])
    const slides = parsed.slides as SlidesStructuredSlide[]
    const validated = slidesDeckSchema.safeParse({
      ...parsed,
      provider: "openrouter",
      updatedAt: new Date().toISOString(),
      diagnostics: {
        ...deck.diagnostics,
        visualAssetKinds: slides.map((slide) => slide.visualAsset.kind),
      },
    })
    return validated.success ? validated.data : fallback
  } catch (error) {
    traceSlidesLlmFailure({ requestId: createSlidesTraceId("deck_edit_error"), stage: "deck_edit", provider: "openrouter", model: process.env.OPENROUTER_MODEL_SLIDES || process.env.OPENROUTER_MODEL || "openai/gpt-mini-latest", durationMs: 0, error })
    return fallback
  }
}
