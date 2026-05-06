import { generateCompletion } from "@/lib/openrouter"
import {
  slidesDeckSchema,
  type SlidesDeck,
  type SlidesDeckStory,
  type SlidesSource,
  type SlidesStructuredSlide,
} from "@/lib/slides/schema"

function cleanJson(raw: string): string {
  return raw.trim().replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "")
}

const DEFAULT_THEME = {
  background: "#f7f4ee",
  foreground: "#151515",
  accent: "#4169ff",
  muted: "#6f6c66",
}

function fallbackSlide(story: SlidesDeckStory, item: SlidesDeckStory["outline"][number], index: number): SlidesStructuredSlide {
  const isCover = index === 0
  const isLast = index === story.outline.length - 1
  return {
    id: item.id,
    slideNumber: index + 1,
    title: item.title,
    claim: item.claim,
    body: [
      item.speakerIntent,
      item.sourceIds.length || item.evidenceIds.length
        ? "Grounded in the available source inventory and mapped evidence."
        : "Keep this claim directional until stronger source material is added.",
    ],
    proof: {
      type: item.proofType,
      title: `${item.proofType.replace(/_/g, " ")} proof`,
      description: item.sourceIds.length || item.evidenceIds.length
        ? "This visual should make the claim inspectable through the mapped sources."
        : "This visual should clarify the claim without inventing unsupported specifics.",
      data: item.sourceIds.slice(0, 4).map((sourceId, sourceIndex) => ({
        label: `Source ${sourceIndex + 1}`,
        value: sourceId,
      })),
    },
    speakerNotes: item.speakerIntent,
    sourceIds: item.sourceIds,
    evidenceIds: item.evidenceIds,
    layout: isCover ? "cover" : isLast ? "closing" : item.proofType === "timeline" ? "timeline" : item.proofType === "table" ? "data_table" : item.proofType === "comparison" ? "comparison" : "claim_visual",
    visualTone: story.brief.tone,
  }
}

export function fallbackSlidesDeck(story: SlidesDeckStory): SlidesDeck {
  return {
    title: story.outline[0]?.title || "Generated deck",
    subtitle: story.brief.desiredOutcome,
    theme: DEFAULT_THEME,
    slides: story.outline.map((item, index) => fallbackSlide(story, item, index)),
    provider: "deterministic",
    updatedAt: new Date().toISOString(),
  }
}

export async function generateSlidesDeck({
  story,
  sources,
}: {
  story: SlidesDeckStory
  sources: SlidesSource[]
}): Promise<SlidesDeck> {
  const fallback = fallbackSlidesDeck(story)
  if (!process.env.OPENROUTER_API_KEY) return fallback

  try {
    const response = await generateCompletion({
      model: process.env.OPENROUTER_MODEL || "deepseek/deepseek-chat",
      reasoning: false,
      maxTokens: 5200,
      timeoutMs: 45000,
      maxRetries: 0,
      messages: [
        {
          role: "system",
          content: `You generate structured presentation slides for Flowro Slides. Return JSON only with {"title","subtitle","theme":{"background","foreground","accent","muted"},"slides":[{"id","slideNumber","title","claim","body":["1-5 concise bullets"],"proof":{"type":"chart|image|comparison|timeline|diagram|table|source_backed_visual","title","description","data":[{"label","value"}]},"speakerNotes","sourceIds":["..."],"evidenceIds":["..."],"layout":"cover|claim_visual|comparison|timeline|data_table|closing","visualTone"}]}. Every slide needs one clear claim. Every non-cover slide needs a proof object. Preserve sourceIds and evidenceIds from the outline unless the instruction explicitly removes them.`,
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
            })),
          }),
        },
      ],
    })
    const data = await response.json()
    const content = data?.choices?.[0]?.message?.content
    if (typeof content !== "string") return fallback

    const parsed = JSON.parse(cleanJson(content))
    const validated = slidesDeckSchema.safeParse({
      ...parsed,
      provider: "openrouter",
      updatedAt: new Date().toISOString(),
    })
    return validated.success ? validated.data : fallback
  } catch {
    return fallback
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
      model: process.env.OPENROUTER_MODEL || "deepseek/deepseek-chat",
      reasoning: false,
      maxTokens: 5200,
      timeoutMs: 45000,
      maxRetries: 0,
      messages: [
        {
          role: "system",
          content: `Apply an AI edit to a structured deck. Return the full updated deck JSON only. Preserve sourceIds and evidenceIds unless the instruction explicitly asks to ignore or remove a source. Keep slide claims specific and every non-cover slide proof-backed.`,
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

    const parsed = JSON.parse(cleanJson(content))
    const validated = slidesDeckSchema.safeParse({
      ...parsed,
      provider: "openrouter",
      updatedAt: new Date().toISOString(),
    })
    return validated.success ? validated.data : fallback
  } catch {
    return fallback
  }
}
