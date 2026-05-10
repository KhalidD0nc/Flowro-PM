import { generateCompletion } from "@/lib/openrouter"
import {
  slidesDeckStorySchema,
  type SlidesDeckBrief,
  type SlidesDeckStory,
  type SlidesEvidence,
  type SlidesOutlineItem,
  type SlidesSource,
} from "@/lib/slides/schema"
import { gatherSlidesWebEvidence } from "@/lib/slides/webSearch"

function cleanJson(raw: string): string {
  return raw.trim().replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "")
}

function truncate(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : ""
}

function normalizeStoryJson(value: unknown) {
  const proofTypes = new Set(["chart", "image", "comparison", "timeline", "diagram", "table", "source_backed_visual"])
  const raw = value as {
    brief?: Record<string, unknown>
    outline?: Array<Record<string, unknown>>
  }
  const brief = raw.brief ?? {}
  const blockerQuestion = truncate(brief.blockerQuestion, 260)
  return {
    ...raw,
    brief: {
      objective: truncate(brief.objective, 700),
      audience: truncate(brief.audience, 240),
      desiredOutcome: truncate(brief.desiredOutcome, 320),
      tone: truncate(brief.tone, 160),
      sourceStrategy: truncate(brief.sourceStrategy, 500),
      ...(blockerQuestion ? { blockerQuestion } : {}),
    },
    outline: (Array.isArray(raw.outline) ? raw.outline : []).map((item, index) => ({
      id: truncate(item.id, 80) || `slide-${index + 1}`,
      title: truncate(item.title, 60),
      claim: truncate(item.claim, 110),
      proofType: typeof item.proofType === "string" && proofTypes.has(item.proofType) ? item.proofType : "source_backed_visual",
      sourceIds: Array.isArray(item.sourceIds) ? item.sourceIds.filter((id): id is string => typeof id === "string").slice(0, 8) : [],
      evidenceIds: Array.isArray(item.evidenceIds) ? item.evidenceIds.filter((id): id is string => typeof id === "string").slice(0, 6) : [],
      speakerIntent: truncate(item.speakerIntent, 360),
    })),
  }
}

function requestedSlideCount(prompt: string): number {
  const match = /\b(\d{1,2})\s*[- ]?slide\b/i.exec(prompt)
  const count = match ? Number(match[1]) : 7
  return Math.min(12, Math.max(5, Number.isFinite(count) ? count : 7))
}

function sourceStrategyFor(sources: SlidesSource[], evidence: SlidesEvidence[]): string {
  if (sources.length && evidence.some((item) => item.provider === "openai_web_search")) {
    return "Use uploaded sources as the primary grounding layer and web evidence only for current external claims."
  }
  if (sources.length) return "Use uploaded sources as the grounding layer for claims and visual proof."
  if (evidence.some((item) => item.provider === "openai_web_search")) return "Use web evidence for current claims and cite every external assertion."
  return "Use the prompt as the main context and keep claims broad enough to avoid unsupported specifics."
}

function fallbackBrief(prompt: string, sources: SlidesSource[], evidence: SlidesEvidence[]): SlidesDeckBrief {
  return {
    objective: `Create a focused presentation about: ${prompt.slice(0, 560)}`,
    audience: "Decision makers and stakeholders",
    desiredOutcome: "Help the audience understand the recommendation and decide on next steps.",
    tone: "Clear, credible, and direct",
    sourceStrategy: sourceStrategyFor(sources, evidence),
  }
}

function fallbackOutline(prompt: string, sources: SlidesSource[], evidence: SlidesEvidence[]): SlidesOutlineItem[] {
  const sourceIds = sources.slice(0, 4).map((source) => source.id)
  const evidenceIds = evidence.filter((item) => item.provider === "openai_web_search").slice(0, 2).map((item) => item.id)
  const subject = prompt.split(/[.!?\n]/)[0]?.trim().replace(/^create\s+(?:a\s+)?\d+\s*[- ]?slide\s+/i, "").slice(0, 90) || "the proposal"
  const count = requestedSlideCount(prompt)
  const slideSubject = subject.slice(0, 42)
  const proofSequence: SlidesOutlineItem["proofType"][] = [
    "source_backed_visual",
    sources.some((source) => source.role === "data_file") || evidenceIds.length ? "chart" : "comparison",
    "comparison",
    "timeline",
    "diagram",
    "table",
    "timeline",
    "source_backed_visual",
    "comparison",
    "diagram",
    "table",
    "timeline",
  ]
  const base: Array<Omit<SlidesOutlineItem, "id" | "proofType" | "sourceIds" | "evidenceIds">> = [
    {
      title: `${slideSubject} needs clear stakes`.slice(0, 60),
      claim: `${slideSubject} needs a focused decision narrative before action.`.slice(0, 110),
      speakerIntent: "Open with a framing claim and establish why the deck exists.",
    },
    {
      title: "Current context reveals the gap",
      claim: "The available context shows what must change next.",
      speakerIntent: "Turn the prompt and sources into the central problem statement.",
    },
    {
      title: "The alternative path is weaker",
      claim: "Doing nothing keeps the strongest opportunity underused.",
      speakerIntent: "Contrast the recommended path with the likely default approach.",
    },
    {
      title: "Execution needs a simple sequence",
      claim: "A short phased plan makes the recommendation easier to act on.",
      speakerIntent: "Show the action path as a practical sequence.",
    },
    {
      title: "Inputs connect to outcomes",
      claim: "The recommendation works when evidence, action, and ownership stay connected.",
      speakerIntent: "Explain how the pieces of the argument fit together.",
    },
    {
      title: "Decision criteria make tradeoffs visible",
      claim: "Clear criteria help stakeholders evaluate the recommendation quickly.",
      speakerIntent: "Summarize the most important tradeoffs in a scannable format.",
    },
    {
      title: "The next step should be concrete",
      claim: "The audience should leave with one clear action to take.",
      speakerIntent: "Close with a concrete action path, not a generic summary.",
    },
    {
      title: "Evidence should guide sequencing",
      claim: "The strongest proof points should determine what happens first.",
      speakerIntent: "Use available evidence to prioritize the rollout path.",
    },
    {
      title: "Risks need explicit owners",
      claim: "Named risks become manageable when each has an owner and response.",
      speakerIntent: "Call out the main risks without derailing the recommendation.",
    },
    {
      title: "Success needs visible signals",
      claim: "A few leading indicators show whether the plan is working.",
      speakerIntent: "Define what the audience should monitor after approval.",
    },
    {
      title: "Resources must match ambition",
      claim: "The plan only works if resourcing matches the expected outcome.",
      speakerIntent: "Make the resource implication clear and defensible.",
    },
    {
      title: "Approval unlocks the next phase",
      claim: "A decision now creates momentum for the next execution phase.",
      speakerIntent: "End with the approval or commitment needed from the audience.",
    },
  ]

  return base.slice(0, count).map((item, index, items) => ({
    ...item,
    id: `slide-${index + 1}`,
    proofType: index === items.length - 1 ? "timeline" : proofSequence[index] ?? "source_backed_visual",
    sourceIds,
    evidenceIds,
  }))
}

export function fallbackStory(prompt: string, sources: SlidesSource[], evidence: SlidesEvidence[]): SlidesDeckStory {
  return {
    brief: fallbackBrief(prompt, sources, evidence),
    outline: fallbackOutline(prompt, sources, evidence),
    evidence,
    provider: "deterministic",
  }
}

export async function generateSlidesDeckStory({
  prompt,
  sources,
  webSearchEnabled,
}: {
  prompt: string
  sources: SlidesSource[]
  webSearchEnabled: boolean
}): Promise<SlidesDeckStory> {
  const evidence = webSearchEnabled ? await gatherSlidesWebEvidence(prompt) : []
  const fallback = fallbackStory(prompt, sources, evidence)

  if (!process.env.OPENROUTER_API_KEY) return fallback

  try {
    const response = await generateCompletion({
      model: process.env.OPENROUTER_MODEL_SLIDES || process.env.OPENROUTER_MODEL || "openai/gpt-mini-latest",
      reasoning: false,
      maxTokens: 2600,
      timeoutMs: 30000,
      maxRetries: 0,
      messages: [
        {
          role: "system",
          content: `You create internal presentation planning JSON for Flowro Slides. Return JSON only with this shape: {"brief":{"objective":"...","audience":"...","desiredOutcome":"...","tone":"...","sourceStrategy":"...","blockerQuestion":"optional only for true blockers"},"outline":[{"id":"slide-1","title":"claim-style title","claim":"specific claim, not a topic","proofType":"chart|image|comparison|timeline|diagram|table|source_backed_visual","sourceIds":["..."],"evidenceIds":["..."],"speakerIntent":"..."}]}.

TITLE RULES: Titles are assertive claims, max 8 words. Not topic labels. BAD: "Q3 Results" → GOOD: "Revenue exceeded forecast by 12%". Never use gerunds or questions as titles. Hard limit: 60 characters.

CLAIM RULES: One specific falsifiable sentence, max 16 words. No hedging. No "we believe that". Hard limit: 110 characters.

OUTLINE STRUCTURE: The outline is a designed argument — each slide advances the story, none repeats the previous. First slide: sets the stakes. Last slide: drives a decision or action. Middle slides: evidence, contrast, proof.

LAYOUT VARIETY: Never more than 2 consecutive slides sharing the same proofType. Always prefer chart, comparison, or timeline over source_backed_visual. Use image proof only when attached assets or web evidence can directly support it.

Ask a blockerQuestion only if generation would be materially wrong without it.`,
        },
        {
          role: "user",
          content: JSON.stringify({
            prompt,
            sources: sources.map((source) => ({
              id: source.id,
              name: source.name,
              role: source.role,
              summary: source.summary,
            })),
            evidence,
          }),
        },
      ],
    })
    const data = await response.json()
    const content = data?.choices?.[0]?.message?.content
    if (typeof content !== "string") {
      return fallback
    }

    const parsed = normalizeStoryJson(JSON.parse(cleanJson(content)))
    const validated = slidesDeckStorySchema.safeParse({
      ...parsed,
      evidence,
      provider: "openrouter",
    })
    if (!validated.success) {
      return fallback
    }
    return validated.data
  } catch {
    return fallback
  }
}
