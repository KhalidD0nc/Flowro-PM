"use client"

import type { CSSProperties } from "react"
import Image from "next/image"
import type { SlidesDeck, SlidesSource, SlidesStructuredSlide } from "@/lib/slides/schema"

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

function ProofRows({ slide }: { slide: SlidesStructuredSlide }) {
  const rows: ProofDatum[] = slide.proof.data.length
    ? slide.proof.data.slice(0, 5)
    : slide.body.slice(0, 3).map((item, index) => ({ label: `Signal ${index + 1}`, value: item }))

  if (slide.proof.type === "chart") {
    const values = rows.map((row) => row.numericValue ?? Number(String(row.value).replace(/[^\d.-]/g, ""))).filter(Number.isFinite)
    const max = Math.max(1, ...values)
    return (
      <div className="space-y-3">
        {rows.map((row, index) => {
          const numeric = row.numericValue ?? Number(String(row.value).replace(/[^\d.-]/g, ""))
          const width = Number.isFinite(numeric) ? Math.max(16, Math.min(100, (numeric / max) * 100)) : 72 - index * 9
          return (
            <div key={`${row.label}-${row.value}`} className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] items-center gap-3">
              <span className="truncate text-[0.7rem] font-semibold text-[color:var(--slide-fg)]">{row.label}</span>
              <div className="flex items-center gap-2">
                <span className="h-2 rounded-full bg-[color:var(--slide-accent)]" style={{ width: `${width}%` }} />
                <span className="min-w-10 text-right text-[0.65rem] font-semibold text-[color:var(--slide-muted)]">{row.value}</span>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (slide.proof.type === "timeline") {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {rows.slice(0, 4).map((row, index) => (
          <div key={`${row.label}-${row.value}`} className="relative rounded-md border border-black/10 bg-white/70 p-3">
            <div className="mb-3 flex size-7 items-center justify-center rounded-full bg-[color:var(--slide-accent)] text-xs font-bold text-white">{index + 1}</div>
            <p className="text-[0.75rem] font-bold text-[color:var(--slide-fg)]">{row.label}</p>
            <p className="mt-1 text-[0.68rem] leading-snug text-[color:var(--slide-muted)]">{row.value}</p>
          </div>
        ))}
      </div>
    )
  }

  if (slide.proof.type === "comparison") {
    return (
      <div className="grid grid-cols-2 gap-3">
        {rows.slice(0, 4).map((row, index) => (
          <div key={`${row.label}-${row.value}`} className={`rounded-md border p-3 ${index === rows.length - 1 || row.tone === "positive" ? "border-[color:var(--slide-accent)] bg-[color:var(--slide-accent)] text-white" : "border-black/10 bg-white/70 text-[color:var(--slide-fg)]"}`}>
            <p className="text-[0.7rem] font-bold">{row.label}</p>
            <p className={`mt-2 text-[0.68rem] leading-snug ${index === rows.length - 1 || row.tone === "positive" ? "text-white/85" : "text-[color:var(--slide-muted)]"}`}>{row.value}</p>
          </div>
        ))}
      </div>
    )
  }

  if (slide.proof.type === "table") {
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

  if (slide.proof.type === "diagram" || slide.visualAsset.kind === "generated_visual") {
    return (
      <div className="grid grid-cols-3 items-center gap-2">
        {rows.slice(0, 5).map((row, index) => (
          <div key={`${row.label}-${row.value}`} className="relative">
            <div className="rounded-md border border-black/10 bg-white/75 p-3">
              <p className="text-[0.68rem] font-bold text-[color:var(--slide-fg)]">{row.label}</p>
              <p className="mt-1 text-[0.62rem] leading-snug text-[color:var(--slide-muted)]">{row.value}</p>
            </div>
            {index < Math.min(rows.length, 5) - 1 ? <div className="absolute left-full top-1/2 hidden h-px w-2 bg-[color:var(--slide-accent)] sm:block" /> : null}
          </div>
        ))}
      </div>
    )
  }

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

function VisualPanel({ slide, sources }: { slide: SlidesStructuredSlide; sources: SlidesSource[] }) {
  const image = visualUrl(slide, sources)
  if (image) {
    return (
      <figure className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-black/10 bg-white/80">
        <div className="relative min-h-0 flex-1">
          <Image src={image} alt={slide.visualAsset.alt || slide.proof.title} fill sizes="45vw" className="object-cover" unoptimized />
        </div>
        <figcaption className="border-t border-black/10 px-3 py-2 text-[0.65rem] leading-snug text-[color:var(--slide-muted)]">
          {slide.visualAsset.rationale || slide.proof.description}
        </figcaption>
      </figure>
    )
  }

  return (
    <div className="h-full min-h-0 rounded-lg border border-black/10 bg-white/70 p-4">
      <p className="text-[0.62rem] font-bold uppercase text-[color:var(--slide-accent)]">{slide.proof.type.replace(/_/g, " ")}</p>
      <h4 className="mt-2 text-[clamp(0.95rem,1.4vw,1.45rem)] font-bold leading-tight text-[color:var(--slide-fg)]">{slide.proof.title}</h4>
      <p className="mt-2 text-[clamp(0.7rem,0.9vw,0.95rem)] leading-snug text-[color:var(--slide-muted)]">{slide.proof.description}</p>
      <div className="mt-4">
        <ProofRows slide={slide} />
      </div>
    </div>
  )
}

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

  return (
    <article
      className={`h-full w-full overflow-hidden bg-[color:var(--slide-bg)] text-[color:var(--slide-fg)] ${isFull ? "p-[clamp(1.35rem,3vw,4rem)] pb-[clamp(5.5rem,8vw,7rem)]" : "p-6"}`}
      style={themeVars(deck)}
      data-provider={deck.provider}
      data-visual-kind={slide.visualAsset.kind}
    >
      {isCover || isClosing ? (
        <div className="grid h-full grid-cols-[minmax(0,1fr)_minmax(10rem,0.42fr)] gap-6">
          <div className="flex min-w-0 flex-col justify-between">
            <div>
              <p className="text-[clamp(0.55rem,0.75vw,0.78rem)] font-bold uppercase text-[color:var(--slide-accent)]">{isClosing ? "Recommendation" : `Slide ${slide.slideNumber}`}</p>
              <h3 className="mt-5 max-w-[10ch] text-[clamp(2rem,5vw,5.9rem)] font-black leading-[0.95] text-[color:var(--slide-fg)]">{slide.title}</h3>
            </div>
            <p className="max-w-2xl text-[clamp(0.95rem,1.5vw,1.7rem)] leading-snug text-[color:var(--slide-muted)]">{slide.claim}</p>
          </div>
          <VisualPanel slide={slide} sources={sources} />
        </div>
      ) : (
        <div className={`grid h-full gap-6 ${slide.layout === "timeline" || slide.layout === "data_table" ? "grid-rows-[auto_minmax(0,1fr)]" : "grid-cols-[minmax(0,0.92fr)_minmax(14rem,1.08fr)]"}`}>
          <section className="flex min-w-0 flex-col">
            <p className="text-[clamp(0.55rem,0.72vw,0.78rem)] font-bold uppercase text-[color:var(--slide-accent)]">Slide {slide.slideNumber}</p>
            <h3 className="mt-4 text-[clamp(1.45rem,3.2vw,4.25rem)] font-black leading-[0.98] text-[color:var(--slide-fg)]">{slide.title}</h3>
            <p className="mt-4 text-[clamp(0.95rem,1.45vw,1.65rem)] leading-snug text-[color:var(--slide-muted)]">{slide.claim}</p>
            <div className="mt-auto space-y-2 pt-4">
              {slide.body.slice(0, 3).map((item) => (
                <p key={item} className="border-l-2 border-[color:var(--slide-accent)] pl-3 text-[clamp(0.7rem,0.92vw,1.05rem)] leading-snug text-[color:var(--slide-fg)]/85">{item}</p>
              ))}
            </div>
          </section>
          <VisualPanel slide={slide} sources={sources} />
        </div>
      )}
    </article>
  )
}
