"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { PointerEvent as ReactPointerEvent } from "react"
import mermaid from "mermaid"

let isMermaidInitialized = false

const MIN_ZOOM = 0.45
const MAX_ZOOM = 2.6
const ZOOM_FACTOR = 1.18

type DiagramSize = {
    width: number
    height: number
}

function ensureMermaidInitialized() {
    if (isMermaidInitialized) {
        return
    }

    mermaid.initialize({
        startOnLoad: false,
        theme: "base",
        securityLevel: "loose",
        themeVariables: {
            background: "#ffffff",
            primaryColor: "#eff6ff",
            primaryTextColor: "#172033",
            primaryBorderColor: "#2f8fff",
            lineColor: "#94a3b8",
            secondaryColor: "#f8fafc",
            tertiaryColor: "#f7f2eb",
            fontFamily: "var(--font-inter), sans-serif",
        },
        flowchart: {
            curve: "basis",
            useMaxWidth: false,
            htmlLabels: true,
        },
    })

    isMermaidInitialized = true
}

function clampZoom(value: number) {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))
}

function getSvgMetadata(svgMarkup: string): { src: string; size: DiagramSize } {
    const parser = new DOMParser()
    const svgDocument = parser.parseFromString(svgMarkup, "image/svg+xml")
    const svgElement = svgDocument.documentElement
    const viewBox = svgElement.getAttribute("viewBox")?.split(/\s+/).map(Number) || []

    const width = Number.parseFloat(svgElement.getAttribute("width") || "")
    const height = Number.parseFloat(svgElement.getAttribute("height") || "")

    const size = {
        width: viewBox.length === 4 && Number.isFinite(viewBox[2]) && viewBox[2] > 0 ? viewBox[2] : Number.isFinite(width) && width > 0 ? width : 1200,
        height: viewBox.length === 4 && Number.isFinite(viewBox[3]) && viewBox[3] > 0 ? viewBox[3] : Number.isFinite(height) && height > 0 ? height : 720,
    }

    return {
        src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`,
        size,
    }
}

interface MermaidRendererProps {
    chart: string
    title: string
}

function ToolbarButton({
    label,
    icon,
    onClick,
    disabled = false,
}: {
    label: string
    icon: string
    onClick: () => void
    disabled?: boolean
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d9e3ef] bg-white text-slate-600 transition hover:border-[#bfd8ff] hover:text-[#2f8fff] disabled:cursor-not-allowed disabled:opacity-40"
        >
            <span className="material-symbols-outlined text-[18px]">{icon}</span>
        </button>
    )
}

export default function MermaidRenderer({ chart, title }: MermaidRendererProps) {
    const renderIdRef = useRef(`mermaid-${Math.random().toString(36).slice(2, 10)}`)
    const viewportRef = useRef<HTMLDivElement>(null)
    const dragStateRef = useRef<{
        pointerId: number
        startX: number
        startY: number
        scrollLeft: number
        scrollTop: number
    } | null>(null)

    const [imageSrc, setImageSrc] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [isRendering, setIsRendering] = useState(true)
    const [diagramSize, setDiagramSize] = useState<DiagramSize | null>(null)
    const [isViewerOpen, setIsViewerOpen] = useState(false)
    const [zoom, setZoom] = useState(1)
    const [isPanning, setIsPanning] = useState(false)

    const fitToViewport = useCallback((sizeOverride?: DiagramSize) => {
        const viewport = viewportRef.current
        const size = sizeOverride || diagramSize

        if (!viewport || !size) {
            return
        }

        const availableWidth = Math.max(viewport.clientWidth - 96, 280)
        const availableHeight = Math.max(viewport.clientHeight - 96, 240)
        const fitZoom = Math.min(availableWidth / size.width, availableHeight / size.height, 1)

        setZoom(clampZoom(Math.max(fitZoom, 0.78)))

        requestAnimationFrame(() => {
            viewport.scrollTo({ left: 0, top: 0 })
        })
    }, [diagramSize])

    useEffect(() => {
        let isActive = true

        async function renderChart() {
            ensureMermaidInitialized()
            setIsRendering(true)
            setError(null)

            try {
                const { svg } = await mermaid.render(renderIdRef.current, chart)
                if (!isActive) {
                    return
                }

                const metadata = getSvgMetadata(svg)
                setImageSrc(metadata.src)
                setDiagramSize(metadata.size)
            } catch (renderError) {
                if (!isActive) {
                    return
                }

                setError(renderError instanceof Error ? renderError.message : "Failed to render diagram")
                setImageSrc("")
                setDiagramSize(null)
            } finally {
                if (isActive) {
                    setIsRendering(false)
                }
            }
        }

        void renderChart()

        return () => {
            isActive = false
        }
    }, [chart])

    useEffect(() => {
        if (!isViewerOpen || !diagramSize) {
            return
        }

        fitToViewport(diagramSize)
    }, [diagramSize, fitToViewport, isViewerOpen])

    useEffect(() => {
        if (!isViewerOpen) {
            return
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setIsViewerOpen(false)
            }
        }

        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = "hidden"
        window.addEventListener("keydown", handleKeyDown)

        return () => {
            document.body.style.overflow = previousOverflow
            window.removeEventListener("keydown", handleKeyDown)
        }
    }, [isViewerOpen])

    function adjustZoom(multiplier: number) {
        setZoom((current) => clampZoom(current * multiplier))
    }

    function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
        if (event.pointerType === "mouse" && event.button !== 0) {
            return
        }

        const viewport = viewportRef.current
        if (!viewport) {
            return
        }

        dragStateRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            scrollLeft: viewport.scrollLeft,
            scrollTop: viewport.scrollTop,
        }

        setIsPanning(true)
        viewport.setPointerCapture(event.pointerId)
    }

    function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
        const viewport = viewportRef.current
        const dragState = dragStateRef.current

        if (!viewport || !dragState || dragState.pointerId !== event.pointerId) {
            return
        }

        viewport.scrollLeft = dragState.scrollLeft - (event.clientX - dragState.startX)
        viewport.scrollTop = dragState.scrollTop - (event.clientY - dragState.startY)
    }

    function clearPointerDrag(event?: ReactPointerEvent<HTMLDivElement>) {
        const viewport = viewportRef.current
        const dragState = dragStateRef.current

        if (viewport && event && dragState && dragState.pointerId === event.pointerId && viewport.hasPointerCapture(event.pointerId)) {
            viewport.releasePointerCapture(event.pointerId)
        }

        dragStateRef.current = null
        setIsPanning(false)
    }

    if (error) {
        return (
            <div className="rounded-[1.5rem] border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                <div className="mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">error</span>
                    <span className="font-medium">Unable to render {title}</span>
                </div>
                <p className="text-red-500">{error}</p>
            </div>
        )
    }

    return (
        <>
            <div className="overflow-hidden rounded-[1.75rem] border border-[#e4ddd4] bg-[linear-gradient(180deg,#ffffff_0%,#f8f5ef_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                <div className="flex items-center justify-between gap-3 border-b border-[#ebe3d7] bg-white/88 px-4 py-3">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Diagram preview</p>
                        <p className="mt-1 text-sm text-slate-500">Click the image to open a larger viewer and adjust it there.</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsViewerOpen(true)}
                        disabled={isRendering || !imageSrc}
                        className="inline-flex items-center gap-2 rounded-full border border-[#d9e3ef] bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-[#bfd8ff] hover:text-[#2f8fff] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <span className="material-symbols-outlined text-[18px]">open_in_full</span>
                        Open
                    </button>
                </div>

                <button
                    type="button"
                    onClick={() => setIsViewerOpen(true)}
                    disabled={isRendering || !imageSrc}
                    className="group relative block h-[320px] w-full overflow-hidden bg-[radial-gradient(circle_at_top,#ffffff_0%,#f6f1ea_100%)] disabled:cursor-not-allowed"
                >
                    {imageSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={imageSrc}
                            alt={`${title} diagram`}
                            className="h-full w-full object-contain p-4 transition duration-300 group-hover:scale-[1.01]"
                        />
                    ) : null}

                    <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-[1rem] border border-white/70 bg-white/82 px-4 py-3 text-left shadow-[0_18px_40px_-28px_rgba(29,41,65,0.35)] backdrop-blur-sm">
                        <p className="text-sm font-medium text-slate-900">Open interactive viewer</p>
                        <p className="mt-1 text-xs text-slate-500">Zoom, drag, and inspect the full diagram without crowding the PRD.</p>
                    </div>

                    {isRendering ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/88">
                            <div className="flex items-center gap-3 rounded-full border border-[#dce8f8] bg-white px-4 py-2 text-sm text-slate-500 shadow-[0_16px_30px_-24px_rgba(29,41,65,0.35)]">
                                <span className="material-symbols-outlined animate-spin text-[#2f8fff]">progress_activity</span>
                                Rendering {title.toLowerCase()}...
                            </div>
                        </div>
                    ) : null}
                </button>
            </div>

            {isViewerOpen ? (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0f1722]/72 p-4 backdrop-blur-sm">
                    <div className="absolute inset-0" onClick={() => setIsViewerOpen(false)} />

                    <div className="relative z-10 flex h-[min(90vh,920px)] w-[min(96vw,1400px)] flex-col overflow-hidden rounded-[2rem] border border-[#d7e0eb] bg-[#f8f5ef] shadow-[0_45px_120px_-48px_rgba(15,23,34,0.75)]">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e6dfd4] bg-white/88 px-5 py-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Diagram viewer</p>
                                <h3 className="mt-1 text-lg font-semibold text-slate-900">{title}</h3>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <ToolbarButton label={`Zoom out ${title}`} icon="remove" onClick={() => adjustZoom(1 / ZOOM_FACTOR)} disabled={!diagramSize} />
                                <div className="min-w-[4.75rem] rounded-full border border-[#d9e3ef] bg-white px-3 py-2 text-center text-sm font-semibold text-slate-700">
                                    {Math.round(zoom * 100)}%
                                </div>
                                <ToolbarButton label={`Zoom in ${title}`} icon="add" onClick={() => adjustZoom(ZOOM_FACTOR)} disabled={!diagramSize} />
                                <button
                                    type="button"
                                    onClick={() => fitToViewport()}
                                    disabled={!diagramSize}
                                    className="inline-flex items-center gap-2 rounded-full border border-[#d9e3ef] bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-[#bfd8ff] hover:text-[#2f8fff] disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <span className="material-symbols-outlined text-[18px]">fit_screen</span>
                                    Fit
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsViewerOpen(false)}
                                    className="inline-flex items-center gap-2 rounded-full border border-[#e0d9cf] bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-[#cfd9e6] hover:text-slate-900"
                                >
                                    <span className="material-symbols-outlined text-[18px]">close</span>
                                    Close
                                </button>
                            </div>
                        </div>

                        <div
                            ref={viewportRef}
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={clearPointerDrag}
                            onPointerCancel={clearPointerDrag}
                            className={`flex-1 overflow-auto bg-[radial-gradient(circle_at_top,#ffffff_0%,#eee7dd_100%)] p-5 ${isPanning ? "cursor-grabbing select-none" : "cursor-grab"}`}
                        >
                            <div className="flex min-h-full min-w-full items-start justify-center rounded-[1.5rem] border border-[#e7dfd4] bg-white/82 p-6 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.72)]">
                                <div
                                    className="relative shrink-0"
                                    style={{
                                        width: diagramSize ? `${diagramSize.width * zoom}px` : "100%",
                                        height: diagramSize ? `${diagramSize.height * zoom}px` : "100%",
                                    }}
                                >
                                    {imageSrc ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={imageSrc}
                                            alt={`${title} enlarged diagram`}
                                            draggable={false}
                                            className="origin-top-left select-none"
                                            style={{
                                                transform: `scale(${zoom})`,
                                                width: diagramSize ? `${diagramSize.width}px` : "100%",
                                                height: diagramSize ? `${diagramSize.height}px` : "auto",
                                                maxWidth: "none",
                                            }}
                                        />
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    )
}
