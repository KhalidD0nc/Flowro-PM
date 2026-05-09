"use client"

import type { CSSProperties } from "react"
import Image from "next/image"
import {
  inferSlidesChartType,
  numericValueFromProofDatum,
  type SlidesDeck,
  type SlidesSource,
  type SlidesStructuredSlide,
} from "@/lib/slides/schema"

type SlideRendererProps = {
  deck: SlidesDeck
  slide: SlidesStructuredSlide
  sources?: SlidesSource[]
  variant?: "full" | "panel" | "thumbnail"
}

type ProofDatum = SlidesStructuredSlide["proof"]["data"][number]

function cleanColor(value: string | undefined, fallback: string) {
  return /^#[0-9a-f]{6}$/i.test(value ?? "") ? value! : fallback
}

function themeVars(deck: SlidesDeck): CSSProperties {
  return {
    "--slide-bg": cleanColor(deck.theme.background, "#ffffff"),
    "--slide-fg": cleanColor(deck.theme.foreground, "#111111"),
    "--slide-accent": cleanColor(deck.theme.accent, "#0f766e"),
    "--slide-muted": cleanColor(deck.theme.muted, "#5f6b7a"),
  } as CSSProperties
}

function visualUrl(slide: SlidesStructuredSlide, sources: SlidesSource[]) {
  if (slide.visualAsset.dataUrl) return slide.visualAsset.dataUrl
  if (slide.visualAsset.url) return slide.visualAsset.url
  if (!slide.visualAsset.sourceId) return null
  const source = sources.find((item) => item.id === slide.visualAsset.sourceId)
  return source?.dataUrl || source?.url || null
}

function numericVal(row: ProofDatum): number {
  return numericValueFromProofDatum(row)
}

function numericXVal(row: ProofDatum, index: number): number {
  if (row.xValue !== undefined) return row.xValue
  const parsed = Number(row.label.replace(/[^\d.-]/g, ""))
  return Number.isFinite(parsed) ? parsed : index
}

// ─── Chart components ─────────────────────────────────────────────────────────

function ChartBarHorizontal({ data }: { data: ProofDatum[] }) {
  const rows = data.slice(0, 6)
  const values = rows.map(numericVal)
  const max = Math.max(1, ...values)

  return (
    <div className="space-y-2.5">
      {rows.map((row, i) => {
        const val = values[i]
        const pct = Math.max(8, Math.min(100, (val / max) * 100))
        const isMax = val === max
        const valueInside = pct > 30

        return (
          <div key={`${row.label}-${i}`} className="flex items-center gap-3">
            <span className="w-24 shrink-0 truncate text-right text-[0.8rem] font-semibold text-[color:var(--slide-fg)]">
              {row.label}
            </span>
            <div className="relative flex-1">
              <div className="h-6 w-full rounded-full bg-black/6" />
              {[25, 50, 75].map((p) => (
                <div key={p} className="absolute inset-y-0 w-px bg-black/10" style={{ left: `${p}%` }} />
              ))}
              <div
                className="absolute left-0 top-0 flex h-6 items-center justify-end rounded-full pr-2"
                style={{
                  width: `${pct}%`,
                  backgroundColor: "var(--slide-accent)",
                  opacity: isMax ? 1 : 0.65,
                }}
              >
                {valueInside && (
                  <span className="text-[0.72rem] font-bold text-white">{row.value}</span>
                )}
              </div>
              {!valueInside && (
                <span
                  className="absolute top-1/2 -translate-y-1/2 text-[0.72rem] font-bold text-[color:var(--slide-muted)]"
                  style={{ left: `calc(${pct}% + 0.375rem)` }}
                >
                  {row.value}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ChartBarVertical({ data }: { data: ProofDatum[] }) {
  const rows = data.slice(0, 8)
  const values = rows.map(numericVal)
  const max = Math.max(1, ...values)
  const W = 280
  const H = 140
  const PAD = { top: 20, right: 8, bottom: rows.length > 5 ? 44 : 32, left: 8 }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom
  const barW = Math.min(32, (plotW / rows.length) * 0.65)
  const slot = plotW / rows.length

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} stroke="currentColor" strokeOpacity={0.15} />
      {rows.map((row, i) => {
        const cx = PAD.left + slot * i + slot / 2
        const barH = Math.max(4, (values[i] / max) * plotH)
        const y = H - PAD.bottom - barH
        const isMax = values[i] === max
        return (
          <g key={i}>
            <rect x={cx - barW / 2} y={y} width={barW} height={barH} rx={2} fill="var(--slide-accent)" fillOpacity={isMax ? 1 : 0.65} />
            <text x={cx} y={y - 4} textAnchor="middle" fontSize={9} fontWeight="bold" fill="var(--slide-accent)">{row.value}</text>
            {rows.length > 5 ? (
              <text x={cx + 2} y={H - PAD.bottom + 10} textAnchor="end" fontSize={7.5} fill="currentColor" fillOpacity={0.5}
                transform={`rotate(-42 ${cx + 2} ${H - PAD.bottom + 10})`}>
                {row.label.length > 9 ? `${row.label.slice(0, 8)}…` : row.label}
              </text>
            ) : (
              <text x={cx} y={H - PAD.bottom + 14} textAnchor="middle" fontSize={8} fill="currentColor" fillOpacity={0.5}>
                {row.label.length > 11 ? `${row.label.slice(0, 10)}…` : row.label}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

function ChartLine({ data, filled = false }: { data: ProofDatum[]; filled?: boolean }) {
  const items = data.slice(0, 12)
  if (items.length < 2) return <ChartBarHorizontal data={data} />
  const values = items.map(numericVal)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const W = 280
  const H = 130
  const PAD = { top: 16, right: 16, bottom: 28, left: 30 }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom

  const px = (i: number) => PAD.left + (i / (items.length - 1)) * plotW
  const py = (v: number) => PAD.top + (1 - (v - min) / range) * plotH
  const pts = items.map((_, i) => ({ x: px(i), y: py(values[i]) }))
  const polyline = pts.map((p) => `${p.x},${p.y}`).join(" ")
  const refVals = [0, 0.5, 1].map((t) => min + t * range)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {refVals.map((v) => {
        const ry = py(v)
        return (
          <g key={v}>
            <line x1={PAD.left} y1={ry} x2={W - PAD.right} y2={ry} stroke="currentColor" strokeOpacity={0.1} strokeDasharray="4 4" />
            <text x={PAD.left - 3} y={ry} textAnchor="end" dominantBaseline="middle" fontSize={7.5} fill="currentColor" fillOpacity={0.4}>
              {range > 100 ? Math.round(v) : v.toFixed(1)}
            </text>
          </g>
        )
      })}
      {filled && (
        <path
          d={`M ${pts[0].x},${PAD.top + plotH} ${pts.map((p) => `L ${p.x},${p.y}`).join(" ")} L ${pts[pts.length - 1].x},${PAD.top + plotH} Z`}
          fill="var(--slide-accent)"
          fillOpacity={0.15}
        />
      )}
      <polyline points={polyline} fill="none" stroke="var(--slide-accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 5 : 3} fill="var(--slide-accent)" />
      ))}
      <text x={pts[pts.length - 1].x} y={pts[pts.length - 1].y - 9} textAnchor="middle" fontSize={9} fontWeight="bold" fill="var(--slide-accent)">
        {items[items.length - 1].value}
      </text>
      {items.map((item, i) => {
        const skip = items.length > 6 && i !== 0 && i !== items.length - 1 && i % Math.ceil(items.length / 6) !== 0
        return skip ? null : (
          <text key={i} x={pts[i].x} y={H - 4} textAnchor="middle" fontSize={7} fill="currentColor" fillOpacity={0.5}>
            {item.label}
          </text>
        )
      })}
    </svg>
  )
}

function ChartDonut({ data }: { data: ProofDatum[] }) {
  const items = data.slice(0, 5)
  const values = items.map((r) => Math.abs(numericVal(r)) || 1)
  const total = values.reduce((a, b) => a + b, 0) || 1
  const R = 40
  const C = 2 * Math.PI * R
  const CX = 55
  const CY = 55
  const opacities = [1, 0.72, 0.5, 0.32, 0.18]
  const segments = items.map((item, i) => {
    const pct = values[i] / total
    const cumulative = values.slice(0, i).reduce((sum, value) => sum + value / total, 0)
    const dash = pct * C
    const dashOffset = C * 0.25 - cumulative * C
    return { item, dash, dashOffset, opacity: opacities[i] ?? 0.15 }
  })
  const largestIdx = values.indexOf(Math.max(...values))

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 110 110" className="h-28 w-28 shrink-0">
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="currentColor" strokeOpacity={0.07} strokeWidth={28} />
        {segments.map((seg, i) => (
          <circle
            key={i}
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke="var(--slide-accent)"
            strokeOpacity={seg.opacity}
            strokeWidth={28}
            strokeDasharray={`${seg.dash} ${C - seg.dash}`}
            strokeDashoffset={seg.dashOffset}
          />
        ))}
        <text x={CX} y={CY - 5} textAnchor="middle" fontSize={13} fontWeight="bold" fill="var(--slide-accent)">
          {items[largestIdx]?.value}
        </text>
        <text x={CX} y={CY + 9} textAnchor="middle" fontSize={7.5} fill="currentColor" fillOpacity={0.5}>
          {items[largestIdx]?.label}
        </text>
      </svg>
      <div className="flex min-w-0 flex-col gap-1.5">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: "var(--slide-accent)", opacity: seg.opacity }} />
            <span className="flex-1 truncate text-[0.68rem] text-[color:var(--slide-fg)]">{seg.item.label}</span>
            <span className="shrink-0 text-[0.68rem] font-semibold text-[color:var(--slide-muted)]">{seg.item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ChartProgress({ data }: { data: ProofDatum[] }) {
  const item = data[0]
  if (!item) return null
  const val = numericVal(item)
  const pct = Math.max(0, Math.min(100, val))
  const goalItem = data[1]

  return (
    <div className="flex flex-col items-center gap-3 py-2">
      <p className="text-[3rem] font-black leading-none text-[color:var(--slide-accent)]">{item.value}</p>
      <div className="w-full">
        <div className="h-3 w-full rounded-full bg-black/8">
          <div className="h-3 rounded-full bg-[color:var(--slide-accent)]" style={{ width: `${pct}%` }} />
        </div>
      </div>
      {goalItem && (
        <p className="text-[0.75rem] text-[color:var(--slide-muted)]">{goalItem.label}: {goalItem.value}</p>
      )}
      {!goalItem && item.label && (
        <p className="text-[0.75rem] text-[color:var(--slide-muted)]">{item.label}</p>
      )}
    </div>
  )
}

function ChartFunnel({ data }: { data: ProofDatum[] }) {
  const stages = data.slice(0, 6)
  const values = stages.map(numericVal)
  const maxVal = Math.max(1, ...values)

  return (
    <div className="flex flex-col gap-0.5">
      {stages.map((stage, i) => {
        const pct = Math.max(30, Math.min(100, (values[i] / maxVal) * 100))
        const opacity = 1 - (i / stages.length) * 0.72
        const nextVal = values[i + 1]
        const dropPct = nextVal !== undefined && values[i] > 0 ? Math.round((1 - nextVal / values[i]) * 100) : null

        return (
          <div key={i} className="flex flex-col items-center">
            <div
              className="mx-auto flex items-center justify-between rounded px-2.5 py-1.5 text-white"
              style={{ width: `${pct}%`, backgroundColor: "var(--slide-accent)", opacity }}
            >
              <span className="truncate text-[0.68rem] font-semibold">{stage.label}</span>
              <span className="ml-2 shrink-0 text-[0.72rem] font-bold">{stage.value}</span>
            </div>
            {dropPct !== null && (
              <p className="text-[0.62rem] font-semibold text-[color:var(--slide-muted)]">↓ {dropPct}% drop-off</p>
            )}
          </div>
        )
      })}
    </div>
  )
}

function ChartScatter({ data }: { data: ProofDatum[] }) {
  const items = data.slice(0, 20)
  if (items.length < 2) return <ChartBarHorizontal data={data} />
  const xValues = items.map(numericXVal)
  const yValues = items.map(numericVal)
  const minX = Math.min(...xValues)
  const maxX = Math.max(...xValues)
  const minY = Math.min(...yValues)
  const maxY = Math.max(...yValues)
  const rangeX = maxX - minX || 1
  const rangeY = maxY - minY || 1
  const W = 280
  const H = 130
  const PAD = { top: 12, right: 12, bottom: 28, left: 30 }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom

  const pts = items.map((_, i) => ({
    x: PAD.left + ((xValues[i] - minX) / rangeX) * plotW,
    y: PAD.top + (1 - (yValues[i] - minY) / rangeY) * plotH,
  }))

  const n = pts.length
  const sumX = pts.reduce((a, p) => a + p.x, 0)
  const sumY = pts.reduce((a, p) => a + p.y, 0)
  const sumXY = pts.reduce((a, p) => a + p.x * p.y, 0)
  const sumX2 = pts.reduce((a, p) => a + p.x * p.x, 0)
  const denom = n * sumX2 - sumX * sumX
  const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0
  const intercept = (sumY - slope * sumX) / n

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={H - PAD.bottom} stroke="currentColor" strokeOpacity={0.2} />
      <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} stroke="currentColor" strokeOpacity={0.2} />
      {n > 2 && (
        <line
          x1={PAD.left} y1={slope * PAD.left + intercept}
          x2={W - PAD.right} y2={slope * (W - PAD.right) + intercept}
          stroke="var(--slide-accent)" strokeOpacity={0.3} strokeWidth={1.5} strokeDasharray="4 4"
        />
      )}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={4} fill="var(--slide-accent)" fillOpacity={0.75} />
      ))}
      <text x={PAD.left} y={H - 4} textAnchor="middle" fontSize={7} fill="currentColor" fillOpacity={0.5}>{minX}</text>
      <text x={W - PAD.right} y={H - 4} textAnchor="middle" fontSize={7} fill="currentColor" fillOpacity={0.5}>{maxX}</text>
      <text x={PAD.left - 5} y={PAD.top + 6} textAnchor="end" fontSize={7} fill="currentColor" fillOpacity={0.5}>{maxY}</text>
      <text x={PAD.left - 5} y={H - PAD.bottom} textAnchor="end" fontSize={7} fill="currentColor" fillOpacity={0.5}>{minY}</text>
    </svg>
  )
}

// ─── Non-chart proof components ───────────────────────────────────────────────

function ProofComparison({ rows }: { rows: ProofDatum[] }) {
  const groups = [...new Set(rows.map((r) => r.group).filter(Boolean))]
  let leftItems: ProofDatum[]
  let rightItems: ProofDatum[]

  if (groups.length >= 2) {
    leftItems = rows.filter((r) => r.group === groups[0])
    rightItems = rows.filter((r) => r.group === groups[1])
  } else {
    const mid = Math.ceil(rows.length / 2)
    leftItems = rows.slice(0, mid)
    rightItems = rows.slice(mid)
  }

  const leftHeader = leftItems[0]?.label ?? "Before"
  const rightHeader = rightItems[0]?.label ?? "After"
  const leftBullets = leftItems.slice(1)
  const rightBullets = rightItems.slice(1)

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <p className="mb-3 border-b border-[color:var(--slide-muted)]/20 pb-2 text-[0.9rem] font-bold uppercase tracking-wide text-[color:var(--slide-muted)]">
          {leftHeader}
        </p>
        <div className="space-y-2">
          {leftBullets.length > 0
            ? leftBullets.map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-[color:var(--slide-muted)]">—</span>
                  <span className="text-[0.75rem] text-[color:var(--slide-muted)]">{item.label}{item.value ? `: ${item.value}` : ""}</span>
                </div>
              ))
            : leftItems[0] && (
                <p className="text-[0.75rem] text-[color:var(--slide-muted)]">{leftItems[0].value}</p>
              )}
        </div>
      </div>
      <div>
        <p className="mb-3 border-b border-[color:var(--slide-accent)]/30 pb-2 text-[0.9rem] font-bold uppercase tracking-wide text-[color:var(--slide-accent)]">
          {rightHeader}
        </p>
        <div className="space-y-2">
          {rightBullets.length > 0
            ? rightBullets.map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 font-bold text-[color:var(--slide-accent)]">✓</span>
                  <span className="text-[0.75rem] font-medium text-[color:var(--slide-fg)]">{item.label}{item.value ? `: ${item.value}` : ""}</span>
                </div>
              ))
            : rightItems[0] && (
                <p className="text-[0.75rem] font-medium text-[color:var(--slide-accent)]">{rightItems[0].value}</p>
              )}
        </div>
      </div>
    </div>
  )
}

function ProofTimeline({ rows }: { rows: ProofDatum[] }) {
  const steps = rows.slice(0, 5)
  return (
    <div className="flex items-start">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1
        return (
          <div key={i} className="flex flex-1 items-start">
            <div className={`flex flex-1 flex-col items-center rounded-md p-2 ${isLast ? "bg-[color:var(--slide-accent)] text-white" : ""}`}>
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  isLast ? "bg-white/25 text-white" : "bg-[color:var(--slide-accent)] text-white"
                }`}
              >
                {i + 1}
              </div>
              <p className={`mt-2 text-center text-[0.73rem] font-bold ${isLast ? "text-white" : "text-[color:var(--slide-fg)]"}`}>
                {step.label}
              </p>
              <p className={`mt-1 text-center text-[0.63rem] leading-snug ${isLast ? "text-white/80" : "text-[color:var(--slide-muted)]"}`}>
                {step.value}
              </p>
            </div>
            {!isLast && (
              <div className="mt-3.5 h-px w-4 shrink-0 border-t-2 border-[color:var(--slide-accent)]/40" />
            )}
          </div>
        )
      })}
    </div>
  )
}

function ProofDiagram({ rows }: { rows: ProofDatum[] }) {
  const nodes = rows.slice(0, 5)
  return (
    <div className="flex flex-wrap items-center gap-0">
      {nodes.map((node, i) => {
        const isLast = i === nodes.length - 1
        return (
          <div key={i} className="flex items-center">
            <div
              className={`rounded-md border p-3 ${
                isLast
                  ? "border-[color:var(--slide-accent)] bg-[color:var(--slide-accent)] text-white"
                  : "border-[color:var(--slide-accent)] bg-white/75"
              }`}
            >
              <p className={`text-[0.68rem] font-bold ${isLast ? "text-white" : "text-[color:var(--slide-fg)]"}`}>{node.label}</p>
              <p className={`mt-1 text-[0.62rem] leading-snug ${isLast ? "text-white/80" : "text-[color:var(--slide-muted)]"}`}>{node.value}</p>
            </div>
            {!isLast && (
              <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-[color:var(--slide-accent)]">
                <path fill="currentColor" d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
              </svg>
            )}
          </div>
        )
      })}
    </div>
  )
}

function ProofTable({ rows }: { rows: ProofDatum[] }) {
  return (
    <div className="overflow-hidden rounded-md border border-black/10 bg-white/75">
      {rows.slice(0, 5).map((row) => (
        <div key={`${row.label}-${row.value}`} className="grid grid-cols-[0.8fr_1.2fr] border-b border-black/10 last:border-b-0">
          <p className="px-3 py-2 text-[0.68rem] font-bold text-[color:var(--slide-fg)]">{row.label}</p>
          <p className="px-3 py-2 text-[0.68rem] leading-snug text-[color:var(--slide-muted)]">{row.value}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Proof type badge labels ──────────────────────────────────────────────────

const PROOF_BADGE: Record<string, string> = {
  source_backed_visual: "EVIDENCE",
  chart: "DATA",
  comparison: "COMPARISON",
  timeline: "TIMELINE",
  diagram: "FLOW",
  table: "TABLE",
  image: "VISUAL",
}

// ─── ProofRows dispatcher ─────────────────────────────────────────────────────

function ProofRows({ slide }: { slide: SlidesStructuredSlide }) {
  const rows: ProofDatum[] = slide.proof.data.length
    ? slide.proof.data.slice(0, 8)
    : slide.body.slice(0, 3).map((item, i) => ({ label: `Signal ${i + 1}`, value: item }))

  if (slide.proof.type === "chart") {
    const chartType = inferSlidesChartType(slide.proof)
    switch (chartType) {
      case "bar_vertical": return <ChartBarVertical data={rows} />
      case "line": return <ChartLine data={rows} />
      case "area": return <ChartLine data={rows} filled />
      case "donut": return <ChartDonut data={rows} />
      case "progress": return <ChartProgress data={rows} />
      case "funnel": return <ChartFunnel data={rows} />
      case "scatter": return <ChartScatter data={rows} />
      default: return <ChartBarHorizontal data={rows} />
    }
  }

  if (slide.proof.type === "comparison") return <ProofComparison rows={rows} />
  if (slide.proof.type === "timeline") return <ProofTimeline rows={rows} />
  if (slide.proof.type === "diagram") return <ProofDiagram rows={rows} />
  if (slide.proof.type === "table") return <ProofTable rows={rows} />

  return (
    <div className="space-y-2">
      {rows.slice(0, 4).map((row) => (
        <div key={`${row.label}-${row.value}`} className="border-t border-black/10 pt-2">
          <p className="text-[0.7rem] font-bold text-[color:var(--slide-fg)]">{row.label}</p>
          <p className="mt-1 text-[0.68rem] leading-snug text-[color:var(--slide-muted)]">{row.value}</p>
        </div>
      ))}
    </div>
  )
}

// ─── M3.3 — Product screenshot device frame ───────────────────────────────────

function DeviceFrame({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg shadow-2xl">
      {/* Browser chrome bar */}
      <div className="flex items-center gap-1.5 bg-[#1a1a1a] px-3 py-2">
        <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <div className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <div className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <div className="mx-3 flex-1 rounded bg-white/10 px-2 py-0.5">
          <div className="h-1.5 w-16 rounded-full bg-white/20" />
        </div>
      </div>
      <div className="relative min-h-0 flex-1 bg-white">
        <Image src={src} alt={alt} fill sizes="45vw" className="object-cover object-top" unoptimized />
      </div>
    </div>
  )
}

// ─── Visual panel (M3.3 device frame + M3.4 image overlay) ───────────────────

function VisualPanel({
  slide,
  sources,
  overlay = false,
}: {
  slide: SlidesStructuredSlide
  sources: SlidesSource[]
  overlay?: boolean
}) {
  const image = visualUrl(slide, sources)

  // Detect product screenshot to apply device frame (M3.3)
  const sourceId = slide.visualAsset.sourceId
  const sourceRecord = sourceId ? sources.find((s) => s.id === sourceId) : undefined
  const isProductScreenshot = sourceRecord?.role === "product_screenshot"

  if (image) {
    if (isProductScreenshot) {
      return (
        <figure className="flex h-full min-h-0 flex-col overflow-hidden">
          <div className="relative min-h-0 flex-1">
            <DeviceFrame src={image} alt={slide.visualAsset.alt || slide.proof.title} />
          </div>
          {slide.visualAsset.rationale && (
            <figcaption className="mt-2 text-[0.65rem] leading-snug text-[color:var(--slide-muted)]">
              {slide.visualAsset.rationale}
            </figcaption>
          )}
        </figure>
      )
    }

    // Standard image with optional overlay (M3.4) — used for background-style images
    const needsOverlay = overlay && (slide.visualAsset.kind === "source_image" || slide.visualAsset.kind === "web_image")
    return (
      <figure className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-black/10 bg-white/80">
        <div className="relative min-h-0 flex-1">
          <Image src={image} alt={slide.visualAsset.alt || slide.proof.title} fill sizes="45vw" className="object-cover" unoptimized />
          {needsOverlay && <div className="absolute inset-0 bg-black/50" />}
        </div>
        <figcaption className="border-t border-black/10 px-3 py-2 text-[0.65rem] leading-snug text-[color:var(--slide-muted)]">
          {slide.visualAsset.rationale || slide.proof.description}
        </figcaption>
      </figure>
    )
  }

  return (
    <div className="h-full min-h-0 rounded-lg border border-black/10 bg-white/70 p-4">
      <p className="text-[0.72rem] font-bold uppercase text-[color:var(--slide-accent)]">
        {PROOF_BADGE[slide.proof.type] ?? slide.proof.type.replace(/_/g, " ")}
      </p>
      <h4 className="mt-2 text-[clamp(0.95rem,1.4vw,1.45rem)] font-bold leading-tight text-[color:var(--slide-fg)]">{slide.proof.title}</h4>
      {slide.proof.description && slide.proof.description.length >= 20 && (
        <p className="mt-2 text-[clamp(0.7rem,0.9vw,0.95rem)] leading-snug text-[color:var(--slide-muted)]">{slide.proof.description}</p>
      )}
      <div className="mt-4">
        <ProofRows slide={slide} />
      </div>
    </div>
  )
}

// ─── M3.2 — Logo badge (cover + closing only) ────────────────────────────────

function LogoBadge({ sources, size }: { sources: SlidesSource[]; size: "cover" | "closing" }) {
  const logo = sources.find((s) => s.role === "brand_asset" && (s.dataUrl || s.url))
  if (!logo) return null
  const src = logo.dataUrl || logo.url
  if (!src) return null
  const h = size === "cover" ? 48 : 32
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={logo.name}
      style={{ height: h, width: "auto", maxWidth: 160, objectFit: "contain", objectPosition: "left" }}
    />
  )
}

// ─── Standard content column (left side of claim_visual layout) ───────────────

function ContentColumn({ slide }: { slide: SlidesStructuredSlide }) {
  return (
    <section className="flex min-w-0 flex-col">
      <p className="text-[clamp(0.55rem,0.72vw,0.78rem)] font-bold uppercase text-[color:var(--slide-accent)]">Slide {slide.slideNumber}</p>
      <h3 className="mt-4 text-[clamp(1.45rem,3.2vw,4.25rem)] font-black leading-[0.98] text-[color:var(--slide-fg)]">{slide.title}</h3>
      <p className="mt-4 text-[clamp(1.05rem,1.6vw,1.8rem)] leading-snug text-[color:var(--slide-muted)]">{slide.claim}</p>
      <div className="mt-auto space-y-2 pt-4">
        {slide.body.slice(0, 3).map((item) => (
          <p key={item} className="border-l-2 border-[color:var(--slide-accent)] pl-3 text-[clamp(0.85rem,1vw,1.1rem)] leading-snug text-[color:var(--slide-fg)]/85">{item}</p>
        ))}
      </div>
    </section>
  )
}

// ─── M2 — New layout components ───────────────────────────────────────────────

function BigNumberLayout({ slide, sources }: { slide: SlidesStructuredSlide; sources: SlidesSource[] }) {
  const primary = slide.proof.data[0]
  const supporting = slide.proof.data.slice(1, 3)
  const image = visualUrl(slide, sources)

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
      <p className="text-[clamp(0.55rem,0.72vw,0.78rem)] font-bold uppercase tracking-widest text-[color:var(--slide-accent)]">
        {slide.proof.title || "Key Metric"}
      </p>
      {primary ? (
        <div>
          <p className="text-[clamp(4rem,12vw,11rem)] font-black leading-none text-[color:var(--slide-accent)]">
            {primary.value}
          </p>
          <p className="mt-2 text-[clamp(1rem,2vw,2rem)] font-semibold text-[color:var(--slide-fg)]">
            {primary.label}
          </p>
        </div>
      ) : (
        <p className="text-[clamp(4rem,12vw,11rem)] font-black leading-none text-[color:var(--slide-accent)]">
          {slide.title}
        </p>
      )}
      <p className="max-w-xl text-[clamp(1rem,1.5vw,1.6rem)] leading-snug text-[color:var(--slide-muted)]">{slide.claim}</p>
      {supporting.length > 0 && (
        <div className="flex gap-8">
          {supporting.map((item, i) => (
            <div key={i} className="text-center">
              <p className="text-[clamp(1.5rem,3vw,3rem)] font-black text-[color:var(--slide-fg)]">{item.value}</p>
              <p className="text-[0.78rem] text-[color:var(--slide-muted)]">{item.label}</p>
            </div>
          ))}
        </div>
      )}
      {image && (
        <div className="absolute inset-0 -z-10 opacity-5">
          <Image src={image} alt="" fill className="object-cover" unoptimized />
        </div>
      )}
    </div>
  )
}

function SideBySideLayout({ slide }: { slide: SlidesStructuredSlide }) {
  const rows = slide.proof.data.slice(0, 8)
  const groups = [...new Set(rows.map((r) => r.group).filter(Boolean))]
  let leftItems: ProofDatum[]
  let rightItems: ProofDatum[]

  if (groups.length >= 2) {
    leftItems = rows.filter((r) => r.group === groups[0])
    rightItems = rows.filter((r) => r.group === groups[1])
  } else {
    const mid = Math.ceil(rows.length / 2)
    leftItems = rows.slice(0, mid)
    rightItems = rows.slice(mid)
  }

  // Fallback to body bullets split into 2 columns
  const leftBullets: ProofDatum[] = leftItems.length ? leftItems : slide.body.slice(0, 2).map((b) => ({ label: b, value: "" }))
  const rightBullets: ProofDatum[] = rightItems.length ? rightItems : slide.body.slice(2).map((b) => ({ label: b, value: "" }))
  const leftTitle = leftBullets[0]?.group ? String(leftBullets[0].group) : (leftBullets[0]?.label ?? "Option A")
  const rightTitle = rightBullets[0]?.group ? String(rightBullets[0].group) : (rightBullets[0]?.label ?? "Option B")

  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <p className="text-[clamp(0.55rem,0.72vw,0.78rem)] font-bold uppercase text-[color:var(--slide-accent)]">Slide {slide.slideNumber}</p>
        <h3 className="mt-2 text-[clamp(1.2rem,2.5vw,3rem)] font-black leading-tight text-[color:var(--slide-fg)]">{slide.title}</h3>
      </div>
      <div className="grid flex-1 grid-cols-2 gap-6">
        {/* Left column */}
        <div className="rounded-xl border border-black/10 bg-white/60 p-5">
          <p className="mb-4 text-[0.85rem] font-bold uppercase tracking-wide text-[color:var(--slide-muted)]">{leftTitle}</p>
          <div className="space-y-3">
            {leftBullets.slice(1, 4).map((item, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="mt-1 h-5 w-5 shrink-0 rounded-full border-2 border-[color:var(--slide-muted)]/30 bg-[color:var(--slide-muted)]/10 text-center text-[0.6rem] font-bold leading-4 text-[color:var(--slide-muted)]">
                  {i + 1}
                </div>
                <p className="text-[0.78rem] leading-snug text-[color:var(--slide-fg)]">
                  {item.label}{item.value ? `: ${item.value}` : ""}
                </p>
              </div>
            ))}
          </div>
        </div>
        {/* Right column */}
        <div className="rounded-xl border border-[color:var(--slide-accent)]/30 bg-[color:var(--slide-accent)]/5 p-5">
          <p className="mb-4 text-[0.85rem] font-bold uppercase tracking-wide text-[color:var(--slide-accent)]">{rightTitle}</p>
          <div className="space-y-3">
            {rightBullets.slice(1, 4).map((item, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="mt-1 h-5 w-5 shrink-0 rounded-full border-2 border-[color:var(--slide-accent)]/40 bg-[color:var(--slide-accent)]/15 text-center text-[0.6rem] font-bold leading-4 text-[color:var(--slide-accent)]">
                  {i + 1}
                </div>
                <p className="text-[0.78rem] font-medium leading-snug text-[color:var(--slide-fg)]">
                  {item.label}{item.value ? `: ${item.value}` : ""}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function QuoteHighlightLayout({ slide }: { slide: SlidesStructuredSlide }) {
  const quoteText = slide.proof.title || slide.claim
  const attribution = slide.proof.data[0]
  const context = slide.proof.description || slide.body[0]

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 px-6 text-center">
      <svg viewBox="0 0 40 32" className="h-8 w-10 text-[color:var(--slide-accent)] opacity-40" fill="currentColor">
        <path d="M0 32V20C0 8.333 5.333 2 16 0l2.667 4C13.111 5.556 10.222 8.778 10 14H18V32H0ZM22 32V20C22 8.333 27.333 2 38 0l2.667 4C35.111 5.556 32.222 8.778 32 14H40V32H22Z" />
      </svg>

      <blockquote className="max-w-3xl text-[clamp(1.4rem,3.5vw,4rem)] font-black leading-[1.1] text-[color:var(--slide-fg)]">
        &ldquo;{quoteText}&rdquo;
      </blockquote>

      {attribution && (
        <div className="flex flex-col items-center gap-1">
          <div className="h-px w-12 bg-[color:var(--slide-accent)]/40" />
          <p className="text-[0.85rem] font-bold text-[color:var(--slide-fg)]">{attribution.label}</p>
          {attribution.value && (
            <p className="text-[0.78rem] text-[color:var(--slide-muted)]">{attribution.value}</p>
          )}
        </div>
      )}

      {context && (
        <p className="max-w-2xl text-[clamp(0.85rem,1.2vw,1.2rem)] leading-relaxed text-[color:var(--slide-muted)]">
          {context}
        </p>
      )}
    </div>
  )
}

function TimelineVerticalLayout({ slide }: { slide: SlidesStructuredSlide }) {
  const steps = slide.proof.data.slice(0, 7)

  return (
    <div className="flex h-full gap-8">
      <div className="flex flex-col justify-center">
        <p className="text-[clamp(0.55rem,0.72vw,0.78rem)] font-bold uppercase text-[color:var(--slide-accent)]">Slide {slide.slideNumber}</p>
        <h3 className="mt-2 text-[clamp(1.2rem,2.4vw,3.2rem)] font-black leading-tight text-[color:var(--slide-fg)]">{slide.title}</h3>
        <p className="mt-3 text-[clamp(0.85rem,1.2vw,1.4rem)] leading-snug text-[color:var(--slide-muted)]">{slide.claim}</p>
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0">
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1
          return (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                    isLast ? "bg-[color:var(--slide-accent)]" : "bg-[color:var(--slide-accent)]/60"
                  }`}
                >
                  {i + 1}
                </div>
                {!isLast && <div className="my-0.5 w-px flex-1 bg-[color:var(--slide-accent)]/20" style={{ minHeight: "1.5rem" }} />}
              </div>
              <div className="pb-3 pt-0.5">
                <p className={`text-[0.8rem] font-bold ${isLast ? "text-[color:var(--slide-accent)]" : "text-[color:var(--slide-fg)]"}`}>
                  {step.label}
                </p>
                {step.value && (
                  <p className="mt-0.5 text-[0.7rem] leading-snug text-[color:var(--slide-muted)]">{step.value}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ImageLeftLayout({ slide, sources }: { slide: SlidesStructuredSlide; sources: SlidesSource[] }) {
  const image = visualUrl(slide, sources)
  const sourceId = slide.visualAsset.sourceId
  const sourceRecord = sourceId ? sources.find((s) => s.id === sourceId) : undefined
  const isProductScreenshot = sourceRecord?.role === "product_screenshot"

  return (
    <div className="grid h-full grid-cols-2 gap-0 overflow-hidden">
      {/* Left — full-bleed image */}
      <div className="relative overflow-hidden">
        {image ? (
          <>
            <Image src={image} alt={slide.visualAsset.alt || slide.title} fill sizes="50vw" className="object-cover" unoptimized />
            {isProductScreenshot && (
              <div className="absolute inset-x-4 inset-y-4 overflow-hidden rounded-lg shadow-2xl">
                <div className="flex items-center gap-1.5 bg-[#1a1a1a] px-3 py-2">
                  <div className="h-2 w-2 rounded-full bg-[#ff5f57]" />
                  <div className="h-2 w-2 rounded-full bg-[#febc2e]" />
                  <div className="h-2 w-2 rounded-full bg-[#28c840]" />
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt="" className="block w-full object-cover object-top" />
              </div>
            )}
            {!isProductScreenshot && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[color:var(--slide-bg)]/20" />
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center bg-[color:var(--slide-accent)]/10">
            <div className="h-20 w-20 rounded-2xl bg-[color:var(--slide-accent)]/20" />
          </div>
        )}
      </div>

      {/* Right — content */}
      <div className="flex flex-col justify-center px-8 py-6">
        <p className="text-[clamp(0.55rem,0.72vw,0.78rem)] font-bold uppercase text-[color:var(--slide-accent)]">Slide {slide.slideNumber}</p>
        <h3 className="mt-3 text-[clamp(1.3rem,2.8vw,3.8rem)] font-black leading-[0.98] text-[color:var(--slide-fg)]">{slide.title}</h3>
        <p className="mt-4 text-[clamp(0.95rem,1.3vw,1.5rem)] leading-snug text-[color:var(--slide-muted)]">{slide.claim}</p>
        <div className="mt-6 space-y-2.5">
          {slide.body.slice(0, 3).map((item) => (
            <p key={item} className="border-l-2 border-[color:var(--slide-accent)] pl-3 text-[clamp(0.82rem,0.95vw,1.05rem)] leading-snug text-[color:var(--slide-fg)]/85">{item}</p>
          ))}
        </div>
      </div>
    </div>
  )
}

function ImageFullLayout({ slide, sources }: { slide: SlidesStructuredSlide; sources: SlidesSource[] }) {
  const image = visualUrl(slide, sources)

  return (
    <div className="relative flex h-full flex-col items-center justify-center text-center">
      {/* Full-bleed background */}
      {image && (
        <>
          <Image src={image} alt={slide.visualAsset.alt || slide.title} fill sizes="100vw" className="object-cover" unoptimized />
          <div className="absolute inset-0 bg-black/55" />
        </>
      )}
      {!image && (
        <div className="absolute inset-0 bg-[color:var(--slide-accent)]" style={{ opacity: 0.12 }} />
      )}

      {/* Centered overlay content */}
      <div className="relative z-10 max-w-3xl px-8">
        <p className={`text-[clamp(0.55rem,0.72vw,0.78rem)] font-bold uppercase tracking-widest ${image ? "text-white/70" : "text-[color:var(--slide-accent)]"}`}>
          Slide {slide.slideNumber}
        </p>
        <h3 className={`mt-4 text-[clamp(2rem,5vw,6rem)] font-black leading-[0.95] ${image ? "text-white" : "text-[color:var(--slide-fg)]"}`}>
          {slide.title}
        </h3>
        <p className={`mt-6 text-[clamp(1rem,1.8vw,2rem)] leading-snug ${image ? "text-white/80" : "text-[color:var(--slide-muted)]"}`}>
          {slide.claim}
        </p>
        {slide.body[0] && (
          <p className={`mt-4 text-[clamp(0.85rem,1.1vw,1.2rem)] ${image ? "text-white/60" : "text-[color:var(--slide-muted)]"}`}>
            {slide.body[0]}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Cover / Closing accent stripe ────────────────────────────────────────────

function AccentStripe() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute right-0 top-0 h-full w-2/5"
        style={{
          background: "var(--slide-accent)",
          clipPath: "polygon(18% 0%, 100% 0%, 100% 100%, 0% 100%)",
          opacity: 0.07,
        }}
      />
      <div
        className="absolute right-0 top-0 h-full w-1/5"
        style={{
          background: "var(--slide-accent)",
          clipPath: "polygon(30% 0%, 100% 0%, 100% 100%, 0% 100%)",
          opacity: 0.12,
        }}
      />
    </div>
  )
}

// ─── Main renderer ────────────────────────────────────────────────────────────

export default function SlideRenderer({ deck, slide, sources = [], variant = "panel" }: SlideRendererProps) {
  const isFull = variant === "full"
  const isThumb = variant === "thumbnail"
  const isCover = slide.layout === "cover" || slide.slideNumber === 1
  const isClosing = slide.layout === "closing"

  if (isThumb) {
    return (
      <div className="h-full w-full overflow-hidden rounded-[0.4rem] bg-[color:var(--slide-bg)] px-2 py-1.5 text-[color:var(--slide-fg)]" style={themeVars(deck)}>
        <p className="truncate text-[8px] font-bold">{slide.slideNumber}. {slide.title}</p>
        <p className="mt-1 line-clamp-2 text-[7px] leading-3 text-[color:var(--slide-muted)]">{slide.claim}</p>
        <div className="mt-1 h-1 w-8 rounded-full bg-[color:var(--slide-accent)]" />
      </div>
    )
  }

  const padding = isFull ? "p-[clamp(1.35rem,3vw,4rem)] pb-[clamp(5.5rem,8vw,7rem)]" : "p-6"

  // ── Cover & Closing ──────────────────────────────────────────────────────────
  if (isCover || isClosing) {
    return (
      <article
        className={`relative h-full w-full overflow-hidden bg-[color:var(--slide-bg)] text-[color:var(--slide-fg)] ${padding}`}
        style={themeVars(deck)}
        data-provider={deck.provider}
        data-layout={slide.layout}
      >
        <AccentStripe />
        <div className="relative grid h-full grid-cols-[minmax(0,1fr)_minmax(10rem,0.42fr)] gap-6">
          <div className="flex min-w-0 flex-col justify-between">
            <div>
              <p className="text-[clamp(0.55rem,0.75vw,0.78rem)] font-bold uppercase text-[color:var(--slide-accent)]">
                {isClosing ? "Recommendation" : deck.title}
              </p>
              <h3 className="mt-5 text-[clamp(2.5rem,6vw,7rem)] font-black leading-[0.9] text-[color:var(--slide-fg)]">{slide.title}</h3>
            </div>
            <div className="flex flex-col gap-4">
              <p className="text-[clamp(1rem,1.4vw,1.4rem)] font-light leading-snug text-[color:var(--slide-muted)]">{slide.claim}</p>
              {/* M3.2 — Logo on cover/closing only */}
              <LogoBadge sources={sources} size={isCover ? "cover" : "closing"} />
            </div>
          </div>
          <VisualPanel slide={slide} sources={sources} overlay />
        </div>
      </article>
    )
  }

  // ── New layouts (M2) ─────────────────────────────────────────────────────────
  if (slide.layout === "image_full") {
    return (
      <article
        className={`relative h-full w-full overflow-hidden bg-[color:var(--slide-bg)] text-[color:var(--slide-fg)]`}
        style={themeVars(deck)}
        data-provider={deck.provider}
        data-layout={slide.layout}
      >
        <ImageFullLayout slide={slide} sources={sources} />
      </article>
    )
  }

  if (slide.layout === "image_left") {
    return (
      <article
        className={`relative h-full w-full overflow-hidden bg-[color:var(--slide-bg)] text-[color:var(--slide-fg)]`}
        style={themeVars(deck)}
        data-provider={deck.provider}
        data-layout={slide.layout}
      >
        <ImageLeftLayout slide={slide} sources={sources} />
      </article>
    )
  }

  if (slide.layout === "big_number") {
    return (
      <article
        className={`relative h-full w-full overflow-hidden bg-[color:var(--slide-bg)] text-[color:var(--slide-fg)] ${padding}`}
        style={themeVars(deck)}
        data-provider={deck.provider}
        data-layout={slide.layout}
      >
        <BigNumberLayout slide={slide} sources={sources} />
      </article>
    )
  }

  if (slide.layout === "side_by_side") {
    return (
      <article
        className={`relative h-full w-full overflow-hidden bg-[color:var(--slide-bg)] text-[color:var(--slide-fg)] ${padding}`}
        style={themeVars(deck)}
        data-provider={deck.provider}
        data-layout={slide.layout}
      >
        <SideBySideLayout slide={slide} />
      </article>
    )
  }

  if (slide.layout === "quote_highlight") {
    return (
      <article
        className={`relative h-full w-full overflow-hidden bg-[color:var(--slide-bg)] text-[color:var(--slide-fg)] ${padding}`}
        style={themeVars(deck)}
        data-provider={deck.provider}
        data-layout={slide.layout}
      >
        <QuoteHighlightLayout slide={slide} />
      </article>
    )
  }

  if (slide.layout === "timeline_vertical") {
    return (
      <article
        className={`relative h-full w-full overflow-hidden bg-[color:var(--slide-bg)] text-[color:var(--slide-fg)] ${padding}`}
        style={themeVars(deck)}
        data-provider={deck.provider}
        data-layout={slide.layout}
      >
        <TimelineVerticalLayout slide={slide} />
      </article>
    )
  }

  // ── Standard layouts (claim_visual, comparison, timeline, data_table) ────────
  return (
    <article
      className={`h-full w-full overflow-hidden bg-[color:var(--slide-bg)] text-[color:var(--slide-fg)] ${padding}`}
      style={themeVars(deck)}
      data-provider={deck.provider}
      data-layout={slide.layout}
    >
      <div className={`grid h-full gap-6 ${
        slide.layout === "timeline" || slide.layout === "data_table"
          ? "grid-rows-[auto_minmax(0,1fr)]"
          : "grid-cols-[minmax(0,0.92fr)_minmax(14rem,1.08fr)]"
      }`}>
        <ContentColumn slide={slide} />
        <VisualPanel slide={slide} sources={sources} />
      </div>
    </article>
  )
}
