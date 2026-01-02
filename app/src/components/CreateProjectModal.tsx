"use client"

import { useState, useEffect, useRef } from "react"

interface CreateProjectModalProps {
    isOpen: boolean
    onClose: () => void
    onCreateProject: (projectName: string, description?: string) => Promise<void>
}

export default function CreateProjectModal({
    isOpen,
    onClose,
    onCreateProject,
}: CreateProjectModalProps) {
    const [projectName, setProjectName] = useState("")
    const [description, setDescription] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)
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
            if (e.key === "Escape" && isOpen) {
                onClose()
            }
        }

        document.addEventListener("keydown", handleKeyDown)
        return () => document.removeEventListener("keydown", handleKeyDown)
    }, [isOpen, onClose])

    // Reset form when modal closes
    useEffect(() => {
        if (!isOpen) {
            setProjectName("")
            setDescription("")
            setError(null)
            setIsLoading(false)
        }
    }, [isOpen])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        // Validate project name
        const trimmedName = projectName.trim()
        if (!trimmedName) {
            setError("Project name is required")
            return
        }

        if (trimmedName.length < 2) {
            setError("Project name must be at least 2 characters")
            return
        }

        if (trimmedName.length > 100) {
            setError("Project name must be less than 100 characters")
            return
        }

        setIsLoading(true)

        try {
            await onCreateProject(trimmedName, description.trim() || undefined)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create project")
            setIsLoading(false)
        }
    }

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose()
        }
    }

    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={handleBackdropClick}
        >
            <div
                ref={modalRef}
                className="relative w-full max-w-lg mx-4 rounded-2xl border border-[#283039] bg-[#18212b]/95 p-8 shadow-2xl shadow-black/40"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 rounded-lg p-2 text-[#9dabb9] transition-colors hover:bg-white/10 hover:text-white"
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
                            Create New Project
                        </h2>
                    </div>
                    <p className="text-sm text-[#9dabb9]">
                        Start building your Unified Blueprint
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    {/* Project Name Field */}
                    <div className="flex flex-col gap-2">
                        <label htmlFor="projectName" className="text-sm font-medium text-[#9dabb9]">
                            Project Name <span className="text-red-400">*</span>
                        </label>
                        <input
                            ref={inputRef}
                            id="projectName"
                            type="text"
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            placeholder="e.g., E-commerce Platform, Mobile App..."
                            className="h-12 w-full rounded-lg border border-[#283039] bg-[#101922] px-4 text-base font-normal text-white placeholder-[#9dabb9]/60 transition-colors focus:border-[#137fec] focus:ring-1 focus:ring-[#137fec] focus:outline-none"
                            disabled={isLoading}
                            autoComplete="off"
                        />
                    </div>

                    {/* Description Field */}
                    <div className="flex flex-col gap-2">
                        <label htmlFor="description" className="text-sm font-medium text-[#9dabb9]">
                            Description <span className="text-[#9dabb9]/60">(optional)</span>
                        </label>
                        <textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Briefly describe what you're building..."
                            rows={3}
                            className="w-full rounded-lg border border-[#283039] bg-[#101922] px-4 py-3 text-base font-normal text-white placeholder-[#9dabb9]/60 transition-colors focus:border-[#137fec] focus:ring-1 focus:ring-[#137fec] focus:outline-none resize-none"
                            disabled={isLoading}
                        />
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
                            <span className="material-symbols-outlined text-[18px]">error</span>
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="h-10 cursor-pointer rounded-lg border border-[#283039] bg-transparent px-5 text-sm font-medium text-[#9dabb9] transition-colors hover:bg-white/5 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || !projectName.trim()}
                            className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#137fec] px-6 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#137fec]"
                        >
                            {isLoading ? (
                                <>
                                    <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                                    <span>Creating...</span>
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-[18px]">add</span>
                                    <span>Create Project</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
