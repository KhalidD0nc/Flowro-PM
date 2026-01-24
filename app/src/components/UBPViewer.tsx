"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import mermaid from "mermaid"
import {
    exportBlueprint,
    downloadBlueprint,
    generateFilename,
    type ExportFormat,
} from "@/lib/exportBlueprint"
import ShareModal from "./ShareModal"
import UBPEditModal from "./UBPEditModals"
import AIFloatingMenu from "./AIFloatingMenu"

// Initialize mermaid
mermaid.initialize({
    startOnLoad: false,
    theme: "dark",
    themeVariables: {
        primaryColor: "#137fec",
        primaryTextColor: "#fff",
        primaryBorderColor: "#283039",
        lineColor: "#9dabb9",
        secondaryColor: "#1f2937",
        tertiaryColor: "#111418",
    },
})

// UBP Types
export interface UBPContent {
    productVision?: {
        description?: string
        primaryGoal?: string
        targetAudience?: string
    }
    scope?: {
        inScope?: string[]
        outOfScope?: string[]
    }
    actors?: {
        name: string
        description: string
        icon?: string
        color?: string
    }[]
    behaviors?: {
        id: string
        title: string
        priority?: string
        given?: string
        when?: string
        then?: string
        diagram?: string // Mermaid diagram code
    }[]
    constraints?: {
        type: "warning" | "risk" | "constraint"
        title: string
        description: string
    }[]
    techDecisions?: {
        category: string
        choice: string
    }[]
    phases?: {
        name: string
        timeline?: string
        description: string
        status?: "completed" | "current" | "upcoming"
    }[]
    integrations?: {
        system: string
        method: string
        purpose: string
    }[]
    changelog?: {
        version: string
        title: string
        description: string
        timestamp?: string
    }[]
}

// Blueprint type for version list
export interface BlueprintVersion {
    id: string
    version: string
    status: "draft" | "locked" | "approved"
    createdAt: string
    lockedAt?: string
}

interface UBPViewerProps {
    isOpen: boolean
    onClose: () => void
    ubp: UBPContent | null
    projectName?: string
    projectDescription?: string
    version?: string
    status?: "draft" | "locked" | "approved"
    lastUpdated?: string
    createdAt?: string
    lockedAt?: string
    onSaveVersion?: () => void
    isSaving?: boolean
    allVersions?: BlueprintVersion[]
    onVersionSelect?: (blueprintId: string) => void
    currentBlueprintId?: string
    projectId?: string // For share functionality
    readOnly?: boolean // Public view mode (no editing, shows viral CTA)
    onUpdate?: (newUBP: UBPContent) => Promise<void>
    onEnhance?: (section: string, selection: string) => void
    onAIEdit?: (section: string, instruction: string, selection: string) => Promise<void>
}

// Section navigation items
const sections = [
    { id: "vision", label: "1. Product Vision", icon: "visibility" },
    { id: "scope", label: "2. Scope", icon: "my_location" },
    { id: "actors", label: "3. Actors", icon: "group" },
    { id: "behaviors", label: "4. Behaviors", icon: "bolt" },
    { id: "constraints", label: "5. Constraints & Risks", icon: "warning" },
    { id: "tech", label: "6. Tech Decisions", icon: "code" },
    { id: "phases", label: "7. Implementation", icon: "stairs" },
    { id: "integration", label: "8. Integration Pts", icon: "cable" },
    { id: "changelog", label: "9. Change Log", icon: "history" },
]

export default function UBPViewer({
    isOpen,
    onClose,
    ubp,
    projectName = "Project",
    projectDescription,
    version = "0.1",
    status = "draft",
    lastUpdated,
    createdAt,
    lockedAt,
    onSaveVersion,
    isSaving = false,
    allVersions = [],
    onVersionSelect,
    currentBlueprintId,
    projectId,
    readOnly = false,
    onUpdate,
    onEnhance,
    onAIEdit,
}: UBPViewerProps) {
    // const mermaidRef = useRef<HTMLDivElement>(null) // Unused
    const contentRef = useRef<HTMLDivElement>(null)
    const [isVersionDropdownOpen, setIsVersionDropdownOpen] = useState(false)
    const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false)
    const [isShareModalOpen, setIsShareModalOpen] = useState(false)

    // Editing State
    const [editSection, setEditSection] = useState<string | null>(null)

    // AI Floating Menu State
    const [selectionInfo, setSelectionInfo] = useState<{
        text: string
        section: string
        position: { x: number; y: number }
    } | null>(null)

    // Handle text selection
    useEffect(() => {
        if (readOnly) return

        const handleSelectionChange = () => {
            const selection = window.getSelection()

            if (!selection || selection.isCollapsed || !selection.toString().trim()) {
                // Delay clearing to allow clicking the menu
                if (selectionInfo) {
                    // Only clear if we really moved away, logic handled by menu's outside click usually
                    // But here we rely on mouseup mostly
                }
                return
            }

            // We only care if the selection is inside a UBP section
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0)
                const container = range.commonAncestorContainer.parentElement
                const sectionEl = container?.closest('section')

                if (sectionEl && sectionEl.id.startsWith('ubp-')) {
                    const sectionId = sectionEl.id.replace('ubp-', '')
                    const rect = range.getBoundingClientRect()

                    // Simple debounce/check to update menu
                    setSelectionInfo({
                        text: selection.toString(),
                        section: sectionId,
                        position: {
                            x: rect.left + rect.width / 2,
                            y: rect.top - 10
                        }
                    })
                } else {
                    setSelectionInfo(null)
                }
            }
        }

        const handleMouseUp = () => {
            // We use mouseup to finalize selection position
            handleSelectionChange()
        }

        document.addEventListener('mouseup', handleMouseUp)
        document.addEventListener('keyup', handleSelectionChange) // For keyboard selection

        return () => {
            document.removeEventListener('mouseup', handleMouseUp)
            document.removeEventListener('keyup', handleSelectionChange)
        }
    }, [readOnly, selectionInfo])

    // Clear selection when menu is closed or submitted
    const clearSelection = () => {
        setSelectionInfo(null)
        window.getSelection()?.removeAllRanges()
    }

    const handleManualSave = (section: string, newData: unknown) => {
        if (!ubp || !onUpdate) return

        const newUBP = { ...ubp }
        // Map section ID to property name if different
        const propName = section === "integration" ? "integrations" :
            section === "tech" ? "techDecisions" :
                section === "vision" ? "productVision" : section;

        (newUBP as Record<string, unknown>)[propName] = newData
        onUpdate(newUBP)
    }

    const handleEnhance = () => {
        if (!selectionInfo || !onEnhance) return
        onEnhance(selectionInfo.section, selectionInfo.text)
        clearSelection()
    }

    // Handle export
    const handleExport = (format: ExportFormat) => {
        if (!currentBlueprintId) return

        const content = exportBlueprint(ubp, {
            projectName,
            projectDescription,
            blueprintId: currentBlueprintId,
            version,
            status,
            createdAt: createdAt || new Date().toISOString(),
            lockedAt,
        }, format)

        const filename = generateFilename(projectName, version)
        downloadBlueprint(content, filename, format)
        setIsExportDropdownOpen(false)
    }

    // Re-render mermaid diagrams when UBP changes
    useEffect(() => {
        if (isOpen && ubp?.behaviors) {
            const renderDiagrams = async () => {
                const elements = document.querySelectorAll(".mermaid-diagram")
                for (const el of elements) {
                    const code = el.getAttribute("data-mermaid")
                    if (code) {
                        try {
                            const { svg } = await mermaid.render(`mermaid-${Math.random().toString(36).substr(2, 9)}`, code)
                            el.innerHTML = svg
                        } catch (e) {
                            console.error("Mermaid render error:", e)
                        }
                    }
                }
            }
            setTimeout(renderDiagrams, 100)
        }
    }, [isOpen, ubp])

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                onClose()
            }
        }
        window.addEventListener("keydown", handleEscape)
        return () => window.removeEventListener("keydown", handleEscape)
    }, [isOpen, onClose])

    // Scroll to section
    const scrollToSection = (id: string) => {
        const element = document.getElementById(`ubp-${id}`)
        if (element && contentRef.current) {
            element.scrollIntoView({ behavior: "smooth", block: "start" })
        }
    }

    if (!isOpen) return null

    const statusColors = {
        draft: "bg-yellow-500/10 border-yellow-500/20 text-yellow-400",
        locked: "bg-blue-500/10 border-blue-500/20 text-blue-400",
        approved: "bg-green-500/10 border-green-500/20 text-green-400",
    }

    const statusLabels = {
        draft: "Draft",
        locked: "Locked",
        approved: "Agent-Ready",
    }

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="fixed top-0 right-0 h-full w-full max-w-[1200px] bg-[#101922] border-l border-[#283039] z-50 flex flex-col overflow-hidden animate-slide-in-right">
                {/* Header */}
                <header className="flex items-center justify-between px-6 py-4 border-b border-[#283039] bg-[#0d141c] shrink-0">
                    <div className="flex items-center gap-4">
                        {/* Show close button only in non-readOnly mode, otherwise show Flowro branding */}
                        {readOnly ? (
                            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                                <img src="/logo.png" alt="Flowro" className="size-7" />
                                <span className="text-white font-bold">Flowro</span>
                            </Link>
                        ) : (
                            <button
                                onClick={onClose}
                                className="flex items-center justify-center rounded-lg p-2 text-[#9dabb9] transition-colors hover:bg-white/10 hover:text-white"
                                title="Close"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        )}
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <h1 className="text-lg font-bold text-white">{projectName}</h1>

                                {/* Version Dropdown */}
                                {allVersions.length > 1 && onVersionSelect ? (
                                    <div className="relative">
                                        <button
                                            onClick={() => setIsVersionDropdownOpen(!isVersionDropdownOpen)}
                                            className="flex items-center gap-1 text-[#9dabb9] text-sm hover:text-white hover:bg-white/10 px-2 py-1 rounded transition-colors"
                                        >
                                            v{version}
                                            <span className="material-symbols-outlined text-[16px]">
                                                {isVersionDropdownOpen ? "expand_less" : "expand_more"}
                                            </span>
                                        </button>

                                        {isVersionDropdownOpen && (
                                            <div className="absolute top-full left-0 mt-1 bg-[#1f2937] border border-[#283039] rounded-lg shadow-xl z-10 min-w-[180px] py-1">
                                                {allVersions.map((v) => (
                                                    <button
                                                        key={v.id}
                                                        onClick={() => {
                                                            onVersionSelect(v.id)
                                                            setIsVersionDropdownOpen(false)
                                                        }}
                                                        className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${v.id === currentBlueprintId
                                                            ? "bg-[#137fec]/20 text-white"
                                                            : "text-[#9dabb9] hover:bg-white/5 hover:text-white"
                                                            }`}
                                                    >
                                                        <span>v{v.version}</span>
                                                        <span className={`text-xs px-1.5 py-0.5 rounded ${v.status === "draft"
                                                            ? "bg-yellow-500/20 text-yellow-400"
                                                            : "bg-blue-500/20 text-blue-400"
                                                            }`}>
                                                            {v.status === "draft" ? "Draft" : "Locked"}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <span className="text-[#9dabb9] text-sm">v{version}</span>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-bold uppercase tracking-wide ${statusColors[status]}`}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                    {statusLabels[status]}
                                </span>
                                {lastUpdated && (
                                    <span className="text-[#9dabb9] text-xs">
                                        Last updated {lastUpdated}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3">
                        {/* Share Button - only shown if not readOnly and has required data */}
                        {!readOnly && currentBlueprintId && projectId && (
                            <button
                                onClick={() => setIsShareModalOpen(true)}
                                className="flex items-center gap-2 bg-[#283039] hover:bg-[#3d4a56] text-white font-medium py-2 px-4 rounded-lg transition-colors"
                            >
                                <span className="material-symbols-outlined text-[18px]">share</span>
                                Share
                            </button>
                        )}

                        {/* Export Dropdown - only shown if not readOnly */}
                        {!readOnly && (
                            <div className="relative">
                                <button
                                    onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                                    className="flex items-center gap-2 bg-[#283039] hover:bg-[#3d4a56] text-white font-medium py-2 px-4 rounded-lg transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[18px]">download</span>
                                    Export
                                    <span className="material-symbols-outlined text-[16px]">
                                        {isExportDropdownOpen ? "expand_less" : "expand_more"}
                                    </span>
                                </button>

                                {isExportDropdownOpen && (
                                    <div className="absolute top-full right-0 mt-1 bg-[#1f2937] border border-[#283039] rounded-lg shadow-xl z-10 min-w-[180px] py-1">
                                        <button
                                            onClick={() => handleExport("json")}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#d0d6dc] hover:bg-white/5 hover:text-white transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">data_object</span>
                                            Export as JSON
                                        </button>
                                        <button
                                            onClick={() => handleExport("markdown")}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#d0d6dc] hover:bg-white/5 hover:text-white transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">description</span>
                                            Export as Markdown
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Save Version Button - only shown for draft status and not readOnly */}
                        {!readOnly && status === "draft" && onSaveVersion && (
                            <div className="flex flex-col items-end">
                                <button
                                    onClick={onSaveVersion}
                                    disabled={isSaving}
                                    className="flex items-center gap-2 bg-[#137fec] hover:bg-blue-600 disabled:bg-[#137fec]/50 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
                                >
                                    {isSaving ? (
                                        <>
                                            <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined text-[18px]">save</span>
                                            Save Version
                                        </>
                                    )}
                                </button>
                                <span className="text-[#9dabb9] text-xs mt-1">Save as milestone, continue editing</span>
                            </div>
                        )}

                        {/* Public View Badge - shown in readOnly mode */}
                        {readOnly && (
                            <span className="flex items-center gap-2 bg-blue-500/20 text-blue-400 px-3 py-2 rounded-lg text-sm font-medium border border-blue-500/30">
                                <span className="material-symbols-outlined text-[18px]">visibility</span>
                                Public View
                            </span>
                        )}
                    </div>
                </header>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar Navigation */}
                    <aside className="w-56 flex-none bg-[#0d141c] border-r border-[#283039] hidden md:flex flex-col overflow-y-auto custom-scrollbar p-4">
                        <p className="px-3 text-[#9dabb9] text-xs font-semibold uppercase tracking-wider mb-3">
                            Sections
                        </p>
                        <div className="flex flex-col gap-1">
                            {sections.map((section) => (
                                <button
                                    key={section.id}
                                    onClick={() => scrollToSection(section.id)}
                                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-[#9dabb9] hover:text-white hover:bg-[#283039] transition-colors text-left"
                                >
                                    <span className="material-symbols-outlined text-[20px]">
                                        {section.icon}
                                    </span>
                                    <span className="text-sm font-medium">{section.label}</span>
                                </button>
                            ))}
                        </div>
                    </aside>

                    {/* Main Content */}
                    <main ref={contentRef} className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar">
                        <div className="p-6 pb-20 space-y-6">
                            {/* No UBP Content */}
                            {!ubp && (
                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                    <div className="size-16 rounded-2xl bg-[#137fec]/10 flex items-center justify-center mb-4">
                                        <span className="material-symbols-outlined text-[#137fec] text-3xl">
                                            description
                                        </span>
                                    </div>
                                    <h2 className="text-xl font-bold text-white mb-2">No Blueprint Yet</h2>
                                    <p className="text-[#9dabb9] max-w-md">
                                        Continue chatting with the AI to generate your Unified Blueprint.
                                    </p>
                                </div>
                            )}

                            {ubp && (
                                <>
                                    {/* Product Vision */}
                                    <Section id="vision" icon="visibility" title="1. Product Vision" onEdit={!readOnly && onUpdate ? () => setEditSection("vision") : undefined}>
                                        {ubp.productVision?.description && (
                                            <p className="text-[#d0d6dc] text-base leading-relaxed mb-6">
                                                {ubp.productVision.description}
                                            </p>
                                        )}
                                        <div className="grid md:grid-cols-2 gap-4">
                                            {ubp.productVision?.primaryGoal && (
                                                <InfoCard title="Primary Goal" content={ubp.productVision.primaryGoal} />
                                            )}
                                            {ubp.productVision?.targetAudience && (
                                                <InfoCard title="Target Audience" content={ubp.productVision.targetAudience} />
                                            )}
                                        </div>
                                    </Section>

                                    {/* Scope */}
                                    <Section id="scope" icon="my_location" title="2. Scope" onEdit={!readOnly && onUpdate ? () => setEditSection("scope") : undefined}>
                                        <div className="grid md:grid-cols-2 gap-6">
                                            {ubp.scope?.inScope && ubp.scope.inScope.length > 0 && (
                                                <div>
                                                    <h3 className="flex items-center gap-2 text-white font-semibold mb-4 text-sm uppercase tracking-wider">
                                                        <span className="text-green-500 material-symbols-outlined text-lg">check_circle</span>
                                                        In Scope
                                                    </h3>
                                                    <ul className="space-y-3">
                                                        {ubp.scope.inScope.map((item, i) => (
                                                            <li key={i} className="flex items-start gap-3 text-[#d0d6dc] text-sm">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-[#9dabb9] mt-2 shrink-0" />
                                                                <span>{item}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                            {ubp.scope?.outOfScope && ubp.scope.outOfScope.length > 0 && (
                                                <div>
                                                    <h3 className="flex items-center gap-2 text-white font-semibold mb-4 text-sm uppercase tracking-wider">
                                                        <span className="text-red-500 material-symbols-outlined text-lg">cancel</span>
                                                        Out of Scope
                                                    </h3>
                                                    <ul className="space-y-3">
                                                        {ubp.scope.outOfScope.map((item, i) => (
                                                            <li key={i} className="flex items-start gap-3 text-[#9dabb9] text-sm">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-[#3d4a56] mt-2 shrink-0" />
                                                                <span>{item}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </Section>

                                    {/* Actors */}
                                    <Section id="actors" icon="group" title="3. Actors" onEdit={!readOnly && onUpdate ? () => setEditSection("actors") : undefined}>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {ubp.actors?.map((actor, i) => (
                                                <div key={i} className="bg-[#283039]/40 p-4 rounded-lg border border-[#283039] flex flex-col gap-2">
                                                    <div className={`size-10 rounded-full flex items-center justify-center mb-2 ${getActorColor(i)}`}>
                                                        <span className="material-symbols-outlined">
                                                            {actor.icon || "person"}
                                                        </span>
                                                    </div>
                                                    <h4 className="text-white font-bold text-sm">{actor.name}</h4>
                                                    <p className="text-[#9dabb9] text-xs leading-normal">{actor.description}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </Section>

                                    {/* Behaviors */}
                                    <Section id="behaviors" icon="bolt" title="4. Behaviors" onEdit={!readOnly && onUpdate ? () => setEditSection("behaviors") : undefined}>
                                        <div className="divide-y divide-[#283039]">
                                            {ubp.behaviors?.map((behavior, i) => (
                                                <div key={i} className="py-6 first:pt-0 last:pb-0">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <h4 className="text-white font-semibold text-sm">{behavior.id}: {behavior.title}</h4>
                                                        {behavior.priority && (
                                                            <span className="text-[#9dabb9] text-xs font-mono bg-[#283039] px-2 py-1 rounded">
                                                                {behavior.priority}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="bg-[#111418] rounded-lg p-4 font-mono text-sm border border-[#283039]">
                                                        {behavior.given && (
                                                            <p className="text-purple-400">
                                                                <span className="text-[#9dabb9] font-bold">GIVEN</span> {behavior.given}
                                                            </p>
                                                        )}
                                                        {behavior.when && (
                                                            <p className="text-blue-400">
                                                                <span className="text-[#9dabb9] font-bold">WHEN</span> {behavior.when}
                                                            </p>
                                                        )}
                                                        {behavior.then && (
                                                            <p className="text-green-400">
                                                                <span className="text-[#9dabb9] font-bold">THEN</span> {behavior.then}
                                                            </p>
                                                        )}
                                                    </div>
                                                    {behavior.diagram && (
                                                        <div
                                                            className="mermaid-diagram mt-4 bg-[#111418] rounded-lg p-4 border border-[#283039] overflow-x-auto"
                                                            data-mermaid={behavior.diagram}
                                                        />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </Section>

                                    {/* Constraints & Risks */}
                                    <Section id="constraints" icon="warning" title="5. Constraints & Risks" onEdit={!readOnly && onUpdate ? () => setEditSection("constraints") : undefined}>
                                        <div className="grid gap-4">
                                            {ubp.constraints?.map((constraint, i) => (
                                                <div
                                                    key={i}
                                                    className={`flex gap-4 p-4 rounded-lg ${constraint.type === "risk"
                                                        ? "bg-red-500/10 border border-red-500/20"
                                                        : "bg-yellow-500/10 border border-yellow-500/20"
                                                        }`}
                                                >
                                                    <span className={`material-symbols-outlined flex-none ${constraint.type === "risk" ? "text-red-500" : "text-yellow-500"
                                                        }`}>
                                                        {constraint.type === "risk" ? "lock" : "dns"}
                                                    </span>
                                                    <div>
                                                        <h4 className={`font-bold text-sm mb-1 ${constraint.type === "risk" ? "text-red-500" : "text-yellow-500"
                                                            }`}>
                                                            {constraint.title}
                                                        </h4>
                                                        <p className="text-[#d0d6dc] text-sm">{constraint.description}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </Section>

                                    {/* Tech Decisions */}
                                    <Section id="tech" icon="code" title="6. Technology Decisions" onEdit={!readOnly && onUpdate ? () => setEditSection("tech") : undefined}>
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                            {ubp.techDecisions?.map((tech, i) => (
                                                <div key={i} className="p-4 bg-[#283039] rounded-lg border border-[#283039]">
                                                    <p className="text-[#9dabb9] text-xs uppercase tracking-wide mb-1">{tech.category}</p>
                                                    <p className="text-white font-bold">{tech.choice}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </Section>

                                    {/* Implementation Phases */}
                                    <Section id="phases" icon="stairs" title="7. Implementation Phases" onEdit={!readOnly && onUpdate ? () => setEditSection("phases") : undefined}>
                                        <div className="relative pl-6 border-l-2 border-[#283039] space-y-8">
                                            {ubp.phases?.map((phase, i) => (
                                                <div key={i} className="relative">
                                                    <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-[#1f2937] ${phase.status === "completed"
                                                        ? "bg-green-500"
                                                        : phase.status === "current"
                                                            ? "bg-[#137fec]"
                                                            : "bg-[#283039]"
                                                        }`}
                                                    />
                                                    <h4 className={`font-bold text-sm mb-1 ${phase.status === "upcoming" ? "text-[#9dabb9]" : "text-white"
                                                        }`}>
                                                        {phase.name}
                                                    </h4>
                                                    {phase.timeline && (
                                                        <p className="text-[#9dabb9] text-xs mb-2">{phase.timeline}</p>
                                                    )}
                                                    <p className={`text-sm ${phase.status === "upcoming" ? "text-[#9dabb9]" : "text-[#d0d6dc]"
                                                        }`}>
                                                        {phase.description}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </Section>

                                    {/* Integration Points */}
                                    <Section id="integration" icon="cable" title="8. Integration Points" onEdit={!readOnly && onUpdate ? () => setEditSection("integration") : undefined}>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm text-[#d0d6dc]">
                                                <thead className="text-xs uppercase bg-[#283039] text-[#9dabb9]">
                                                    <tr>
                                                        <th className="px-4 py-3 rounded-l-lg">System</th>
                                                        <th className="px-4 py-3">Method</th>
                                                        <th className="px-4 py-3 rounded-r-lg">Purpose</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-[#283039]">
                                                    {ubp.integrations?.map((integration, i) => (
                                                        <tr key={i}>
                                                            <td className="px-4 py-3 font-medium text-white">{integration.system}</td>
                                                            <td className="px-4 py-3">
                                                                <code className="bg-[#111418] px-2 py-0.5 rounded text-xs">
                                                                    {integration.method}
                                                                </code>
                                                            </td>
                                                            <td className="px-4 py-3">{integration.purpose}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </Section>

                                    {/* Change Log */}
                                    <Section id="changelog" icon="history" title="9. Change Log" onEdit={!readOnly && onUpdate ? () => setEditSection("changelog") : undefined}>
                                        <div className="space-y-4">
                                            {ubp.changelog?.map((entry, i) => (
                                                <div key={i} className="flex gap-4">
                                                    <div className="text-[#9dabb9] text-sm font-mono whitespace-nowrap pt-0.5">
                                                        {entry.timestamp || "—"}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded font-bold">
                                                                v{entry.version}
                                                            </span>
                                                            <span className="text-white font-medium text-sm">{entry.title}</span>
                                                        </div>
                                                        <p className="text-[#9dabb9] text-sm">{entry.description}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </Section>
                                </>
                            )}
                        </div>
                    </main>
                </div>
            </div>

            {/* Viral CTA Footer - shown in readOnly mode */}
            {readOnly && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60]">
                    <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#137fec]/10 to-[#0d5fbc]/10 backdrop-blur-2xl border border-[#137fec]/20 shadow-2xl shadow-[#137fec]/10 transition-all duration-300 hover:shadow-[#137fec]/20 hover:border-[#137fec]/40">
                        {/* Subtle glow effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-[#137fec]/5 via-transparent to-[#137fec]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                        <div className="relative flex items-center gap-4 px-5 py-3">
                            {/* Logo and branding */}
                            <div className="flex items-center gap-2.5">
                                <img src="/logo.png" alt="Flowro" className="size-8" />
                                <div className="flex flex-col">
                                    <span className="text-[#9dabb9] text-xs leading-tight">Built with</span>
                                    <span className="text-white font-bold text-sm leading-tight">Flowro AI</span>
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="w-px h-8 bg-gradient-to-b from-transparent via-[#283039] to-transparent" />

                            {/* CTA Button */}
                            <a
                                href="/auth"
                                className="flex items-center gap-2 bg-[#137fec] hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-[#137fec]/30"
                            >
                                <span>Create yours free</span>
                                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* Share Modal */}
            {currentBlueprintId && projectId && (
                <ShareModal
                    isOpen={isShareModalOpen}
                    onClose={() => setIsShareModalOpen(false)}
                    blueprintId={currentBlueprintId}
                    projectId={projectId}
                    projectName={projectName}
                />
            )}

            {/* Manual Edit Modals */}
            {editSection && ubp && (
                <UBPEditModal
                    isOpen={!!editSection}
                    onClose={() => setEditSection(null)}
                    section={editSection}
                    data={
                        // Map section to data prop
                        editSection === "vision" ? ubp.productVision :
                            editSection === "scope" ? ubp.scope :
                                editSection === "actors" ? ubp.actors :
                                    editSection === "behaviors" ? ubp.behaviors :
                                        editSection === "constraints" ? ubp.constraints :
                                            editSection === "tech" ? ubp.techDecisions :
                                                editSection === "phases" ? ubp.phases :
                                                    editSection === "integration" ? ubp.integrations :
                                                        editSection === "changelog" ? ubp.changelog : {}
                    }
                    onSave={handleManualSave}
                />
            )}

            {/* AI Floating Menu */}
            {selectionInfo && (
                <AIFloatingMenu
                    position={selectionInfo.position}
                    selectedText={selectionInfo.text}
                    onClose={clearSelection}
                    onEnhance={handleEnhance}
                    onAIEdit={onAIEdit ? (instruction) => {
                        onAIEdit(selectionInfo.section, instruction, selectionInfo.text)
                        clearSelection()
                    } : undefined}
                />
            )}

            {/* Styles */}
            <style jsx global>{`
                @keyframes slide-in-right {
                    from {
                        transform: translateX(100%);
                    }
                    to {
                        transform: translateX(0);
                    }
                }
                .animate-slide-in-right {
                    animation: slide-in-right 0.3s ease-out;
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #111418;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #283039;
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #3d4a56;
                }
            `}</style>
        </>
    )
}

// Section wrapper component
function Section({
    id,
    icon,
    title,
    children,
    onEdit,
}: {
    id: string
    icon: string
    title: string
    children: React.ReactNode
    onEdit?: () => void
}) {
    return (
        <section id={`ubp-${id}`} className="scroll-mt-6 group">
            <div className="bg-[#1f2937] border border-[#283039] rounded-xl overflow-hidden shadow-sm transition-shadow hover:shadow-md hover:border-[#137fec]/30">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#283039] bg-[#111418]/50">
                    <h2 className="text-white text-lg font-bold flex items-center gap-2">
                        <span className="text-[#137fec] material-symbols-outlined">{icon}</span>
                        {title}
                    </h2>
                    {onEdit && (
                        <button
                            onClick={onEdit}
                            className="text-[#9dabb9] hover:text-white hover:bg-[#283039] p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                            title="Edit Section"
                        >
                            <span className="material-symbols-outlined text-[20px]">edit</span>
                        </button>
                    )}
                </div>
                <div className="p-6">{children}</div>
            </div>
        </section>
    )
}

// Info card component
function InfoCard({ title, content }: { title: string; content: string }) {
    return (
        <div className="bg-[#283039]/50 rounded-lg p-4 border border-[#283039]">
            <h4 className="text-white text-sm font-bold mb-2 uppercase tracking-wide text-xs">{title}</h4>
            <p className="text-[#9dabb9] text-sm">{content}</p>
        </div>
    )
}

// Actor color helper
function getActorColor(index: number): string {
    const colors = [
        "bg-blue-500/20 text-blue-400",
        "bg-purple-500/20 text-purple-400",
        "bg-orange-500/20 text-orange-400",
        "bg-green-500/20 text-green-400",
        "bg-pink-500/20 text-pink-400",
        "bg-cyan-500/20 text-cyan-400",
    ]
    return colors[index % colors.length]
}
