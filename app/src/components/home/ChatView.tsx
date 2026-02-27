/**
 * ChatView Component
 * 
 * Embedded chat interface for seamless single-page experience.
 * Used within AppHome to display chat after project creation.
 * 
 * All state management and API communication is handled by the
 * useProject hook — this component is render-only.
 */

"use client"

import { useState } from "react"
import { User } from "firebase/auth"
import UBPViewer from "@/components/UBPViewer"
import ShareProjectModal from "@/components/ShareProjectModal"
import { ChatPanel } from "@/components/chat"
import type { SelectionContext } from "@/lib/types/views"
import { useProject } from "@/hooks/useProject"

// =============================================================================
// Types
// =============================================================================

interface ChatViewProps {
    projectId: string
    initialMessage: string
    user: User
    onBack: () => void
    isExisting?: boolean
}

// =============================================================================
// Main Component
// =============================================================================

export default function ChatView({ projectId, initialMessage, user, onBack, isExisting = false }: ChatViewProps) {
    // All project/chat/blueprint state from the hook
    const {
        project,
        loadingProject,
        currentUBP,
        allVersions,
        selectedBlueprint,
        isGenerating,
        isStreaming,
        streamedContent,
        thinkingPhase,
        generationMode,
        isSaving,
        error,
        message,
        messagesEndRef,
        setMessage,
        handleSendMessage,
        handleQuickAction,
        handleRetry,
        handleApplyProposedChanges,
        updateBlueprint,
        handleSaveVersion,
        handleVersionSelect,
    } = useProject(projectId, user, initialMessage, isExisting)

    // UI-only state (stays in the component)
    const [isUBPViewerOpen, setIsUBPViewerOpen] = useState(false)
    const [isShareModalOpen, setIsShareModalOpen] = useState(false)
    const [selectionContext, setSelectionContext] = useState<SelectionContext | null>(null)

    // =============================================================================
    // Event Wiring
    // =============================================================================

    const onSendMessage = async (e: React.FormEvent) => {
        const result = await handleSendMessage(e, selectionContext)
        if (result.handledAsEdit) {
            setSelectionContext(null)
        }
    }

    const onApplyProposedChanges = async (changes: Parameters<typeof handleApplyProposedChanges>[0], index: number) => {
        await handleApplyProposedChanges(changes, index)
        setIsUBPViewerOpen(true)
    }

    const handleEnhanceWithFlowro = (section: string, text: string) => {
        setSelectionContext({ section, text })
        setIsUBPViewerOpen(false)
    }

    // =============================================================================
    // Render
    // =============================================================================

    if (loadingProject) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <span className="material-symbols-outlined text-[#137fec] animate-spin text-4xl">hourglass_top</span>
                    <p className="text-slate-400 text-sm">Preparing your session...</p>
                </div>
            </div>
        )
    }

    if (!project) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <span className="material-symbols-outlined text-red-400 text-5xl">error</span>
                <p className="text-white text-lg">Failed to load project</p>
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 bg-[#137fec] hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    Back to Command Center
                </button>
            </div>
        )
    }

    return (
        <div className="flex flex-1 flex-col h-full overflow-hidden">
            {/* Header */}
            <header className="relative shrink-0 z-10 border-b border-white/10 bg-[#0a0d12]">
                <div className="flex items-center justify-between px-4 sm:px-6 py-2">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <div className="hidden xs:flex size-8 items-center justify-center rounded-lg bg-white/10 shrink-0">
                            {isGenerating && (!project.projectName || project.projectName === "Untitled Project" || project.projectName === "Project") ? (
                                <span className="material-symbols-outlined text-slate-300 text-base animate-spin">progress_activity</span>
                            ) : (
                                <span className="material-symbols-outlined text-slate-300 text-base">hourglass_top</span>
                            )}
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                            <div className="flex flex-col min-w-0 justify-center">
                                <div className="flex items-center gap-2">
                                    {isGenerating && (!project.projectName || project.projectName === "Untitled Project" || project.projectName === "Project") ? (
                                        <h1 className="text-sm font-semibold tracking-tight text-slate-200 animate-pulse truncate">
                                            Flowro is cooking...
                                        </h1>
                                    ) : (
                                        <h1 className="text-sm font-semibold tracking-tight text-slate-200 truncate max-w-[160px] sm:max-w-none">
                                            {project.projectName} <span className="ml-2 text-[10px] text-slate-500 font-medium uppercase"></span>
                                        </h1>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={() => setIsUBPViewerOpen(true)}
                                className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all text-xs font-medium"
                                title="Blueprint"
                            >
                                <span className="material-symbols-outlined text-[16px] text-slate-400 group-hover:text-slate-200 transition-colors">description</span>
                                <span className="hidden md:inline">Blueprint</span>
                                {project.latestBlueprint && (
                                    <span className="hidden lg:inline-flex items-center justify-center px-1.5 py-0.5 rounded-[4px] bg-white/10 text-slate-300 text-[10px] font-medium">
                                        v{project.latestBlueprint.version}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                        <button
                            onClick={() => setIsShareModalOpen(true)}
                            className="flex items-center justify-center size-8 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all"
                            title="Share Project"
                        >
                            <span className="material-symbols-outlined text-base">ios_share</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Chat Panel */}
            <ChatPanel
                project={project}
                currentUBP={currentUBP}
                isGenerating={isGenerating}
                isStreaming={isStreaming}
                streamedContent={streamedContent}
                thinkingPhase={thinkingPhase}
                generationMode={generationMode}
                message={message}
                error={error}
                selectionContext={selectionContext}
                onMessageChange={setMessage}
                onSendMessage={onSendMessage}
                onOpenBlueprint={() => setIsUBPViewerOpen(true)}
                onApplyProposedChanges={onApplyProposedChanges}
                onClearContext={() => setSelectionContext(null)}
                onQuickAction={handleQuickAction}
                onRetry={handleRetry}
            />

            {/* UBP Viewer Side Panel */}
            <UBPViewer
                isOpen={isUBPViewerOpen}
                onClose={() => setIsUBPViewerOpen(false)}
                ubp={currentUBP}
                projectName={project.projectName}
                projectDescription={project.description}
                version={selectedBlueprint?.version || project.latestBlueprint?.version || "0.1"}
                status={selectedBlueprint?.status || project.latestBlueprint?.status || "draft"}
                createdAt={selectedBlueprint?.createdAt || project.latestBlueprint?.createdAt}
                lockedAt={selectedBlueprint?.lockedAt || project.latestBlueprint?.lockedAt}
                lastUpdated={selectedBlueprint?.createdAt
                    ? new Date(selectedBlueprint.createdAt).toLocaleDateString()
                    : project.latestBlueprint?.createdAt
                        ? new Date(project.latestBlueprint.createdAt).toLocaleDateString()
                        : undefined
                }
                onSaveVersion={selectedBlueprint?.status === "draft" ? handleSaveVersion : undefined}
                isSaving={isSaving}
                allVersions={allVersions}
                onVersionSelect={handleVersionSelect}
                currentBlueprintId={selectedBlueprint?.id || project.latestBlueprint?.id}
                projectId={projectId}
                onUpdate={updateBlueprint}
                onEnhance={handleEnhanceWithFlowro}
            />

            <ShareProjectModal
                isOpen={isShareModalOpen}
                projectId={projectId}
                projectName={project.projectName}
                onClose={() => setIsShareModalOpen(false)}
                getToken={async () => user.getIdToken()}
            />
        </div>
    )
}
