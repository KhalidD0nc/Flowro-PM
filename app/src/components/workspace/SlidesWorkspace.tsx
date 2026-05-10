"use client"

import { useEffect, useState } from "react"
import type { User } from "firebase/auth"
import type { ProjectView } from "@/lib/types/views"
import type { SlidesDeck, SlidesStructuredSlide } from "@/lib/slides/schema"
import { authFetch, authPost } from "@/lib/authFetch"
import SlideCanvas from "@/components/workspace/SlideCanvas"
import SlideRenderer from "@/components/workspace/SlideRenderer"

const BASE_STEPS = [
  { key: "reading", label: "Reading sources", icon: "folder_open" },
  { key: "story", label: "Building story", icon: "schema" },
  { key: "design", label: "Designing slides", icon: "dashboard_customize" },
  { key: "drafting", label: "Drafting slides", icon: "stylus_note" },
  { key: "preview", label: "Rendering preview", icon: "present_to_all" },
  { key: "ready", label: "Ready", icon: "task_alt" },
]

function formatFileSize(size?: number) {
  if (!size) return null
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function DeckSlidePreview({
  deck,
  slide,
  slideIndex,
  sources,
  variant,
}: {
  deck: SlidesDeck
  slide: SlidesStructuredSlide
  slideIndex: number
  sources: ProjectView["slidesSources"]
  variant: "full" | "panel" | "thumbnail"
}) {
  const fallback = <SlideRenderer deck={deck} slide={slide} sources={sources ?? []} variant={variant} />
  const slideCode = deck.diagnostics?.slideCodeProvider !== "deterministic" ? deck.slideCode : undefined
  if (!slideCode) return fallback
  return (
    <SlideCanvas
      slideCode={slideCode}
      assets={deck.assets}
      slideIndex={slideIndex}
      variant={variant}
      fallback={fallback}
    />
  )
}

export default function SlidesWorkspace({
  project,
  user,
  isWorking,
  onProjectChange,
  previewOnly = false,
}: {
  project: ProjectView
  user: User
  isWorking: boolean
  onProjectChange?: (updates: Partial<ProjectView>) => void
  previewOnly?: boolean
}) {
  const [workingStep, setWorkingStep] = useState(0)
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null)
  const [editInstruction, setEditInstruction] = useState("")
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const sources = project.slidesSources ?? []
  const story = project.slidesDeckStory
  const deck = project.slidesDeck
  const selectedSlide = deck?.slides.find((slide) => slide.id === selectedSlideId) ?? deck?.slides[0] ?? null
  const steps = project.slidesWebSearchEnabled
    ? [BASE_STEPS[0], { key: "search", label: "Searching web", icon: "travel_explore" }, ...BASE_STEPS.slice(1)]
    : BASE_STEPS
  const statusKey = project.slidesStatus
  const statusStepKey = statusKey === "searching_web"
    ? "search"
    : statusKey === "building_story" || statusKey === "needs_attention" || statusKey === "failed"
      ? "story"
      : statusKey === "designing_slides"
        ? "design"
        : statusKey === "drafting"
          ? "drafting"
          : statusKey === "rendering"
            ? "preview"
        : statusKey === "ready"
          ? "ready"
          : "reading"
  const statusIndex = Math.max(0, steps.findIndex((step) => step.key === statusStepKey))
  const workingIndexes = steps
    .map((step, index) => ({ step, index }))
    .filter(({ step }) => step.key === "search" || step.key === "story" || step.key === "design" || step.key === "drafting" || step.key === "preview")
    .map(({ index }) => index)
  const activeIndex = isWorking && workingIndexes.length
    ? workingIndexes[workingStep % workingIndexes.length]
    : statusIndex

  useEffect(() => {
    if (!isWorking || workingIndexes.length <= 1) return
    const interval = window.setInterval(() => {
      setWorkingStep((current) => current + 1)
    }, 1400)
    return () => window.clearInterval(interval)
  }, [isWorking, workingIndexes.length])

  useEffect(() => {
    if (!deck?.slides.length) {
      setSelectedSlideId(null)
      return
    }
    if (!selectedSlideId || !deck.slides.some((slide) => slide.id === selectedSlideId)) {
      setSelectedSlideId(deck.slides[0].id)
    }
  }, [deck, selectedSlideId])

  async function applyEdit(target: "slide" | "deck") {
    if (!editInstruction.trim() || !deck) return
    try {
      setBusyAction(`edit-${target}`)
      setLocalError(null)
      const response = await authPost(`/api/projects/${project.id}/slides/edit`, user, {
        instruction: editInstruction.trim(),
        slideId: target === "slide" ? selectedSlide?.id : undefined,
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to edit deck")
      onProjectChange?.({
        slidesDeck: data.slidesDeck as SlidesDeck,
        slidesStatus: data.slidesStatus,
        chatHistory: Array.isArray(data.messages)
          ? [...project.chatHistory, ...data.messages]
          : project.chatHistory,
      })
      setEditInstruction("")
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Failed to edit deck")
    } finally {
      setBusyAction(null)
    }
  }

  async function exportDeck(format: "pptx" | "pdf") {
    if (!deck) return
    try {
      setBusyAction(`export-${format}`)
      setLocalError(null)
      const response = await authFetch(`/api/projects/${project.id}/slides/export?format=${format}`, user)
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || `Failed to export ${format.toUpperCase()}`)
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${project.projectName.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "flowro-slides"}.${format}`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : `Failed to export ${format.toUpperCase()}`)
    } finally {
      setBusyAction(null)
    }
  }

  async function regenerateDesign() {
    if (!deck) return
    try {
      setBusyAction("regenerate-code")
      setLocalError(null)
      const response = await authPost(`/api/projects/${project.id}/slides/regenerate-code`, user, {})
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to regenerate slide design")
      onProjectChange?.({
        slidesDeck: data.slidesDeck as SlidesDeck,
        slidesStatus: data.slidesStatus,
      })
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Failed to regenerate slide design")
    } finally {
      setBusyAction(null)
    }
  }

  if (previewOnly && deck) {
    const selectedIndex = Math.max(0, deck.slides.findIndex((slide) => slide.id === selectedSlide?.id))
    const previousSlide = () => {
      const nextIndex = selectedIndex <= 0 ? deck.slides.length - 1 : selectedIndex - 1
      setSelectedSlideId(deck.slides[nextIndex]?.id ?? null)
    }
    const nextSlide = () => {
      const nextIndex = selectedIndex >= deck.slides.length - 1 ? 0 : selectedIndex + 1
      setSelectedSlideId(deck.slides[nextIndex]?.id ?? null)
    }

    return (
      <section className="relative flex h-full min-h-0 flex-1 overflow-hidden bg-[#080808] text-white">
        <div className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-full border border-white/[0.1] bg-black/55 px-3 py-2 text-xs font-semibold text-white/80 backdrop-blur-xl">
          <span>{selectedIndex + 1}</span>
          <span className="text-white/35">/</span>
          <span>{deck.slides.length}</span>
        </div>

        <div className="min-h-0 flex-1">
          {selectedSlide ? (
            <DeckSlidePreview deck={deck} slide={selectedSlide} slideIndex={selectedIndex} sources={sources} variant="full" />
          ) : null}
        </div>

        {deck.slides.length > 1 ? (
          <>
            <button
              type="button"
              onClick={previousSlide}
              aria-label="Previous slide"
              className="absolute left-4 top-1/2 z-20 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/[0.1] bg-black/55 text-white/85 backdrop-blur-xl transition hover:bg-black/75 hover:text-white sm:flex"
            >
              <span className="material-symbols-outlined text-[24px]">chevron_left</span>
            </button>
            <button
              type="button"
              onClick={nextSlide}
              aria-label="Next slide"
              className="absolute right-4 top-1/2 z-20 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/[0.1] bg-black/55 text-white/85 backdrop-blur-xl transition hover:bg-black/75 hover:text-white sm:flex"
            >
              <span className="material-symbols-outlined text-[24px]">chevron_right</span>
            </button>
          </>
        ) : null}

        <div className="absolute inset-x-0 bottom-0 z-20 flex justify-center border-t border-white/[0.07] bg-black/55 px-3 py-3 backdrop-blur-xl">
          <div className="flex max-w-full gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {deck.slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => setSelectedSlideId(slide.id)}
                aria-label={`Open slide ${slide.slideNumber}`}
                className={`h-12 w-[5.35rem] shrink-0 overflow-hidden rounded-[0.45rem] border text-left transition ${
                  selectedSlide?.id === slide.id ? "border-[#8fb4ff] opacity-100" : "border-white/[0.14] opacity-55 hover:opacity-85"
                }`}
              >
                <DeckSlidePreview deck={deck} slide={slide} slideIndex={index} sources={sources} variant="thumbnail" />
              </button>
            ))}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="flex h-full min-h-[calc(100vh-6rem)] flex-col overflow-hidden rounded-[1rem] border border-white/[0.08] bg-[#171717] shadow-[0_26px_70px_-52px_rgba(0,0,0,0.95)]">
      <div className="shrink-0 border-b border-white/[0.07] px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8f8f8b]">Slides workspace</p>
            <h2 className="mt-2 text-lg font-semibold text-[#f0f0ed]">{project.projectName}</h2>
          </div>
          <span className="rounded-full border border-[#8fb4ff]/25 bg-[#4169ff]/10 px-3 py-1.5 text-xs font-semibold text-[#b7c8ff]">
            {deck ? "Deck ready" : story ? "Story ready" : "Source intake"}
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
          <div className="rounded-[0.9rem] border border-white/[0.08] bg-[#1d1d1c] p-4">
            <div className="space-y-4">
              {steps.map((step, index) => {
                const isActive = index === activeIndex
                const isDone = !isWorking && (statusKey === "ready" ? index < steps.length - 1 : index < activeIndex)
                return (
                  <div
                    key={step.key}
                    className={`flex items-center gap-3 rounded-[0.75rem] border px-3 py-3 transition ${
                      isActive
                        ? "border-[#4169ff]/35 bg-[#4169ff]/12 text-[#dce6ff]"
                        : isDone
                          ? "border-emerald-400/18 bg-emerald-400/[0.06] text-emerald-200"
                          : "border-white/[0.06] bg-[#232322] text-[#9f9f9b]"
                    }`}
                  >
                    <span className={`material-symbols-outlined text-[19px] ${isActive && isWorking ? "animate-pulse" : ""}`}>
                      {isDone ? "check_circle" : step.icon}
                    </span>
                    <span className="text-sm font-semibold">{step.label}</span>
                  </div>
                )
              })}
            </div>

            <div className="mt-5 rounded-[0.85rem] border border-white/[0.07] bg-[#222221] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-[#f0f0ed]">Research mode</p>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                  project.slidesWebSearchEnabled ? "bg-[#4169ff]/14 text-[#afbdff]" : "bg-white/[0.06] text-[#8f8f8b]"
                }`}>
                  {project.slidesWebSearchEnabled ? "On" : "Off"}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-[#a8a8a5]">
                {project.slidesWebSearchEnabled
                  ? "Live research is marked separately from uploaded source context."
                  : "Deck generation will use the prompt and attached sources first."}
              </p>
            </div>
          </div>

          <div className="rounded-[0.9rem] border border-white/[0.08] bg-[#1d1d1c] p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-[#f0f0ed]">Source inventory</h3>
              <span className="text-xs font-medium text-[#8f8f8b]">{sources.length} attached</span>
            </div>

            {sources.length ? (
              <div className="mt-4 space-y-3">
                {sources.map((source) => (
                  <div key={source.id} className="rounded-[0.85rem] border border-white/[0.07] bg-[#232322] px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#f0f0ed]">{source.name}</p>
                        <p className="mt-1 text-xs text-[#8f8f8b]">
                          {[source.roleLabel, formatFileSize(source.size)].filter(Boolean).join(" / ")}
                        </p>
                      </div>
                      <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#b8b8b5]">
                        {source.status}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[#b8b8b5]">{source.summary}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 flex min-h-44 items-center justify-center rounded-[0.85rem] border border-dashed border-white/[0.1] bg-[#232322] px-5 text-center">
                <p className="max-w-xs text-sm leading-6 text-[#a8a8a5]">
                  No files or links were attached. Flowro will start from the prompt and ask only if the deck would be materially wrong without more context.
                </p>
              </div>
            )}
          </div>
        </div>

        {story ? (
          <div className="mt-4 grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
            <div className="rounded-[0.9rem] border border-white/[0.08] bg-[#1d1d1c] p-4">
              <p className="text-sm font-semibold text-[#f0f0ed]">Internal brief</p>
              <p className="mt-3 text-sm leading-6 text-[#b8b8b5]">{story.brief.objective}</p>
              <div className="mt-4 grid gap-3 text-sm text-[#a8a8a5] sm:grid-cols-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#777773]">Audience</p>
                  <p className="mt-1">{story.brief.audience}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#777773]">Tone</p>
                  <p className="mt-1">{story.brief.tone}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[0.9rem] border border-white/[0.08] bg-[#1d1d1c] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-[#f0f0ed]">Claim outline</p>
                <span className="text-xs font-medium text-[#8f8f8b]">{story.outline.length} slides</span>
              </div>
              <div className="mt-4 space-y-2">
                {story.outline.slice(0, 5).map((slide, index) => (
                  <div key={slide.id} className="rounded-[0.75rem] border border-white/[0.06] bg-[#232322] px-3 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8f8f8b]">Slide {index + 1}</p>
                    <p className="mt-1 text-sm font-semibold text-[#f0f0ed]">{slide.title}</p>
                    <p className="mt-1 text-sm leading-5 text-[#b8b8b5]">{slide.claim}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {story?.evidence.length ? (
          <div className="mt-4 rounded-[0.9rem] border border-white/[0.08] bg-[#1d1d1c] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[#f0f0ed]">Web evidence</p>
              <span className="text-xs font-medium text-[#8f8f8b]">{story.evidence.length} result</span>
            </div>
            <div className="mt-4 space-y-3">
              {story.evidence.map((item) => (
                <div key={item.id} className="rounded-[0.75rem] border border-white/[0.06] bg-[#232322] px-3 py-3">
                  <p className="text-sm leading-6 text-[#b8b8b5]">{item.summary}</p>
                  {item.citations.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.citations.slice(0, 4).map((citation) => (
                        <a
                          key={citation.url}
                          href={citation.url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-[#8fb4ff]/20 bg-[#4169ff]/10 px-2.5 py-1 text-xs font-medium text-[#b7c8ff] hover:bg-[#4169ff]/16"
                        >
                          {citation.title}
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-4 grid gap-4 xl:grid-cols-[12rem_1fr]">
          <div className="rounded-[0.9rem] border border-white/[0.08] bg-[#1d1d1c] p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[#f0f0ed]">Preview</p>
              <span className="text-xs text-[#8f8f8b]">{deck?.slides.length ?? 0} slides</span>
            </div>
            <div className="mt-3 space-y-2">
              {deck ? deck.slides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => setSelectedSlideId(slide.id)}
                  className={`w-full rounded-[0.7rem] border p-2 text-left transition ${
                    selectedSlide?.id === slide.id
                      ? "border-[#4169ff]/45 bg-[#4169ff]/14"
                      : "border-white/[0.07] bg-[#232322] hover:bg-[#292927]"
                  }`}
                >
                  <div className="aspect-video overflow-hidden rounded-[0.4rem]">
                    <DeckSlidePreview deck={deck} slide={slide} slideIndex={index} sources={sources} variant="thumbnail" />
                  </div>
                </button>
              )) : (
                <div className="rounded-[0.75rem] border border-dashed border-white/[0.1] bg-[#232322] p-4 text-sm leading-6 text-[#a8a8a5]">
                  Slide previews appear after generation.
                </div>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-[0.9rem] border border-white/[0.08] bg-[#eeeeea] p-4 text-[#111111]">
            {deck && selectedSlide ? (
              <div className="aspect-video overflow-hidden rounded-[0.7rem] border border-[#d9d7cf] shadow-[0_24px_60px_-46px_rgba(0,0,0,0.7)]">
                <DeckSlidePreview
                  deck={deck}
                  slide={selectedSlide}
                  slideIndex={Math.max(0, deck.slides.findIndex((slide) => slide.id === selectedSlide.id))}
                  sources={sources}
                  variant="panel"
                />
              </div>
            ) : (
              <div className="flex aspect-video items-center justify-center rounded-[0.7rem] border border-[#d9d7cf] bg-white p-6 text-center">
                <p className="max-w-sm text-sm leading-6 text-[#6b7280]">Slides preview will render here after the story and deck are generated.</p>
              </div>
            )}

            {deck ? (
              <div className="mt-4 rounded-[0.75rem] border border-[#d9d7cf] bg-white p-3">
                {process.env.NODE_ENV !== "production" ? (
                  <div className="sr-only" data-slides-provider={deck.provider} data-slides-visuals={(deck.diagnostics?.visualAssetKinds ?? deck.slides.map((slide) => slide.visualAsset.kind)).join(",")} data-slides-fallback={deck.diagnostics?.fallbackReason ?? ""} />
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => void exportDeck("pptx")} disabled={busyAction !== null} className="rounded-full bg-[#111111] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Export PPTX</button>
                  <button type="button" onClick={() => void exportDeck("pdf")} disabled={busyAction !== null} className="rounded-full border border-[#d9d7cf] px-3 py-2 text-xs font-semibold text-[#111111] disabled:opacity-50">Export PDF</button>
                  <button type="button" onClick={() => void regenerateDesign()} disabled={busyAction !== null} className="rounded-full border border-[#4169ff]/30 bg-[#4169ff]/10 px-3 py-2 text-xs font-semibold text-[#2442c4] disabled:opacity-50">Regenerate design</button>
                </div>
                <div className="mt-3 flex gap-2">
                  <input
                    value={editInstruction}
                    onChange={(event) => setEditInstruction(event.target.value)}
                    placeholder="Ask AI to edit the selected slide or whole deck..."
                    className="min-w-0 flex-1 rounded-full border border-[#d9d7cf] px-3 py-2 text-sm outline-none focus:border-[#4169ff]"
                  />
                  <button type="button" onClick={() => void applyEdit("slide")} disabled={busyAction !== null || !editInstruction.trim()} className="rounded-full bg-[#4169ff] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Slide</button>
                  <button type="button" onClick={() => void applyEdit("deck")} disabled={busyAction !== null || !editInstruction.trim()} className="rounded-full bg-[#111111] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Deck</button>
                </div>
                {localError ? <p className="mt-2 text-xs font-medium text-red-600">{localError}</p> : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}
