import { generateSlidesDeckCode } from "@/lib/slides/deck"
import type { SlidesDeck, SlidesDeckStory, SlidesSource } from "@/lib/slides/schema"
import { analyzeAssets } from "@/lib/slides/sourceIntake"

function withoutSlideCode(deck: SlidesDeck): SlidesDeck {
  const next = { ...deck }
  delete next.slideCode
  delete next.assets
  return next
}

export async function attachSlideCodeToDeck({
  deck,
  story,
  sources,
  intent,
}: {
  deck: SlidesDeck
  story: SlidesDeckStory
  sources: SlidesSource[]
  intent?: string
}): Promise<SlidesDeck> {
  const userIntent = intent || story.brief.objective || undefined
  const assetRecords = sources.length
    ? await analyzeAssets(sources, userIntent).catch(() => undefined)
    : undefined
  const codeResult = await generateSlidesDeckCode({
    story,
    sources,
    evidence: story.evidence,
    legacyDeck: deck,
    assetRecords,
  })
  const deckWithoutCode = withoutSlideCode(deck)
  const hasRenderableSlideCode = codeResult.provider === "openrouter"

  return {
    ...deckWithoutCode,
    ...(hasRenderableSlideCode ? { slideCode: codeResult.slideCode, assets: codeResult.assets } : {}),
    diagnostics: {
      ...deck.diagnostics,
      sandboxStage: codeResult.diagnostics.sandboxStage,
      ...(codeResult.diagnostics.sandboxError ? { sandboxError: codeResult.diagnostics.sandboxError } : {}),
      ...(codeResult.diagnostics.sandboxDurationMs !== undefined ? { sandboxDurationMs: codeResult.diagnostics.sandboxDurationMs } : {}),
      slideCodeProvider: codeResult.provider,
      ...(codeResult.diagnostics.themePreset ? { themePreset: codeResult.diagnostics.themePreset } : {}),
      ...(codeResult.diagnostics.slideCodeAttemptCount !== undefined ? { slideCodeAttemptCount: codeResult.diagnostics.slideCodeAttemptCount } : {}),
      ...(codeResult.diagnostics.slideCodeRequestIds?.length ? { slideCodeRequestIds: codeResult.diagnostics.slideCodeRequestIds } : {}),
      ...(codeResult.diagnostics.slideCodeDebugFiles?.length ? { slideCodeDebugFiles: codeResult.diagnostics.slideCodeDebugFiles } : {}),
      ...(codeResult.diagnostics.slideCodeNotesCount !== undefined ? { slideCodeNotesCount: codeResult.diagnostics.slideCodeNotesCount } : {}),
      ...(codeResult.diagnostics.slideCodeThumbnailCount !== undefined ? { slideCodeThumbnailCount: codeResult.diagnostics.slideCodeThumbnailCount } : {}),
      ...(codeResult.diagnostics.fallbackReason ? { fallbackReason: codeResult.diagnostics.fallbackReason } : {}),
    },
  }
}
