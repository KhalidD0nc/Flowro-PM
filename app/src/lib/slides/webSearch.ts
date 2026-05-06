import type { SlidesEvidence } from "@/lib/slides/schema"

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

function evidenceId(index: number) {
  return `web-${index + 1}`
}

export async function gatherSlidesWebEvidence(prompt: string): Promise<SlidesEvidence[]> {
  if (!process.env.OPENAI_API_KEY) {
    return [{
      id: "web-skipped",
      query: prompt.slice(0, 300),
      summary: "Web search was enabled, but OPENAI_API_KEY is not configured.",
      citations: [],
      provider: "skipped",
    }]
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_SEARCH_MODEL || "gpt-5-mini",
        tools: [{ type: "web_search" }],
        tool_choice: "auto",
        input: `Gather current, presentation-ready evidence for this deck request. Return concise evidence summaries with citations, not a deck outline.\n\nDeck request:\n${prompt}`,
      }),
    })

    if (!response.ok) {
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

    return [{
      id: evidenceId(0),
      query,
      summary: (messageTexts.join("\n\n") || data.output_text || "Web evidence gathered for the deck.").slice(0, 900),
      citations,
      provider: "openai_web_search",
    }]
  } catch {
    return [{
      id: "web-failed",
      query: prompt.slice(0, 300),
      summary: "Web search was requested, but evidence gathering failed. Continue with uploaded and prompt context only.",
      citations: [],
      provider: "failed",
    }]
  }
}
