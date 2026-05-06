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
  const subject = prompt.split(/[.!?\n]/)[0]?.trim().slice(0, 90) || "the proposal"

  return [
    {
      id: "slide-1",
      title: subject,
      claim: `${subject} needs a clear narrative before execution.`,
      proofType: "source_backed_visual",
      sourceIds,
      evidenceIds,
      speakerIntent: "Open with the central claim and frame why the presentation matters.",
    },
    {
      id: "slide-2",
      title: "What the sources show",
      claim: sources.length ? "The attached material provides the strongest grounding for the deck." : "The prompt defines the core direction, but source depth is limited.",
      proofType: sources.some((source) => source.role === "data_file") ? "chart" : "comparison",
      sourceIds,
      evidenceIds,
      speakerIntent: "Turn available context into a defensible proof point.",
    },
    {
      id: "slide-3",
      title: "Recommended next move",
      claim: "The deck should close with a concrete recommendation and action path.",
      proofType: "timeline",
      sourceIds,
      evidenceIds,
      speakerIntent: "Give the audience a decision path instead of ending on general context.",
    },
  ]
}

function fallbackStory(prompt: string, sources: SlidesSource[], evidence: SlidesEvidence[]): SlidesDeckStory {
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
      model: process.env.OPENROUTER_MODEL || "deepseek/deepseek-chat",
      reasoning: false,
      maxTokens: 2600,
      timeoutMs: 30000,
      maxRetries: 0,
      messages: [
        {
          role: "system",
          content: `You create internal presentation planning JSON for Flowro Slides. Return JSON only with this shape: {"brief":{"objective":"...","audience":"...","desiredOutcome":"...","tone":"...","sourceStrategy":"...","blockerQuestion":"optional only for true blockers"},"outline":[{"id":"slide-1","title":"claim-style title","claim":"specific claim, not a topic","proofType":"chart|image|comparison|timeline|diagram|table|source_backed_visual","sourceIds":["..."],"evidenceIds":["..."],"speakerIntent":"..."}]}. Titles and claims must be assertive. Ask a blockerQuestion only if generation would be materially wrong without it.`,
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
    if (typeof content !== "string") return fallback

    const parsed = JSON.parse(cleanJson(content))
    const validated = slidesDeckStorySchema.safeParse({
      ...parsed,
      evidence,
      provider: "openrouter",
    })
    return validated.success ? validated.data : fallback
  } catch {
    return fallback
  }
}
