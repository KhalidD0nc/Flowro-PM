// PreviewPres — pptxgenjs-shaped shim that records primitives instead of rendering pptx.
// The same slideCode runs against this for browser preview and against the real pptxgenjs for export.
// Coordinates are inches on a 13.33×7.5 widescreen canvas (matches LAYOUT_WIDE in pptxgenjs).

export const PREVIEW_CANVAS = { widthIn: 13.33, heightIn: 7.5 }

export type PreviewFill = { color?: string; transparency?: number }
export type PreviewLine = { color?: string; transparency?: number; width?: number; pt?: number; dashType?: string }

export type PreviewShape = {
  kind: "shape"
  shape: string
  x: number
  y: number
  w: number
  h: number
  rectRadius?: number
  fill?: PreviewFill
  line?: PreviewLine
  rotate?: number
}

export type PreviewText = {
  kind: "text"
  text: string
  x: number
  y: number
  w: number
  h: number
  fontFace?: string
  fontSize?: number
  bold?: boolean
  italic?: boolean
  color?: string
  align?: "left" | "center" | "right"
  valign?: "top" | "middle" | "bottom"
  charSpacing?: number
  fill?: PreviewFill
  paraSpaceAfter?: number
}

export type PreviewImage = {
  kind: "image"
  data?: string
  path?: string
  x: number
  y: number
  w: number
  h: number
  altText?: string
  rounding?: boolean
}

export type PreviewChartType = "bar" | "bar3D" | "line" | "doughnut" | "pie" | "scatter" | "area" | "radar"

export type PreviewChartSeries = {
  name: string
  labels: string[]
  values: number[]
}

export type PreviewChart = {
  kind: "chart"
  chartType: PreviewChartType
  x: number
  y: number
  w: number
  h: number
  series: PreviewChartSeries[]
  options?: Record<string, unknown>
}

export type PreviewPrimitive = PreviewShape | PreviewText | PreviewImage | PreviewChart

export type PreviewSlide = {
  index: number
  background: { color: string }
  notes: string
  primitives: PreviewPrimitive[]
}

export type PreviewDeck = {
  slides: PreviewSlide[]
  canvas: { widthIn: number; heightIn: number }
  warnings: string[]
}

const ALLOWED_SHAPES = new Set([
  "rect", "rectangle", "RECTANGLE",
  "roundRect", "roundedRectangle", "ROUNDED_RECTANGLE",
  "ellipse", "oval", "OVAL",
  "line", "LINE",
  "triangle", "TRIANGLE",
  "rightTriangle",
  "diamond", "DIAMOND",
  "arc", "ARC",
  "pentagon", "hexagon",
  "star4", "star5", "star6",
  "leftArrow", "rightArrow", "upArrow", "downArrow",
  "chevron",
])

const ALLOWED_CHARTS = new Set<PreviewChartType>(["bar", "bar3D", "line", "doughnut", "pie", "scatter", "area", "radar"])

type AddOpts = Record<string, unknown>

class SlideRecorder {
  index: number
  notes = ""
  primitives: PreviewPrimitive[] = []
  warnings: string[]
  maxShapesPerSlide: number
  #bg: { color: string } = { color: "FFFFFF" }

  constructor(index: number, warnings: string[], maxShapesPerSlide: number) {
    this.index = index
    this.warnings = warnings
    this.maxShapesPerSlide = maxShapesPerSlide
  }

  set background(value: { color?: string } | string | undefined) {
    if (typeof value === "string") this.#bg = { color: normalizeColor(value, "FFFFFF") }
    else if (value && typeof value === "object") this.#bg = { color: normalizeColor(value.color, "FFFFFF") }
  }
  get background(): { color: string } { return this.#bg }

  addShape(shape: string, opts: AddOpts) {
    if (!this.#guardCount()) return
    const normalized = ALLOWED_SHAPES.has(shape) ? shape : "rect"
    if (normalized !== shape) this.warnings.push(`slide ${this.index}: unknown shape "${shape}", coerced to rect`)
    this.primitives.push({
      kind: "shape",
      shape: normalized,
      x: num(opts.x), y: num(opts.y), w: num(opts.w), h: num(opts.h),
      rectRadius: opts.rectRadius != null ? num(opts.rectRadius) : undefined,
      fill: normalizeFill(opts.fill),
      line: normalizeLine(opts.line),
      rotate: opts.rotate != null ? num(opts.rotate) : undefined,
    })
  }

  addText(text: string | Array<{ text?: string }> | undefined, opts: AddOpts) {
    if (!this.#guardCount()) return
    const textValue = typeof text === "string"
      ? text
      : Array.isArray(text)
        ? text.map((t) => (typeof t === "string" ? t : t?.text ?? "")).join("\n")
        : ""
    this.primitives.push({
      kind: "text",
      text: textValue,
      x: num(opts.x), y: num(opts.y), w: num(opts.w), h: num(opts.h),
      fontFace: opts.fontFace as string | undefined,
      fontSize: opts.fontSize != null ? num(opts.fontSize) : undefined,
      bold: Boolean(opts.bold),
      italic: Boolean(opts.italic),
      color: opts.color != null ? normalizeColor(opts.color, "151515") : undefined,
      align: (opts.align as PreviewText["align"]) ?? "left",
      valign: (opts.valign as PreviewText["valign"]) ?? "top",
      charSpacing: opts.charSpacing != null ? num(opts.charSpacing) : undefined,
      fill: normalizeFill(opts.fill),
      paraSpaceAfter: opts.paraSpaceAfter != null ? num(opts.paraSpaceAfter) : undefined,
    })
  }

  addImage(opts: AddOpts) {
    if (!this.#guardCount()) return
    const data = typeof opts.data === "string" ? opts.data : undefined
    const path = typeof opts.path === "string" ? opts.path : undefined
    this.primitives.push({
      kind: "image",
      data, path,
      x: num(opts.x), y: num(opts.y), w: num(opts.w), h: num(opts.h),
      altText: typeof opts.altText === "string" ? opts.altText : undefined,
      rounding: Boolean(opts.rounding),
    })
  }

  addChart(chartType: string | undefined, data: unknown, opts: AddOpts = {}) {
    if (!this.#guardCount()) return
    const ct = (typeof chartType === "string" ? chartType.toLowerCase() : "bar") as PreviewChartType
    const finalType = ALLOWED_CHARTS.has(ct) ? ct : "bar"
    if (finalType !== ct) this.warnings.push(`slide ${this.index}: unknown chart "${chartType}", coerced to bar`)
    this.primitives.push({
      kind: "chart",
      chartType: finalType,
      x: num(opts.x ?? 1), y: num(opts.y ?? 1), w: num(opts.w ?? 6), h: num(opts.h ?? 3),
      series: normalizeChartData(data),
      options: opts as Record<string, unknown>,
    })
  }

  addNotes(text: string) {
    if (typeof text === "string") this.notes = text.slice(0, 4000)
  }

  #guardCount(): boolean {
    if (this.primitives.length >= this.maxShapesPerSlide) {
      this.warnings.push(`slide ${this.index}: shape count cap (${this.maxShapesPerSlide}) reached, dropping further primitives`)
      return false
    }
    return true
  }

  finalize(): PreviewSlide {
    return { index: this.index, background: this.#bg, notes: this.notes, primitives: this.primitives }
  }
}

export class PreviewPres {
  layout: string = "LAYOUT_WIDE"
  author?: string
  company?: string
  subject?: string
  title?: string
  theme?: Record<string, unknown>

  // pptxgenjs exposes pres.shapes / pres.charts as enums; we expose string-like values that round-trip through addShape/addChart.
  shapes = {
    RECTANGLE: "rect", RECT: "rect", ROUNDED_RECTANGLE: "roundRect",
    OVAL: "ellipse", ELLIPSE: "ellipse", LINE: "line", TRIANGLE: "triangle",
    DIAMOND: "diamond", ARC: "arc", PENTAGON: "pentagon", HEXAGON: "hexagon",
    STAR_4: "star4", STAR_5: "star5", STAR_6: "star6",
    LEFT_ARROW: "leftArrow", RIGHT_ARROW: "rightArrow", UP_ARROW: "upArrow", DOWN_ARROW: "downArrow",
    CHEVRON: "chevron",
  }
  charts = {
    BAR: "bar", BAR3D: "bar3D", LINE: "line", DOUGHNUT: "doughnut",
    PIE: "pie", SCATTER: "scatter", AREA: "area", RADAR: "radar",
  }

  #slides: SlideRecorder[] = []
  #warnings: string[] = []
  #maxSlides: number
  #maxShapesPerSlide: number

  constructor({ maxSlides = 24, maxShapesPerSlide = 80 }: { maxSlides?: number; maxShapesPerSlide?: number } = {}) {
    this.#maxSlides = maxSlides
    this.#maxShapesPerSlide = maxShapesPerSlide
  }

  addSlide(): SlideRecorder {
    if (this.#slides.length >= this.#maxSlides) {
      this.#warnings.push(`slide cap (${this.#maxSlides}) reached, addSlide ignored`)
      // return a no-op recorder that drops everything
      const dummy = new SlideRecorder(this.#slides.length + 1, this.#warnings, 0)
      return dummy
    }
    const recorder = new SlideRecorder(this.#slides.length + 1, this.#warnings, this.#maxShapesPerSlide)
    this.#slides.push(recorder)
    return recorder
  }

  finalize(): PreviewDeck {
    return {
      slides: this.#slides.map((s) => s.finalize()),
      canvas: PREVIEW_CANVAS,
      warnings: this.#warnings,
    }
  }
}

function num(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

function normalizeColor(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback
  const trimmed = value.trim().replace(/^#/, "")
  if (/^[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toUpperCase()
  if (/^[0-9a-fA-F]{3}$/.test(trimmed)) return trimmed.split("").map((c) => c + c).join("").toUpperCase()
  return fallback
}

function normalizeFill(value: unknown): PreviewFill | undefined {
  if (!value || typeof value !== "object") return undefined
  const v = value as { color?: unknown; transparency?: unknown }
  return {
    color: typeof v.color === "string" ? normalizeColor(v.color, "FFFFFF") : undefined,
    transparency: typeof v.transparency === "number" ? v.transparency : undefined,
  }
}

function normalizeLine(value: unknown): PreviewLine | undefined {
  if (!value || typeof value !== "object") return undefined
  const v = value as { color?: unknown; transparency?: unknown; pt?: unknown; width?: unknown; dashType?: unknown }
  return {
    color: typeof v.color === "string" ? normalizeColor(v.color, "B7C0CF") : undefined,
    transparency: typeof v.transparency === "number" ? v.transparency : undefined,
    pt: typeof v.pt === "number" ? v.pt : undefined,
    width: typeof v.width === "number" ? v.width : undefined,
    dashType: typeof v.dashType === "string" ? v.dashType : undefined,
  }
}

function normalizeChartData(data: unknown): PreviewChartSeries[] {
  if (!Array.isArray(data)) return []
  return data
    .map((entry) => {
      const e = entry as { name?: unknown; labels?: unknown; values?: unknown }
      const name = typeof e?.name === "string" ? e.name : "Series"
      const labels = Array.isArray(e?.labels) ? e.labels.map((l) => String(l)) : []
      const values = Array.isArray(e?.values) ? e.values.map((v) => num(v)) : []
      return { name, labels, values }
    })
    .filter((s) => s.values.length > 0)
}
