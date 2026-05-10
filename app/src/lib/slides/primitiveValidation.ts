import type { PreviewDeck, PreviewText } from "@/lib/slides/previewPres"

export type PrimitiveValidationResult =
  | { ok: true; warnings: string[] }
  | { ok: false; reasons: string[]; warnings: string[] }

const MIN_DECORATIVE_SHAPES_PER_SLIDE = 1

function textLinesNeeded(text: PreviewText): number {
  const fontSize = Math.max(1, text.fontSize ?? 14)
  const widthPts = Math.max(1, text.w * 72)
  const avgCharWidthPts = fontSize * 0.52
  const charsPerLine = Math.max(1, Math.floor(widthPts / avgCharWidthPts))
  return text.text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .reduce((total, line) => total + Math.max(1, Math.ceil(line.length / charsPerLine)), 0)
}

function textLineCapacity(text: PreviewText): number {
  const fontSize = Math.max(1, text.fontSize ?? 14)
  const heightPts = Math.max(1, text.h * 72)
  return Math.max(1, Math.floor(heightPts / (fontSize * 1.18)))
}

function textOverflowReason(slideNumber: number, text: PreviewText, textIndex: number): string | undefined {
  const trimmed = text.text.trim()
  if (!trimmed) return undefined
  const needed = textLinesNeeded(text)
  const capacity = textLineCapacity(text)
  if (needed <= capacity + 1) return undefined
  const sample = trimmed.replace(/\s+/g, " ").slice(0, 60)
  return `slide ${slideNumber} text ${textIndex + 1} likely overflows (${needed} lines needed, ${capacity} fit): "${sample}"`
}

export function validatePreviewDeckPrimitives(deck: PreviewDeck): PrimitiveValidationResult {
  const reasons: string[] = []
  const warnings = [...deck.warnings]

  if (!deck.slides.length) {
    reasons.push("deck has no slides")
  }

  let decorativeShapeCount = 0

  deck.slides.forEach((slide, slideIndex) => {
    const slideNumber = slideIndex + 1
    const texts = slide.primitives.filter((primitive): primitive is PreviewText => primitive.kind === "text" && primitive.text.trim().length > 0)
    const shapes = slide.primitives.filter((primitive) => primitive.kind === "shape")
    const decorativeShapes = shapes.filter((shape) => shape.shape !== "line" && shape.w > 0.02 && shape.h > 0.02)
    decorativeShapeCount += decorativeShapes.length

    if (!texts.length) reasons.push(`slide ${slideNumber} has no text`)
    if (!shapes.length) reasons.push(`slide ${slideNumber} has no shapes`)
    if (decorativeShapes.length < MIN_DECORATIVE_SHAPES_PER_SLIDE) {
      reasons.push(`slide ${slideNumber} has no decorative shape`)
    }

    texts.forEach((text, textIndex) => {
      const reason = textOverflowReason(slideNumber, text, textIndex)
      if (reason) reasons.push(reason)
    })
  })

  if (decorativeShapeCount < deck.slides.length * MIN_DECORATIVE_SHAPES_PER_SLIDE) {
    reasons.push(`deck has ${decorativeShapeCount} decorative shapes for ${deck.slides.length} slides`)
  }

  return reasons.length ? { ok: false, reasons: reasons.slice(0, 12), warnings } : { ok: true, warnings }
}
