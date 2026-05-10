import type { SlidesEvidence } from "@/lib/slides/schema"
import { createSlidesTraceId, traceSlidesLlmFailure, traceSlidesLlmRequest, traceSlidesLlmResponse } from "@/lib/slides/llmTrace"

type OpenAIAnnotation = {
  type?: string
  url?: string
  title?: string
}

type OpenAIContent = {
  type?: string
  text?: string
  annotations?: OpenAIAnnotation[]
}

type OpenAIOutputItem = {
  type?: string
  content?: OpenAIContent[]
  action?: {
    query?: string
    queries?: string[]
    sources?: Array<{ url?: string; title?: string }>
  }
}

type VisualCandidate = {
  title: string
  url: string
  sourceUrl?: string
  alt: string
}

function uniqueCitations(items: Array<{ title?: string; url?: string }>) {
  const seen = new Set<string>()
  return items
    .filter((item): item is { title?: string; url: string } => typeof item.url === "string" && item.url.startsWith("http"))
    .filter((item) => {
      if (seen.has(item.url)) return false
      seen.add(item.url)
      return true
    })
    .slice(0, 8)
    .map((item) => ({
      title: (item.title?.trim() || new URL(item.url).hostname).slice(0, 220),
      url: item.url,
    }))
}

function visualCandidatesFromText(text: string): VisualCandidate[] {
  const imageUrlPattern = /https?:\/\/[^\s)"']+\.(?:png|jpe?g|webp)(?:\?[^\s)"']*)?/gi
  const seen = new Set<string>()
  return Array.from(text.matchAll(imageUrlPattern))
    .map((match) => match[0])
    .filter((url) => {
      if (seen.has(url)) return false
      seen.add(url)
      return true
    })
    .slice(0, 6)
    .map((url, index) => ({
      title: `Web visual ${index + 1}`,
      url,
      alt: "Presentation-supporting visual evidence found during web search.",
    }))
}

function evidenceId(index: number) {
  return `web-${index + 1}`
}

function searchTimeoutMs(): number {
  const parsed = Number(process.env.OPENAI_SEARCH_TIMEOUT_MS)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 30000
}

export async function gatherSlidesWebEvidence(prompt: string): Promise<SlidesEvidence[]> {
  if (!process.env.OPENAI_API_KEY) {
    return [{
      id: "web-skipped",
      query: prompt.slice(0, 300),
      summary: "Web search was enabled, but OPENAI_API_KEY is not configured.",
      citations: [],
      visualCandidates: [],
      provider: "skipped",
    }]
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), searchTimeoutMs())
  const model = process.env.OPENAI_SEARCH_MODEL || "gpt-5-mini"
  const requestId = createSlidesTraceId("web_search")
  const input = `Gather current, presentation-ready evidence for this deck request. Return concise evidence summaries with citations, not a deck outline.

If strong visuals would materially improve the deck and the user did not provide image assets, also mention credible, directly accessible image URLs only when you can verify they are public image files. Do not invent image URLs.

Deck request:
${prompt}`
  const startedAt = Date.now()
  traceSlidesLlmRequest({ requestId, stage: "web_search", provider: "openai", model, inputChars: input.length, metadata: { promptChars: prompt.length, timeoutMs: searchTimeoutMs() } })
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        tools: [{ type: "web_search" }],
        tool_choice: "auto",
        input,
      }),
    })

    if (!response.ok) {
      traceSlidesLlmResponse({ requestId, stage: "web_search", provider: "openai", model, ok: false, status: response.status, durationMs: Date.now() - startedAt })
      throw new Error(await response.text())
    }

    const data = await response.json() as { output?: OpenAIOutputItem[]; output_text?: string }
    const output = data.output ?? []
    const messageTexts = output
      .flatMap((item) => item.content ?? [])
      .filter((content) => content.type === "output_text" || typeof content.text === "string")
      .map((content) => content.text)
      .filter((text): text is string => Boolean(text?.trim()))

    const annotations = output
      .flatMap((item) => item.content ?? [])
      .flatMap((content) => content.annotations ?? [])
      .filter((annotation) => annotation.type === "url_citation" || annotation.url)

    const searchSources = output
      .filter((item) => item.type === "web_search_call")
      .flatMap((item) => item.action?.sources ?? [])

    const citations = uniqueCitations([...annotations, ...searchSources])
    const query = output
      .find((item) => item.type === "web_search_call")
      ?.action?.queries?.[0] ?? prompt.slice(0, 300)

    traceSlidesLlmResponse({ requestId, stage: "web_search", provider: "openai", model, ok: true, status: response.status, durationMs: Date.now() - startedAt, outputChars: (data.output_text ?? messageTexts.join("\n\n")).length, metadata: { citationCount: citations.length, visualCandidateCount: visualCandidatesFromText(messageTexts.join("\n\n")).length } })
    return [{
      id: evidenceId(0),
      query,
      summary: (messageTexts.join("\n\n") || data.output_text || "Web evidence gathered for the deck.").slice(0, 900),
      citations,
      visualCandidates: visualCandidatesFromText(messageTexts.join("\n\n")),
      provider: "openai_web_search",
    }]
  } catch (error) {
    traceSlidesLlmFailure({ requestId, stage: "web_search", provider: "openai", model, durationMs: Date.now() - startedAt, error })
    return [{
      id: "web-failed",
      query: prompt.slice(0, 300),
      summary: "Web search was requested, but evidence gathering failed. Continue with uploaded and prompt context only.",
      citations: [],
      visualCandidates: [],
      provider: "failed",
    }]
  } finally {
    clearTimeout(timeoutId)
  }
}
