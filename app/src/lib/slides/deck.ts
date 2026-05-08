import { generateCompletion } from "@/lib/openrouter"
import {
  slidesDeckSchema,
  type SlidesDeck,
  type SlidesDeckStory,
  type SlidesProofObject,
  type SlidesSource,
  type SlidesStructuredSlide,
  type SlidesVisualAsset,
} from "@/lib/slides/schema"

function cleanJson(raw: string): string {
  return raw.trim().replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "")
}

function truncate(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : ""
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
  const layouts = new Set(["cover", "claim_visual", "comparison", "timeline", "data_table", "closing"])
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
          title: truncate(proof?.title, 80) || truncate(slide.title, 60) || "Visual proof",
          description: truncate(proof?.description, 160) || truncate(slide.claim, 110) || "Designed proof for the slide claim.",
          data: (Array.isArray(proof?.data) ? proof.data : [])
            .map((item) => item as Record<string, unknown>)
            .map((item) => ({
              label: truncate(item.label, 40),
              value: truncate(item.value, 60),
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

function fallbackProof(item: SlidesDeckStory["outline"][number], index: number): SlidesProofObject {
  const proofDataByType: Record<string, SlidesProofObject["data"]> = {
    comparison: [
      { label: "Current path", value: "Keeps the gap unresolved" },
      { label: "Recommended path", value: "Turns the claim into action" },
    ],
    timeline: [
      { label: "Frame", value: "Clarify the decision" },
      { label: "Prove", value: "Use available evidence" },
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
    const response = await generateCompletion({
      model: process.env.OPENROUTER_MODEL_SLIDES || process.env.OPENROUTER_MODEL || "openai/gpt-mini-latest",
      reasoning: false,
      maxTokens: 10000,
      timeoutMs: 90000,
      maxRetries: 0,
      messages: [
        {
          role: "system",
          content: `You generate structured presentation slides for Flowro Slides. Return JSON only with {"title","subtitle","theme":{"background","foreground","accent","muted"},"slides":[{"id","slideNumber","title","claim","body":["max 3 bullets"],"proof":{"type":"chart|image|comparison|timeline|diagram|table|source_backed_visual","title","description","data":[{"label","value","numericValue":0,"group":"optional","tone":"accent|positive|warning|neutral|muted"}]},"speakerNotes","sourceIds":["..."],"evidenceIds":["..."],"layout":"cover|claim_visual|comparison|timeline|data_table|closing","visualTone","visualAsset":{"kind":"none|source_image|web_image|generated_visual","sourceId":"optional","evidenceId":"optional","url":"optional direct public image URL","query":"optional visual search direction","alt":"optional","rationale":"optional"}}]}.

TEXT RULES:
Title: echo and amplify the claim in ≤8 words. Hard limit: 60 characters. Assertive, not a topic label.
Claim: one sharp assertion, max 16 words. No hedging. No "we believe that". Hard limit: 110 characters.
Body bullets: max 3 items, each under 10 words. Use fragments: "Revenue up 3× in Q4", not sentences. Cut every word that adds no signal. Hard limit per bullet: 72 characters.
Proof title: scannable headline only, hard limit 80 characters.
Proof description: 25 words max, hard limit 160 characters.

CHART DATA RULES:
Every data point MUST have a numericValue (integer or decimal). Minimum 4 data points. Labels max 5 words, hard limit 40 characters. Values are real numbers or percentages, hard limit 60 characters. The highest bar tells the story — name it clearly.

COMPARISON RULES:
Two sides MUST have named headers (e.g. "Without Flowro" / "With Flowro", "Old Way" / "New Way"). Each side max 3 items. Last item in the right column = the win.

TIMELINE RULES:
4–5 steps. Each step = a verb phrase (action, not noun). Max 6 words per step.

LAYOUT VARIETY:
Slide 1: always layout=cover. Last slide: always layout=closing.
Middle slides: include at least one timeline or comparison when content supports it.
Never more than 2 consecutive slides with layout=claim_visual.

THEME RULES:
Derive accent color from attached brand_asset or style_template_guide when available.
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
            })),
            designSkillBrief: {
              intent: "Create distinctive, presentation-grade slides with varied layouts and no text-only slides.",
              imagePolicy: "Images are optional. Use them only when they clarify or elevate the claim; otherwise use charts, timelines, comparisons, tables, or designed visual panels.",
              visualCandidates: story.evidence.flatMap((item) => item.visualCandidates ?? []).slice(0, 8),
            },
          }),
        },
      ],
    })
    const data = await response.json()
    const content = data?.choices?.[0]?.message?.content
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
    return fallbackSlidesDeck(story, sources, error instanceof Error
      ? `Slides AI deck generation failed (${error.message.slice(0, 120)}), so a deterministic visual fallback was rendered.`
      : "Slides AI deck generation failed, so a deterministic visual fallback was rendered.")
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
    const response = await generateCompletion({
      model: process.env.OPENROUTER_MODEL_SLIDES || process.env.OPENROUTER_MODEL || "openai/gpt-mini-latest",
      reasoning: false,
      maxTokens: 10000,
      timeoutMs: 90000,
      maxRetries: 0,
      messages: [
        {
          role: "system",
          content: `Apply an AI edit to a structured deck. Return the full updated deck JSON only. Preserve sourceIds, evidenceIds, and useful visualAsset intent unless the instruction explicitly asks to change them. Keep slide claims specific and every non-cover slide proof-backed. Images remain optional: use them only when they materially improve the slide.`,
        },
        {
          role: "user",
          content: JSON.stringify({ instruction, slideId, story, deck }),
        },
      ],
    })
    const data = await response.json()
    const content = data?.choices?.[0]?.message?.content
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
  } catch {
    return fallback
  }
}
