"use client"

// SlideCanvas — renders a PreviewDeck (captured pptxgenjs primitives) to the DOM.
// Each primitive is positioned absolutely on a 13.33×7.5-inch coordinate space scaled to the
// container width. Charts are inline SVG, the same data the LLM passed.

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import {
  PreviewPres,
  type PreviewChart,
  type PreviewChartSeries,
  type PreviewDeck,
  type PreviewImage,
  type PreviewPrimitive,
  type PreviewShape,
  type PreviewSlide,
  type PreviewText,
} from "@/lib/slides/previewPres"
import { runSlideCodeInBrowser } from "@/lib/slides/sandboxBrowser"

type Variant = "full" | "panel" | "thumbnail"

type Props = {
  slideCode: string
  assets?: Record<string, unknown>
  slideIndex?: number
  variant?: Variant
  fallback?: ReactNode
}

export default function SlideCanvas({ slideCode, assets, slideIndex = 0, variant = "panel", fallback }: Props) {
  const [deck, setDeck] = useState<PreviewDeck | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const pres = new PreviewPres()
    runSlideCodeInBrowser({ code: slideCode, pres, assets }).then((result) => {
      if (cancelled) return
      if (result.ok) {
        setDeck(pres.finalize())
        setError(null)
      } else {
        setDeck(null)
        setError(result.error)
      }
    })
    return () => { cancelled = true }
  }, [slideCode, assets])

  if (error) {
    if (fallback) return fallback
    return (
      <div className="flex h-full w-full items-center justify-center bg-red-50 p-6 text-center">
        <p className="text-sm text-red-700"><strong>SlideCanvas error</strong>: {error}</p>
      </div>
    )
  }
  if (!deck) {
    return <div className="flex h-full w-full items-center justify-center bg-neutral-100 text-xs text-neutral-500">Rendering preview…</div>
  }

  const slide = deck.slides[slideIndex] ?? deck.slides[0]
  if (!slide) return <div className="flex h-full w-full items-center justify-center bg-neutral-100 text-xs">No slides</div>

  return <SlideFrame slide={slide} canvas={deck.canvas} variant={variant} />
}

export function SlideCanvasFromDeck({ deck, slideIndex = 0, variant = "panel" }: { deck: PreviewDeck; slideIndex?: number; variant?: Variant }) {
  const slide = deck.slides[slideIndex] ?? deck.slides[0]
  if (!slide) return null
  return <SlideFrame slide={slide} canvas={deck.canvas} variant={variant} />
}

function SlideFrame({ slide, canvas, variant }: { slide: PreviewSlide; canvas: { widthIn: number; heightIn: number }; variant: Variant }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [pxPerIn, setPxPerIn] = useState<number>(96)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? el.clientWidth
      setPxPerIn(width / canvas.widthIn)
    })
    observer.observe(el)
    setPxPerIn(el.clientWidth / canvas.widthIn)
    return () => observer.disconnect()
  }, [canvas.widthIn])

  const aspectStyle = { aspectRatio: `${canvas.widthIn} / ${canvas.heightIn}` } as const
  const bg = `#${slide.background.color}`
  const isThumbnail = variant === "thumbnail"

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden"
      style={{ ...aspectStyle, background: bg, fontFamily: "Aptos, system-ui, sans-serif" }}
    >
      {slide.primitives.map((primitive, i) => (
        <PrimitiveView key={i} primitive={primitive} pxPerIn={pxPerIn} thumbnail={isThumbnail} />
      ))}
    </div>
  )
}

function PrimitiveView({ primitive, pxPerIn, thumbnail }: { primitive: PreviewPrimitive; pxPerIn: number; thumbnail: boolean }) {
  if (primitive.kind === "shape") return <ShapeView shape={primitive} pxPerIn={pxPerIn} />
  if (primitive.kind === "text") return <TextView text={primitive} pxPerIn={pxPerIn} thumbnail={thumbnail} />
  if (primitive.kind === "image") return <ImageView image={primitive} pxPerIn={pxPerIn} />
  if (primitive.kind === "chart") return <ChartView chart={primitive} pxPerIn={pxPerIn} />
  return null
}

function box(x: number, y: number, w: number, h: number, pxPerIn: number) {
  return {
    position: "absolute" as const,
    left: x * pxPerIn,
    top: y * pxPerIn,
    width: w * pxPerIn,
    height: h * pxPerIn,
  }
}

function fillStyle(fill?: { color?: string; transparency?: number }): string | undefined {
  if (!fill?.color) return undefined
  const opacity = fill.transparency != null ? Math.max(0, Math.min(1, 1 - fill.transparency / 100)) : 1
  if (opacity === 1) return `#${fill.color}`
  const r = parseInt(fill.color.slice(0, 2), 16)
  const g = parseInt(fill.color.slice(2, 4), 16)
  const b = parseInt(fill.color.slice(4, 6), 16)
  if ([r, g, b].some((v) => Number.isNaN(v))) return `#${fill.color}`
  return `rgba(${r}, ${g}, ${b}, ${opacity.toFixed(3)})`
}

function ShapeView({ shape, pxPerIn }: { shape: PreviewShape; pxPerIn: number }) {
  const style = {
    ...box(shape.x, shape.y, shape.w, shape.h, pxPerIn),
    background: fillStyle(shape.fill),
    border: shape.line?.color ? `${(shape.line.pt ?? shape.line.width ?? 1)}px solid ${fillStyle({ color: shape.line.color, transparency: shape.line.transparency }) ?? "#" + shape.line.color}` : undefined,
    transform: shape.rotate ? `rotate(${shape.rotate}deg)` : undefined,
  } as React.CSSProperties

  if (shape.shape === "ellipse" || shape.shape === "oval" || shape.shape === "OVAL") {
    style.borderRadius = "50%"
  } else if (shape.shape === "roundRect" || shape.shape === "ROUNDED_RECTANGLE" || shape.rectRadius) {
    style.borderRadius = `${(shape.rectRadius ?? 0.08) * pxPerIn}px`
  } else if (shape.shape === "line" || shape.shape === "LINE") {
    style.background = fillStyle({ color: shape.line?.color ?? "B7C0CF", transparency: shape.line?.transparency }) ?? "#B7C0CF"
    style.height = Math.max(1, (shape.line?.pt ?? 1))
  }

  if (shape.shape === "triangle" || shape.shape === "TRIANGLE") {
    return (
      <svg style={box(shape.x, shape.y, shape.w, shape.h, pxPerIn)} viewBox="0 0 100 100" preserveAspectRatio="none">
        <polygon points="50,0 100,100 0,100" fill={fillStyle(shape.fill) ?? `#${shape.fill?.color ?? "B7C0CF"}`} />
      </svg>
    )
  }
  if (shape.shape === "diamond" || shape.shape === "DIAMOND") {
    return (
      <svg style={box(shape.x, shape.y, shape.w, shape.h, pxPerIn)} viewBox="0 0 100 100" preserveAspectRatio="none">
        <polygon points="50,0 100,50 50,100 0,50" fill={fillStyle(shape.fill) ?? `#${shape.fill?.color ?? "B7C0CF"}`} />
      </svg>
    )
  }

  return <div style={style} />
}

function TextView({ text, pxPerIn, thumbnail }: { text: PreviewText; pxPerIn: number; thumbnail: boolean }) {
  // pptxgenjs fontSize is in points (≈1.333 px). Scale relative to canvas width to keep proportional.
  const ptToPx = pxPerIn / 72
  const fontSize = (text.fontSize ?? 12) * ptToPx
  const style: React.CSSProperties = {
    ...box(text.x, text.y, text.w, text.h, pxPerIn),
    color: text.color ? `#${text.color}` : undefined,
    fontFamily: text.fontFace ? `${text.fontFace}, system-ui, sans-serif` : undefined,
    fontSize,
    fontWeight: text.bold ? 700 : 400,
    fontStyle: text.italic ? "italic" : undefined,
    textAlign: text.align ?? "left",
    letterSpacing: text.charSpacing ? `${text.charSpacing * 0.05}em` : undefined,
    background: fillStyle(text.fill),
    display: "flex",
    flexDirection: "column",
    justifyContent:
      text.valign === "middle" ? "center" : text.valign === "bottom" ? "flex-end" : "flex-start",
    whiteSpace: "pre-wrap",
    overflow: "hidden",
    lineHeight: 1.2,
    padding: 0,
  }
  if (thumbnail) style.fontSize = Math.max(6, fontSize * 0.6)
  return <div style={style}>{text.text}</div>
}

function ImageView({ image, pxPerIn }: { image: PreviewImage; pxPerIn: number }) {
  const src = image.data || image.path
  const style: React.CSSProperties = {
    ...box(image.x, image.y, image.w, image.h, pxPerIn),
    overflow: "hidden",
    borderRadius: image.rounding ? `${0.05 * pxPerIn}px` : undefined,
  }
  if (!src) return <div style={{ ...style, background: "#E5E7EB" }} />
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={image.altText ?? ""} style={{ ...style, objectFit: "cover" }} />
}

function ChartView({ chart, pxPerIn }: { chart: PreviewChart; pxPerIn: number }) {
  const style = box(chart.x, chart.y, chart.w, chart.h, pxPerIn)
  const colors = (chart.options?.chartColors as string[] | undefined) ?? ["00E5C3", "0D1B3E", "5F6B7A", "B7C0CF"]
  const barDir = (chart.options?.barDir as string | undefined) ?? "col"

  return (
    <div style={style}>
      {chart.chartType === "bar" || chart.chartType === "bar3D" ? (
        <BarChartSvg series={chart.series} colors={colors} horizontal={barDir === "bar"} />
      ) : chart.chartType === "line" || chart.chartType === "area" ? (
        <LineChartSvg series={chart.series} colors={colors} filled={chart.chartType === "area"} />
      ) : chart.chartType === "doughnut" || chart.chartType === "pie" ? (
        <DoughnutChartSvg series={chart.series} colors={colors} doughnut={chart.chartType === "doughnut"} />
      ) : chart.chartType === "scatter" ? (
        <ScatterChartSvg series={chart.series} colors={colors} />
      ) : (
        <BarChartSvg series={chart.series} colors={colors} />
      )}
    </div>
  )
}

function BarChartSvg({ series, colors, horizontal = false }: { series: PreviewChartSeries[]; colors: string[]; horizontal?: boolean }) {
  const labels = series[0]?.labels ?? []
  const values = series[0]?.values ?? []
  const max = Math.max(1, ...values)
  const W = 400
  const H = 240
  const PAD = { top: 12, right: 12, bottom: 32, left: 36 }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom
  const slot = plotW / Math.max(values.length, 1)
  const barW = Math.min(48, slot * 0.6)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full">
      <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} stroke="#9CA3AF" strokeOpacity="0.4" />
      {values.map((v, i) => {
        const cx = PAD.left + slot * i + slot / 2
        const barH = horizontal ? (slot * 0.55) : Math.max(2, (v / max) * plotH)
        const y = H - PAD.bottom - barH
        return (
          <g key={i}>
            <rect x={cx - barW / 2} y={y} width={barW} height={barH} rx={2} fill={`#${colors[0] ?? "00E5C3"}`} />
            <text x={cx} y={y - 4} textAnchor="middle" fontSize={9} fontWeight="bold" fill={`#${colors[0] ?? "00E5C3"}`}>{v}</text>
            <text x={cx} y={H - PAD.bottom + 14} textAnchor="middle" fontSize={9} fill="#5F6B7A">{labels[i] ?? ""}</text>
          </g>
        )
      })}
    </svg>
  )
}

function LineChartSvg({ series, colors, filled }: { series: PreviewChartSeries[]; colors: string[]; filled: boolean }) {
  const s = series[0]
  if (!s || s.values.length < 2) return null
  const max = Math.max(...s.values)
  const min = Math.min(...s.values)
  const range = max - min || 1
  const W = 400, H = 240
  const PAD = { top: 12, right: 12, bottom: 28, left: 36 }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom
  const px = (i: number) => PAD.left + (i / (s.values.length - 1)) * plotW
  const py = (v: number) => PAD.top + (1 - (v - min) / range) * plotH
  const points = s.values.map((v, i) => `${px(i)},${py(v)}`).join(" ")
  const color = `#${colors[0] ?? "00E5C3"}`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full">
      {filled && (
        <polygon
          points={`${PAD.left},${PAD.top + plotH} ${points} ${PAD.left + plotW},${PAD.top + plotH}`}
          fill={color} fillOpacity={0.18}
        />
      )}
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} />
      {s.values.map((v, i) => (
        <circle key={i} cx={px(i)} cy={py(v)} r={i === s.values.length - 1 ? 4 : 2.5} fill={color} />
      ))}
      {s.labels.map((label, i) => (
        <text key={i} x={px(i)} y={H - 6} textAnchor="middle" fontSize={9} fill="#5F6B7A">{label}</text>
      ))}
    </svg>
  )
}

function DoughnutChartSvg({ series, colors, doughnut }: { series: PreviewChartSeries[]; colors: string[]; doughnut: boolean }) {
  const s = series[0]
  if (!s) return null
  const total = s.values.reduce((sum, v) => sum + v, 0) || 1
  const R = 80, CX = 100, CY = 100
  const C = 2 * Math.PI * R
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full">
      {s.values.map((v, i) => {
        const cumulative = s.values.slice(0, i).reduce((sum, value) => sum + value / total, 0)
        const dash = (v / total) * C
        const offset = C * 0.25 - cumulative * C
        return (
          <circle
            key={i} cx={CX} cy={CY} r={R} fill="none"
            stroke={`#${colors[i % colors.length] ?? "00E5C3"}`}
            strokeWidth={doughnut ? 36 : 80}
            strokeDasharray={`${dash} ${C - dash}`}
            strokeDashoffset={offset}
          />
        )
      })}
    </svg>
  )
}

function ScatterChartSvg({ series, colors }: { series: PreviewChartSeries[]; colors: string[] }) {
  const s = series[0]
  if (!s) return null
  const W = 400, H = 240
  const PAD = { top: 12, right: 12, bottom: 28, left: 36 }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom
  const xs = s.labels.map((l) => Number(l) || 0)
  const ys = s.values
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const rangeX = maxX - minX || 1
  const rangeY = maxY - minY || 1
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full">
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={H - PAD.bottom} stroke="#9CA3AF" strokeOpacity="0.4" />
      <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} stroke="#9CA3AF" strokeOpacity="0.4" />
      {xs.map((x, i) => {
        const cx = PAD.left + ((x - minX) / rangeX) * plotW
        const cy = PAD.top + (1 - (ys[i] - minY) / rangeY) * plotH
        return <circle key={i} cx={cx} cy={cy} r={4} fill={`#${colors[0] ?? "00E5C3"}`} fillOpacity={0.7} />
      })}
    </svg>
  )
}

// Convenience: render the entire deck as a vertical stack (for full-deck preview pages).
export function SlideDeckCanvas({ deck }: { deck: PreviewDeck }) {
  const slides = useMemo(() => deck.slides, [deck])
  return (
    <div className="flex flex-col gap-6">
      {slides.map((_, i) => (
        <SlideCanvasFromDeck key={i} deck={deck} slideIndex={i} variant="full" />
      ))}
    </div>
  )
}
