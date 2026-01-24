"use client"

import { useState, useEffect, useRef } from "react"

interface CreateProjectModalProps {
    isOpen: boolean
    onClose: () => void
    onCreateProject: (prompt: string) => Promise<void>
}

// Example prompts for inspiration
const examplePrompts = [
    "A habit tracker app for remote workers",
    "An AI-powered email summarizer for busy executives",
    "A marketplace connecting local artisans with customers"
]

// Loading phases for multi-step indicator
const loadingPhases = [
    { icon: "folder_open", text: "Creating project..." },
    { icon: "psychology", text: "Analyzing your idea..." },
    { icon: "auto_awesome", text: "Generating blueprint..." }
]

export default function CreateProjectModal({
    isOpen,
    onClose,
    onCreateProject,
}: CreateProjectModalProps) {
    const [prompt, setPrompt] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [loadingPhase, setLoadingPhase] = useState(0)
    const [error, setError] = useState<string | null>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)
    const modalRef = useRef<HTMLDivElement>(null)

    // Focus the input when modal opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus()
        }
    }, [isOpen])

    // Handle ESC key to close modal
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen && !isLoading) {
                setPrompt("")
                setError(null)
                setIsLoading(false)
                setLoadingPhase(0)
                onClose()
            }
        }

        document.addEventListener("keydown", handleKeyDown)
        return () => document.removeEventListener("keydown", handleKeyDown)
    }, [isOpen, isLoading, onClose])

    // Cycle through loading phases
    useEffect(() => {
        if (!isLoading) return

        const timer = setInterval(() => {
            setLoadingPhase(p => Math.min(p + 1, loadingPhases.length - 1))
        }, 2000)
        return () => clearInterval(timer)
    }, [isLoading])

    const handleCloseWrapper = () => {
        setPrompt("")
        setError(null)
        setIsLoading(false)
        setLoadingPhase(0)
        onClose()
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        // Validate prompt
        const trimmedPrompt = prompt.trim()
        if (!trimmedPrompt) {
            setError("Please tell me what you want to build.")
            return
        }

        setIsLoading(true)

        try {
            // Pass the prompt to create project
            await onCreateProject(trimmedPrompt)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create project")
            setIsLoading(false)
            setLoadingPhase(0)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Submit on Cmd/Ctrl + Enter
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault()
            if (prompt.trim() && !isLoading) {
                handleSubmit(e)
            }
        }
    }

    const handleExampleClick = (example: string) => {
        setPrompt(example)
        inputRef.current?.focus()
    }

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget && !isLoading) {
            handleCloseWrapper()
        }
    }

    if (!isOpen) return null

    const currentPhase = loadingPhases[loadingPhase]

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={handleBackdropClick}
        >
            <div
                ref={modalRef}
                className="relative w-full max-w-lg mx-4 rounded-2xl border border-[#283039] bg-[#18212b]/95 p-6 md:p-8 shadow-2xl shadow-black/40"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
            >
                {/* Close button */}
                <button
                    onClick={handleCloseWrapper}
                    disabled={isLoading}
                    className="absolute top-4 right-4 rounded-lg p-2 text-[#9dabb9] transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Close modal"
                >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                </button>

                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="flex size-10 items-center justify-center rounded-lg bg-[#137fec]/10">
                            <span className="material-symbols-outlined text-[#137fec]">add_circle</span>
                        </div>
                        <h2 id="modal-title" className="text-2xl font-bold text-white">
                            New Project
                        </h2>
                    </div>
                    <p className="text-sm text-[#9dabb9]">
                        What do you want to build today?
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {/* Prompt Field */}
                    <div className="flex flex-col gap-2">
                        <textarea
                            ref={inputRef}
                            id="prompt"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Describe your project idea in detail..."
                            rows={6}
                            className="w-full rounded-lg border border-[#283039] bg-[#101922] px-4 py-3 text-base font-normal text-white placeholder-[#9dabb9]/60 transition-colors focus:border-[#137fec] focus:ring-1 focus:ring-[#137fec] focus:outline-none resize-none"
                            disabled={isLoading}
                        />
                        {/* Helper text */}
                        <p className="text-xs text-[#9dabb9]/70">
                            💡 Tip: Describe your target users and 2-3 key features for the best results
                        </p>
                    </div>

                    {/* Example Prompts */}
                    {!isLoading && (
                        <div className="flex flex-col gap-2">
                            <p className="text-xs font-medium text-[#9dabb9]">Try an example:</p>
                            <div className="flex flex-wrap gap-2">
                                {examplePrompts.map((example, index) => (
                                    <button
                                        key={index}
                                        type="button"
                                        onClick={() => handleExampleClick(example)}
                                        className="text-xs px-3 py-1.5 rounded-full border border-[#283039] bg-[#101922] text-[#9dabb9] hover:border-[#137fec]/50 hover:text-white transition-colors"
                                    >
                                        {example}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Loading Progress Indicator */}
                    {isLoading && (
                        <div className="flex flex-col gap-3 py-2">
                            <div className="flex items-center gap-3">
                                <div className="flex size-8 items-center justify-center rounded-lg bg-[#137fec]/20">
                                    <span className="material-symbols-outlined text-[#137fec] text-[18px] animate-pulse">
                                        {currentPhase.icon}
                                    </span>
                                </div>
                                <span className="text-sm text-white font-medium">{currentPhase.text}</span>
                            </div>
                            {/* Progress dots */}
                            <div className="flex items-center gap-2 ml-11">
                                {loadingPhases.map((_, index) => (
                                    <div
                                        key={index}
                                        className={`h-1.5 rounded-full transition-all duration-300 ${index <= loadingPhase
                                            ? "w-6 bg-[#137fec]"
                                            : "w-1.5 bg-[#283039]"
                                            }`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
                            <span className="material-symbols-outlined text-[18px]">error</span>
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-2">
                        {/* Keyboard shortcut hint */}
                        <div className="text-xs text-[#9dabb9]/50 hidden sm:block">
                            <kbd className="px-1.5 py-0.5 rounded bg-[#283039] text-[#9dabb9]">⌘</kbd>
                            <span className="mx-1">+</span>
                            <kbd className="px-1.5 py-0.5 rounded bg-[#283039] text-[#9dabb9]">↵</kbd>
                            <span className="ml-1">to submit</span>
                        </div>
                        <div className="flex items-center gap-3 ml-auto">
                            <button
                                type="button"
                                onClick={handleCloseWrapper}
                                disabled={isLoading}
                                className="h-10 cursor-pointer rounded-lg border border-[#283039] bg-transparent px-5 text-sm font-medium text-[#9dabb9] transition-colors hover:bg-white/5 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading || !prompt.trim()}
                                className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#137fec] px-6 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#137fec]"
                            >
                                {isLoading ? (
                                    <>
                                        <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                                        <span>Creating...</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
                                        <span>Create Project</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}
