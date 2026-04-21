"use client"

import { useEffect, useRef, useState } from "react"
import mermaid from "mermaid"

let isMermaidInitialized = false

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
            lineColor: "#6b7280",
            secondaryColor: "#f8fafc",
            tertiaryColor: "#f7f2eb",
            fontFamily: "var(--font-inter), sans-serif",
        },
        flowchart: {
            curve: "basis",
            useMaxWidth: true,
            htmlLabels: true,
        },
    })

    isMermaidInitialized = true
}

interface MermaidRendererProps {
    chart: string
    title: string
}

export default function MermaidRenderer({ chart, title }: MermaidRendererProps) {
    const renderIdRef = useRef(`mermaid-${Math.random().toString(36).slice(2, 10)}`)
    const [svg, setSvg] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [isRendering, setIsRendering] = useState(true)

    useEffect(() => {
        let isActive = true

        async function renderChart() {
            ensureMermaidInitialized()
            setIsRendering(true)
            setError(null)

            try {
                const { svg: nextSvg } = await mermaid.render(renderIdRef.current, chart)
                if (!isActive) {
                    return
                }
                setSvg(nextSvg)
            } catch (renderError) {
                if (!isActive) {
                    return
                }
                setError(renderError instanceof Error ? renderError.message : "Failed to render diagram")
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
        <div className="relative overflow-hidden rounded-[1.5rem] border border-[#e4ddd4] bg-white">
            <div
                className={`transition-opacity duration-300 ${isRendering ? "opacity-0" : "opacity-100"}`}
                dangerouslySetInnerHTML={{ __html: svg }}
            />
            {isRendering ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white/90">
                    <div className="flex items-center gap-3 text-sm text-slate-500">
                        <span className="material-symbols-outlined animate-spin text-[#2f8fff]">progress_activity</span>
                        Rendering {title.toLowerCase()}...
                    </div>
                </div>
            ) : null}
        </div>
    )
}
