import pptxgen from "pptxgenjs"
import type { SlidesAssetBag, SlidesDeck, SlidesProofDatum, SlidesStructuredSlide } from "@/lib/slides/schema"
import { runSlideCode } from "@/lib/slides/sandbox"

type Theme = {
  background: string
  foreground: string
  accent: string
  muted: string
  panel: string
  inverse: string
}

function hex(value: string, fallback: string): string {
  const normalized = value.trim().replace(/^#/, "")
  return /^[0-9a-f]{6}$/i.test(normalized) ? normalized.toUpperCase() : fallback
}

function themeFor(deck: SlidesDeck): Theme {
  const background = hex(deck.theme.background, "FFFFFF")
  const foreground = hex(deck.theme.foreground, "151515")
  const accent = hex(deck.theme.accent, "4169FF")
  const muted = hex(deck.theme.muted, "6F6C66")
  return {
    background,
    foreground,
    accent,
    muted,
    panel: background === "FFFFFF" ? "F3F5F7" : "FFFFFF",
    inverse: foreground === "FFFFFF" ? "151515" : "FFFFFF",
  }
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, Math.max(0, max - 1)).trimEnd()}...` : value
}

function asLines(items: string[], maxItems = 4): string {
  return items.slice(0, maxItems).map((item) => `- ${truncate(item, 150)}`).join("\n")
}

function addText(slide: pptxgen.Slide, text: string, options: pptxgen.TextPropsOptions) {
  slide.addText(text, {
    margin: 0,
    breakLine: false,
    fit: "shrink",
    ...options,
  })
}

function addSlideNumber(slide: pptxgen.Slide, structuredSlide: SlidesStructuredSlide, theme: Theme) {
  addText(slide, String(structuredSlide.slideNumber).padStart(2, "0"), {
    x: 12.1,
    y: 6.88,
    w: 0.55,
    h: 0.18,
    fontFace: "Aptos",
    fontSize: 7,
    bold: true,
    color: theme.muted,
    align: "right",
  })
}

async function imageDataFromUrl(url?: string): Promise<string | null> {
  if (!url) return null
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Flowro Slides Exporter/1.0" },
      signal: AbortSignal.timeout(7000),
    })
    if (!response.ok) return null
    const contentType = response.headers.get("content-type") ?? ""
    if (!contentType.startsWith("image/")) return null
    const bytes = Buffer.from(await response.arrayBuffer())
    if (bytes.length > 6_000_000) return null
    return `data:${contentType.split(";")[0]};base64,${bytes.toString("base64")}`
  } catch {
    return null
  }
}

async function visualImageData(structuredSlide: SlidesStructuredSlide): Promise<string | null> {
  return structuredSlide.visualAsset?.dataUrl ?? await imageDataFromUrl(structuredSlide.visualAsset?.url)
}

function addBackground(slide: pptxgen.Slide, color: string) {
  slide.background = { color }
}

function addKicker(slide: pptxgen.Slide, text: string, theme: Theme, x = 0.62, y = 0.55) {
  addText(slide, text.toUpperCase(), {
    x,
    y,
    w: 4.2,
    h: 0.22,
    fontFace: "Aptos",
    fontSize: 8,
    bold: true,
    color: theme.accent,
    charSpacing: 1.1,
  })
}

function addProofPanel(slide: pptxgen.Slide, structuredSlide: SlidesStructuredSlide, theme: Theme, x = 7.45, y = 1.08, w = 4.95, h = 5.3) {
  slide.addShape("roundRect", {
    x,
    y,
    w,
    h,
    rectRadius: 0.08,
    fill: { color: theme.panel, transparency: 5 },
    line: { color: "D9DEE8", transparency: 20, pt: 0.8 },
  })
  addText(slide, structuredSlide.proof.type.replace(/_/g, " ").toUpperCase(), {
    x: x + 0.34,
    y: y + 0.34,
    w: w - 0.68,
    h: 0.22,
    fontFace: "Aptos",
    fontSize: 7,
    bold: true,
    color: theme.accent,
    charSpacing: 1,
  })
  addText(slide, truncate(structuredSlide.proof.title, 95), {
    x: x + 0.34,
    y: y + 0.78,
    w: w - 0.68,
    h: 0.65,
    fontFace: "Georgia",
    fontSize: 17,
    bold: true,
    color: theme.foreground,
    breakLine: false,
  })
  addText(slide, truncate(structuredSlide.proof.description, 250), {
    x: x + 0.34,
    y: y + 1.62,
    w: w - 0.68,
    h: 0.9,
    fontFace: "Aptos",
    fontSize: 10.5,
    color: theme.muted,
    breakLine: false,
    valign: "top",
  })

  if (structuredSlide.proof.type === "timeline") {
    addTimeline(slide, structuredSlide, theme, x + 0.34, y + 2.88, w - 0.68)
  } else if (structuredSlide.proof.type === "comparison") {
    addComparison(slide, structuredSlide, theme, x + 0.34, y + 2.82, w - 0.68)
  } else if (structuredSlide.proof.type === "table") {
    addMiniTable(slide, structuredSlide, theme, x + 0.34, y + 2.78, w - 0.68)
  } else {
    addBarProof(slide, structuredSlide, theme, x + 0.34, y + 2.86, w - 0.68)
  }
}

function addBarProof(slide: pptxgen.Slide, structuredSlide: SlidesStructuredSlide, theme: Theme, x: number, y: number, w: number) {
  const data = structuredSlide.proof.data.length
    ? structuredSlide.proof.data.slice(0, 4)
    : structuredSlide.body.slice(0, 3).map((item, index) => ({ label: `Point ${index + 1}`, value: item }))
  data.forEach((item, index) => {
    const top = y + index * 0.54
    const barW = Math.max(1.1, (w - 1.4) * (1 - index * 0.12))
    slide.addShape("rect", {
      x,
      y: top + 0.22,
      w: barW,
      h: 0.11,
      fill: { color: index === 0 ? theme.accent : "B7C0CF" },
      line: { color: index === 0 ? theme.accent : "B7C0CF", transparency: 100 },
    })
    addText(slide, truncate(item.label, 42), {
      x,
      y: top,
      w: w * 0.45,
      h: 0.18,
      fontFace: "Aptos",
      fontSize: 7.5,
      bold: true,
      color: theme.foreground,
    })
    addText(slide, truncate(item.value, 48), {
      x: x + w * 0.48,
      y: top,
      w: w * 0.52,
      h: 0.24,
      fontFace: "Aptos",
      fontSize: 7.5,
      color: theme.muted,
      align: "right",
    })
  })
}

function addTimeline(slide: pptxgen.Slide, structuredSlide: SlidesStructuredSlide, theme: Theme, x: number, y: number, w: number) {
  const steps = (structuredSlide.proof.data.length ? structuredSlide.proof.data : structuredSlide.body.map((item, index) => ({ label: `Step ${index + 1}`, value: item }))).slice(0, 4)
  const gap = w / Math.max(steps.length, 1)
  slide.addShape("line", { x, y: y + 0.23, w: w - gap * 0.35, h: 0, line: { color: "C9D0DD", pt: 1.2 } })
  steps.forEach((step, index) => {
    const left = x + index * gap
    slide.addShape("ellipse", {
      x: left,
      y: y,
      w: 0.46,
      h: 0.46,
      fill: { color: index === 0 ? theme.accent : theme.foreground },
      line: { color: "FFFFFF", pt: 1 },
    })
    addText(slide, String(index + 1), {
      x: left,
      y: y + 0.12,
      w: 0.46,
      h: 0.12,
      fontFace: "Aptos",
      fontSize: 7,
      bold: true,
      color: "FFFFFF",
      align: "center",
    })
    addText(slide, truncate(step.label, 32), {
      x: left,
      y: y + 0.68,
      w: Math.max(0.9, gap - 0.12),
      h: 0.22,
      fontFace: "Aptos",
      fontSize: 7.5,
      bold: true,
      color: theme.foreground,
    })
    addText(slide, truncate(step.value, 58), {
      x: left,
      y: y + 0.98,
      w: Math.max(0.9, gap - 0.12),
      h: 0.42,
      fontFace: "Aptos",
      fontSize: 6.6,
      color: theme.muted,
      valign: "top",
    })
  })
}

function addComparison(slide: pptxgen.Slide, structuredSlide: SlidesStructuredSlide, theme: Theme, x: number, y: number, w: number) {
  const items = (structuredSlide.proof.data.length ? structuredSlide.proof.data : structuredSlide.body.map((item, index) => ({ label: index === 0 ? "Before" : "After", value: item }))).slice(0, 2)
  ;[0, 1].forEach((index) => {
    const item = items[index] ?? { label: index === 0 ? "Option A" : "Option B", value: "Clarify the tradeoff." }
    const left = x + index * (w / 2 + 0.1)
    slide.addShape("roundRect", {
      x: left,
      y,
      w: w / 2 - 0.1,
      h: 1.35,
      rectRadius: 0.06,
      fill: { color: index === 0 ? "EEF2F8" : theme.accent, transparency: index === 0 ? 0 : 8 },
      line: { color: index === 0 ? "D8DEE9" : theme.accent, transparency: 15 },
    })
    addText(slide, truncate(item.label, 34), {
      x: left + 0.18,
      y: y + 0.18,
      w: w / 2 - 0.46,
      h: 0.22,
      fontFace: "Aptos",
      fontSize: 7.5,
      bold: true,
      color: index === 0 ? theme.foreground : "FFFFFF",
    })
    addText(slide, truncate(item.value, 90), {
      x: left + 0.18,
      y: y + 0.52,
      w: w / 2 - 0.46,
      h: 0.58,
      fontFace: "Aptos",
      fontSize: 8,
      color: index === 0 ? theme.muted : "FFFFFF",
      valign: "top",
    })
  })
}

function addMiniTable(slide: pptxgen.Slide, structuredSlide: SlidesStructuredSlide, theme: Theme, x: number, y: number, w: number) {
  const rows = (structuredSlide.proof.data.length ? structuredSlide.proof.data : structuredSlide.body.map((item, index) => ({ label: `Row ${index + 1}`, value: item }))).slice(0, 4)
  rows.forEach((row, index) => {
    const top = y + index * 0.43
    slide.addShape("rect", {
      x,
      y: top,
      w,
      h: 0.35,
      fill: { color: index % 2 === 0 ? "EEF2F8" : "FFFFFF", transparency: 0 },
      line: { color: "D8DEE9", transparency: 30, pt: 0.4 },
    })
    addText(slide, truncate(row.label, 34), {
      x: x + 0.14,
      y: top + 0.09,
      w: w * 0.38,
      h: 0.12,
      fontFace: "Aptos",
      fontSize: 6.8,
      bold: true,
      color: theme.foreground,
    })
    addText(slide, truncate(row.value, 46), {
      x: x + w * 0.43,
      y: top + 0.09,
      w: w * 0.52,
      h: 0.12,
      fontFace: "Aptos",
      fontSize: 6.8,
      color: theme.muted,
      align: "right",
    })
  })
}

async function addOptionalImage(slide: pptxgen.Slide, structuredSlide: SlidesStructuredSlide, theme: Theme, x: number, y: number, w: number, h: number): Promise<boolean> {
  const data = await visualImageData(structuredSlide)
  if (!data) return false
  slide.addShape("roundRect", {
    x,
    y,
    w,
    h,
    rectRadius: 0.08,
    fill: { color: theme.panel },
    line: { color: "D9DEE8", transparency: 35 },
  })
  slide.addImage({
    data,
    x: x + 0.08,
    y: y + 0.08,
    w: w - 0.16,
    h: h - 0.16,
    sizing: { type: "crop", x: x + 0.08, y: y + 0.08, w: w - 0.16, h: h - 0.16 },
    altText: structuredSlide.visualAsset?.alt ?? structuredSlide.proof.title,
  })
  return true
}

function addBigNumberSlide(pptx: pptxgen, structuredSlide: SlidesStructuredSlide, theme: Theme) {
  const slide = pptx.addSlide()
  const primary = structuredSlide.proof.data[0]
  const supporting = structuredSlide.proof.data.slice(1, 3)
  addBackground(slide, theme.background)
  addKicker(slide, structuredSlide.proof.title || "Key Metric", theme, 4.35, 0.72)
  addText(slide, truncate(primary?.value || structuredSlide.title, 24), {
    x: 1.1,
    y: 1.55,
    w: 11.1,
    h: 1.35,
    fontFace: "Aptos",
    fontSize: primary ? 72 : 44,
    bold: true,
    color: theme.accent,
    align: "center",
    breakLine: false,
  })
  addText(slide, truncate(primary?.label || structuredSlide.claim, 90), {
    x: 2.1,
    y: 3.0,
    w: 9.1,
    h: 0.42,
    fontFace: "Georgia",
    fontSize: 20,
    bold: true,
    color: theme.foreground,
    align: "center",
    breakLine: false,
  })
  addText(slide, truncate(structuredSlide.claim, 180), {
    x: 2.45,
    y: 3.72,
    w: 8.4,
    h: 0.62,
    fontFace: "Aptos",
    fontSize: 14,
    color: theme.muted,
    align: "center",
    breakLine: false,
  })
  supporting.forEach((item, index) => {
    const left = 4.05 + index * 2.65
    addText(slide, truncate(item.value, 28), {
      x: left,
      y: 5.0,
      w: 2.1,
      h: 0.42,
      fontFace: "Aptos",
      fontSize: 22,
      bold: true,
      color: theme.foreground,
      align: "center",
    })
    addText(slide, truncate(item.label, 42), {
      x: left,
      y: 5.46,
      w: 2.1,
      h: 0.24,
      fontFace: "Aptos",
      fontSize: 8,
      color: theme.muted,
      align: "center",
    })
  })
  addSlideNumber(slide, structuredSlide, theme)
  slide.addNotes(structuredSlide.speakerNotes)
}

function sideBySideGroups(structuredSlide: SlidesStructuredSlide): [SlidesProofDatum[], SlidesProofDatum[]] {
  const rows = structuredSlide.proof.data.slice(0, 8)
  const groups = [...new Set(rows.map((row) => row.group).filter(Boolean))]
  if (groups.length >= 2) {
    return [
      rows.filter((row) => row.group === groups[0]),
      rows.filter((row) => row.group === groups[1]),
    ]
  }
  const mid = Math.ceil(rows.length / 2)
  const left = rows.slice(0, mid)
  const right = rows.slice(mid)
  const fallbackLeft: SlidesProofDatum[] = structuredSlide.body.slice(0, 2).map((item) => ({ label: item, value: "" }))
  const fallbackRight: SlidesProofDatum[] = structuredSlide.body.slice(2).map((item) => ({ label: item, value: "" }))
  return [left.length ? left : fallbackLeft, right.length ? right : fallbackRight]
}

function addSideBySideSlide(pptx: pptxgen, structuredSlide: SlidesStructuredSlide, theme: Theme) {
  const slide = pptx.addSlide()
  const [leftItems, rightItems] = sideBySideGroups(structuredSlide)
  addBackground(slide, theme.background)
  addKicker(slide, `Slide ${structuredSlide.slideNumber}`, theme)
  addText(slide, truncate(structuredSlide.title, 100), {
    x: 0.62,
    y: 0.96,
    w: 8.6,
    h: 0.64,
    fontFace: "Georgia",
    fontSize: 24,
    bold: true,
    color: theme.foreground,
    breakLine: false,
  })

  ;[
    { items: leftItems, x: 0.82, accent: false },
    { items: rightItems, x: 6.86, accent: true },
  ].forEach((column) => {
    const title = column.items[0]?.group || column.items[0]?.label || (column.accent ? "Option B" : "Option A")
    slide.addShape("roundRect", {
      x: column.x,
      y: 2.02,
      w: 5.58,
      h: 4.42,
      rectRadius: 0.08,
      fill: { color: column.accent ? theme.accent : theme.panel, transparency: column.accent ? 88 : 0 },
      line: { color: column.accent ? theme.accent : "D9DEE8", transparency: column.accent ? 25 : 15 },
    })
    addText(slide, truncate(String(title), 42).toUpperCase(), {
      x: column.x + 0.36,
      y: 2.42,
      w: 4.86,
      h: 0.24,
      fontFace: "Aptos",
      fontSize: 9,
      bold: true,
      color: column.accent ? theme.accent : theme.muted,
      charSpacing: 0.8,
    })
    column.items.slice(1, 4).forEach((item, index) => {
      const y = 3.08 + index * 0.82
      slide.addShape("ellipse", {
        x: column.x + 0.36,
        y,
        w: 0.28,
        h: 0.28,
        fill: { color: column.accent ? theme.accent : "B7C0CF" },
        line: { color: column.accent ? theme.accent : "B7C0CF" },
      })
      addText(slide, truncate(`${item.label}${item.value ? `: ${item.value}` : ""}`, 95), {
        x: column.x + 0.78,
        y: y - 0.03,
        w: 4.42,
        h: 0.38,
        fontFace: "Aptos",
        fontSize: 10.5,
        color: theme.foreground,
        breakLine: false,
      })
    })
  })
  addSlideNumber(slide, structuredSlide, theme)
  slide.addNotes(structuredSlide.speakerNotes)
}

function addQuoteHighlightSlide(pptx: pptxgen, structuredSlide: SlidesStructuredSlide, theme: Theme) {
  const slide = pptx.addSlide()
  const attribution = structuredSlide.proof.data[0]
  addBackground(slide, theme.background)
  addText(slide, "“", {
    x: 0.82,
    y: 0.72,
    w: 0.78,
    h: 0.78,
    fontFace: "Georgia",
    fontSize: 44,
    bold: true,
    color: theme.accent,
  })
  addText(slide, truncate(structuredSlide.proof.title || structuredSlide.claim, 190), {
    x: 1.45,
    y: 1.32,
    w: 10.0,
    h: 1.72,
    fontFace: "Georgia",
    fontSize: 30,
    bold: true,
    color: theme.foreground,
    align: "center",
    breakLine: false,
  })
  if (attribution) {
    slide.addShape("line", { x: 5.82, y: 3.48, w: 1.68, h: 0, line: { color: theme.accent, transparency: 25, pt: 1.2 } })
    addText(slide, truncate(attribution.label, 80), {
      x: 4.3,
      y: 3.74,
      w: 4.7,
      h: 0.24,
      fontFace: "Aptos",
      fontSize: 11,
      bold: true,
      color: theme.foreground,
      align: "center",
    })
    if (attribution.value) {
      addText(slide, truncate(attribution.value, 110), {
        x: 4.3,
        y: 4.08,
        w: 4.7,
        h: 0.24,
        fontFace: "Aptos",
        fontSize: 9,
        color: theme.muted,
        align: "center",
      })
    }
  }
  addText(slide, truncate(structuredSlide.proof.description || structuredSlide.body[0] || "", 190), {
    x: 2.35,
    y: 5.12,
    w: 8.65,
    h: 0.46,
    fontFace: "Aptos",
    fontSize: 11,
    color: theme.muted,
    align: "center",
    breakLine: false,
  })
  addSlideNumber(slide, structuredSlide, theme)
  slide.addNotes(structuredSlide.speakerNotes)
}

function addTimelineVerticalSlide(pptx: pptxgen, structuredSlide: SlidesStructuredSlide, theme: Theme) {
  const slide = pptx.addSlide()
  const steps = (structuredSlide.proof.data.length ? structuredSlide.proof.data : structuredSlide.body.map((item, index) => ({ label: `Step ${index + 1}`, value: item }))).slice(0, 7)
  addBackground(slide, theme.background)
  addKicker(slide, `Slide ${structuredSlide.slideNumber}`, theme)
  addText(slide, truncate(structuredSlide.title, 95), {
    x: 0.62,
    y: 1.08,
    w: 4.55,
    h: 0.92,
    fontFace: "Georgia",
    fontSize: 25,
    bold: true,
    color: theme.foreground,
    breakLine: false,
  })
  addText(slide, truncate(structuredSlide.claim, 160), {
    x: 0.65,
    y: 2.35,
    w: 4.35,
    h: 0.66,
    fontFace: "Aptos",
    fontSize: 12.5,
    color: theme.muted,
    breakLine: false,
  })
  steps.forEach((step, index) => {
    const y = 0.9 + index * 0.82
    const isLast = index === steps.length - 1
    if (!isLast) {
      slide.addShape("line", { x: 6.14, y: y + 0.34, w: 0, h: 0.52, line: { color: theme.accent, transparency: 55, pt: 1.1 } })
    }
    slide.addShape("ellipse", {
      x: 5.96,
      y: y + 0.05,
      w: 0.36,
      h: 0.36,
      fill: { color: isLast ? theme.accent : "B7C0CF" },
      line: { color: isLast ? theme.accent : "B7C0CF" },
    })
    addText(slide, String(index + 1), {
      x: 5.96,
      y: y + 0.14,
      w: 0.36,
      h: 0.1,
      fontFace: "Aptos",
      fontSize: 6.4,
      bold: true,
      color: "FFFFFF",
      align: "center",
    })
    addText(slide, truncate(step.label, 58), {
      x: 6.62,
      y,
      w: 4.95,
      h: 0.22,
      fontFace: "Aptos",
      fontSize: 10.5,
      bold: true,
      color: isLast ? theme.accent : theme.foreground,
    })
    addText(slide, truncate(step.value, 88), {
      x: 6.62,
      y: y + 0.28,
      w: 4.95,
      h: 0.26,
      fontFace: "Aptos",
      fontSize: 8,
      color: theme.muted,
      breakLine: false,
    })
  })
  addSlideNumber(slide, structuredSlide, theme)
  slide.addNotes(structuredSlide.speakerNotes)
}

async function addImageLeftSlide(pptx: pptxgen, structuredSlide: SlidesStructuredSlide, theme: Theme) {
  const slide = pptx.addSlide()
  const image = await visualImageData(structuredSlide)
  addBackground(slide, theme.background)
  if (image) {
    slide.addImage({
      data: image,
      x: 0,
      y: 0,
      w: 6.42,
      h: 7.5,
      sizing: { type: "crop", x: 0, y: 0, w: 6.42, h: 7.5 },
      altText: structuredSlide.visualAsset?.alt ?? structuredSlide.title,
    })
  } else {
    slide.addShape("rect", {
      x: 0,
      y: 0,
      w: 6.42,
      h: 7.5,
      fill: { color: theme.accent, transparency: 88 },
      line: { color: theme.accent, transparency: 100 },
    })
  }
  addKicker(slide, `Slide ${structuredSlide.slideNumber}`, theme, 7.05, 1.0)
  addText(slide, truncate(structuredSlide.title, 95), {
    x: 7.05,
    y: 1.52,
    w: 5.35,
    h: 1.04,
    fontFace: "Georgia",
    fontSize: 27,
    bold: true,
    color: theme.foreground,
    breakLine: false,
  })
  addText(slide, truncate(structuredSlide.claim, 170), {
    x: 7.08,
    y: 3.0,
    w: 5.08,
    h: 0.64,
    fontFace: "Aptos",
    fontSize: 13.5,
    color: theme.muted,
    breakLine: false,
  })
  addText(slide, asLines(structuredSlide.body, 3), {
    x: 7.1,
    y: 4.18,
    w: 4.85,
    h: 1.55,
    fontFace: "Aptos",
    fontSize: 11,
    color: theme.foreground,
    valign: "top",
    paraSpaceAfter: 7,
  })
  addSlideNumber(slide, structuredSlide, theme)
  slide.addNotes(structuredSlide.speakerNotes)
}

async function addImageFullSlide(pptx: pptxgen, structuredSlide: SlidesStructuredSlide, theme: Theme) {
  const slide = pptx.addSlide()
  const image = await visualImageData(structuredSlide)
  addBackground(slide, image ? "151515" : theme.background)
  if (image) {
    slide.addImage({
      data: image,
      x: 0,
      y: 0,
      w: 13.33,
      h: 7.5,
      sizing: { type: "crop", x: 0, y: 0, w: 13.33, h: 7.5 },
      altText: structuredSlide.visualAsset?.alt ?? structuredSlide.title,
    })
    slide.addShape("rect", {
      x: 0,
      y: 0,
      w: 13.33,
      h: 7.5,
      fill: { color: "000000", transparency: 42 },
      line: { color: "000000", transparency: 100 },
    })
  } else {
    slide.addShape("rect", {
      x: 0,
      y: 0,
      w: 13.33,
      h: 7.5,
      fill: { color: theme.accent, transparency: 88 },
      line: { color: theme.accent, transparency: 100 },
    })
  }
  const textColor = image ? "FFFFFF" : theme.foreground
  addText(slide, `SLIDE ${structuredSlide.slideNumber}`, {
    x: 4.32,
    y: 1.36,
    w: 4.7,
    h: 0.22,
    fontFace: "Aptos",
    fontSize: 8,
    bold: true,
    color: image ? "DDE3EA" : theme.accent,
    align: "center",
    charSpacing: 1,
  })
  addText(slide, truncate(structuredSlide.title, 95), {
    x: 1.72,
    y: 2.05,
    w: 9.9,
    h: 1.28,
    fontFace: "Georgia",
    fontSize: 36,
    bold: true,
    color: textColor,
    align: "center",
    breakLine: false,
  })
  addText(slide, truncate(structuredSlide.claim, 170), {
    x: 2.65,
    y: 3.85,
    w: 8.05,
    h: 0.56,
    fontFace: "Aptos",
    fontSize: 14,
    color: image ? "DDE3EA" : theme.muted,
    align: "center",
    breakLine: false,
  })
  slide.addNotes(structuredSlide.speakerNotes)
}

async function addContentSlide(pptx: pptxgen, structuredSlide: SlidesStructuredSlide, theme: Theme) {
  const slide = pptx.addSlide()
  addBackground(slide, theme.background)
  addKicker(slide, `Slide ${structuredSlide.slideNumber}`, theme)
  addText(slide, truncate(structuredSlide.title, 110), {
    x: 0.62,
    y: 0.98,
    w: 6.35,
    h: 0.86,
    fontFace: "Georgia",
    fontSize: 27,
    bold: true,
    color: theme.foreground,
    breakLine: false,
  })
  addText(slide, truncate(structuredSlide.claim, 210), {
    x: 0.65,
    y: 2.02,
    w: 6.15,
    h: 0.72,
    fontFace: "Aptos",
    fontSize: 15,
    bold: false,
    color: theme.muted,
    breakLine: false,
  })
  addText(slide, asLines(structuredSlide.body), {
    x: 0.74,
    y: 3.12,
    w: 5.7,
    h: 2.35,
    fontFace: "Aptos",
    fontSize: 12,
    color: theme.foreground,
    breakLine: false,
    valign: "top",
    paraSpaceAfter: 8,
  })

  const imageAdded = structuredSlide.visualAsset?.kind === "web_image" || structuredSlide.visualAsset?.kind === "source_image"
    ? await addOptionalImage(slide, structuredSlide, theme, 7.28, 1.02, 5.08, 5.38)
    : false
  if (!imageAdded) addProofPanel(slide, structuredSlide, theme)

  addSlideNumber(slide, structuredSlide, theme)
  slide.addNotes(structuredSlide.speakerNotes)
}

function addCoverSlide(pptx: pptxgen, deck: SlidesDeck, structuredSlide: SlidesStructuredSlide, theme: Theme) {
  const slide = pptx.addSlide()
  addBackground(slide, theme.foreground)
  slide.addShape("rect", {
    x: 9.55,
    y: 0,
    w: 3.78,
    h: 7.5,
    fill: { color: theme.accent, transparency: 6 },
    line: { color: theme.accent, transparency: 100 },
  })
  slide.addShape("arc", {
    x: 8.35,
    y: 1.1,
    w: 3.2,
    h: 3.2,
    line: { color: theme.inverse, transparency: 15, pt: 2 },
  })
  addKicker(slide, "Flowro Slides", { ...theme, accent: theme.inverse }, 0.7, 0.68)
  addText(slide, truncate(deck.title || structuredSlide.title, 130), {
    x: 0.72,
    y: 1.58,
    w: 8.4,
    h: 1.72,
    fontFace: "Georgia",
    fontSize: 38,
    bold: true,
    color: theme.inverse,
    breakLine: false,
  })
  addText(slide, truncate(deck.subtitle || structuredSlide.claim, 210), {
    x: 0.76,
    y: 3.72,
    w: 7.4,
    h: 0.78,
    fontFace: "Aptos",
    fontSize: 15,
    color: "DDE3EA",
    breakLine: false,
  })
  addText(slide, truncate(structuredSlide.visualTone, 120), {
    x: 0.76,
    y: 5.92,
    w: 5.2,
    h: 0.24,
    fontFace: "Aptos",
    fontSize: 8,
    bold: true,
    color: "DDE3EA",
    charSpacing: 0.8,
  })
  slide.addNotes(structuredSlide.speakerNotes)
}

function addClosingSlide(pptx: pptxgen, structuredSlide: SlidesStructuredSlide, theme: Theme) {
  const slide = pptx.addSlide()
  addBackground(slide, theme.foreground)
  addKicker(slide, "Recommendation", { ...theme, accent: theme.inverse }, 0.72, 0.72)
  addText(slide, truncate(structuredSlide.title, 110), {
    x: 0.76,
    y: 1.38,
    w: 8.2,
    h: 1.02,
    fontFace: "Georgia",
    fontSize: 32,
    bold: true,
    color: theme.inverse,
    breakLine: false,
  })
  addText(slide, truncate(structuredSlide.claim, 230), {
    x: 0.78,
    y: 2.72,
    w: 7.5,
    h: 0.8,
    fontFace: "Aptos",
    fontSize: 15,
    color: "DDE3EA",
    breakLine: false,
  })
  structuredSlide.body.slice(0, 3).forEach((item, index) => {
    const y = 4.18 + index * 0.62
    slide.addShape("ellipse", {
      x: 0.8,
      y,
      w: 0.32,
      h: 0.32,
      fill: { color: index === 0 ? theme.accent : "DDE3EA" },
      line: { color: index === 0 ? theme.accent : "DDE3EA" },
    })
    addText(slide, truncate(item, 150), {
      x: 1.32,
      y: y + 0.02,
      w: 6.7,
      h: 0.22,
      fontFace: "Aptos",
      fontSize: 11,
      color: "FFFFFF",
    })
  })
  addProofPanel(slide, structuredSlide, { ...theme, background: theme.foreground, foreground: theme.foreground }, 8.55, 1.18, 3.85, 4.88)
  slide.addNotes(structuredSlide.speakerNotes)
}

export async function exportSlidesDeckToPptx(deck: SlidesDeck): Promise<Buffer> {
  const pptx = new pptxgen()
  pptx.layout = "LAYOUT_WIDE"
  pptx.author = "Flowro"
  pptx.company = "Flowro"
  pptx.subject = deck.subtitle ?? deck.title
  pptx.title = deck.title
  pptx.theme = {
    headFontFace: "Georgia",
    bodyFontFace: "Aptos",
  }

  const theme = themeFor(deck)
  for (const structuredSlide of deck.slides) {
    if (structuredSlide.layout === "cover" || structuredSlide.slideNumber === 1) {
      addCoverSlide(pptx, deck, structuredSlide, theme)
    } else if (structuredSlide.layout === "closing") {
      addClosingSlide(pptx, structuredSlide, theme)
    } else if (structuredSlide.layout === "big_number") {
      addBigNumberSlide(pptx, structuredSlide, theme)
    } else if (structuredSlide.layout === "side_by_side") {
      addSideBySideSlide(pptx, structuredSlide, theme)
    } else if (structuredSlide.layout === "quote_highlight") {
      addQuoteHighlightSlide(pptx, structuredSlide, theme)
    } else if (structuredSlide.layout === "timeline_vertical") {
      addTimelineVerticalSlide(pptx, structuredSlide, theme)
    } else if (structuredSlide.layout === "image_left") {
      await addImageLeftSlide(pptx, structuredSlide, theme)
    } else if (structuredSlide.layout === "image_full") {
      await addImageFullSlide(pptx, structuredSlide, theme)
    } else {
      await addContentSlide(pptx, structuredSlide, theme)
    }
  }

  const output = await pptx.write({ outputType: "nodebuffer", compression: true })
  return Buffer.isBuffer(output) ? output : Buffer.from(output as Uint8Array)
}

// ─── Path A export ────────────────────────────────────────────────────────────
// Run LLM-emitted slideCode against a real pptxgenjs instance inside the sandbox.
// The sandbox is what guarantees the code can't escape (no fs/net/process); pptxgenjs handles
// the actual .pptx authoring. This replaces the JSON-driven exporter for any deck that has slideCode.
export async function exportSlidesDeckCodeToPptx(args: {
  slideCode: string
  assets?: SlidesAssetBag
  title?: string
  subtitle?: string
}): Promise<Buffer> {
  const pptx = new pptxgen()
  pptx.layout = "LAYOUT_WIDE"
  pptx.author = "Flowro"
  pptx.company = "Flowro"
  if (args.subtitle) pptx.subject = args.subtitle
  if (args.title) pptx.title = args.title
  pptx.theme = { headFontFace: "Georgia", bodyFontFace: "Aptos" }

  const result = await runSlideCode({
    code: args.slideCode,
    options: { target: "pptx", assets: args.assets ?? {} },
    pres: pptx,
  })
  if (!result.ok) {
    throw new Error(`slideCode sandbox failed (${result.stage}): ${result.error}`)
  }

  const output = await pptx.write({ outputType: "nodebuffer", compression: true })
  return Buffer.isBuffer(output) ? output : Buffer.from(output as Uint8Array)
}

function pdfEscape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/\n/g, "\\n")
}

export function exportSlidesDeckToPdf(deck: SlidesDeck): Buffer {
  const objects: string[] = []
  const add = (body: string) => {
    objects.push(body)
    return objects.length
  }
  const fontId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
  const pageIds: number[] = []
  const pageContents = deck.slides.map((slide) => {
    const lines = [slide.title, slide.claim, ...slide.body.map((item) => `- ${item}`), slide.proof.title, slide.proof.description].slice(0, 11)
    const content = `BT /F1 24 Tf 54 500 Td (${pdfEscape(lines[0] || deck.title)}) Tj /F1 14 Tf 0 -44 Td (${pdfEscape(lines[1] || "")}) Tj ${lines.slice(2).map((line) => `0 -26 Td (${pdfEscape(line)}) Tj`).join(" ")} ET`
    return add(`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`)
  })
  let pagesId = 0
  deck.slides.forEach((_, index) => {
    pageIds.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 720 405] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${pageContents[index]} 0 R >>`))
  })
  pagesId = add(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`)
  pageIds.forEach((id) => {
    objects[id - 1] = objects[id - 1].replace("/Parent 0 0 R", `/Parent ${pagesId} 0 R`)
  })
  const catalogId = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`)
  const chunks = ["%PDF-1.4\n"]
  const offsets: number[] = [0]
  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(chunks.join("")))
    chunks.push(`${index + 1} 0 obj\n${body}\nendobj\n`)
  })
  const xref = Buffer.byteLength(chunks.join(""))
  chunks.push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `).join("\n")}\ntrailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`)
  return Buffer.from(chunks.join(""))
}
