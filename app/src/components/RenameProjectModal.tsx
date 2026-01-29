"use client"

import { useState, useEffect, useRef } from "react"

interface RenameProjectModalProps {
    isOpen: boolean
    onClose: () => void
    onRename: (newName: string) => Promise<void>
    currentName: string
    isRenaming: boolean
}

export default function RenameProjectModal({
    isOpen,
    onClose,
    onRename,
    currentName,
    isRenaming,
}: RenameProjectModalProps) {
    const [name, setName] = useState(currentName)
    const [error, setError] = useState<string | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const modalRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (isOpen) {
            setName(currentName)
            setError(null)
            // Use a small timeout to ensure the modal is rendered before focusing
            setTimeout(() => {
                if (inputRef.current) {
                    inputRef.current.focus()
                    inputRef.current.select()
                }
            }, 50)
        }
    }, [isOpen, currentName])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen && !isRenaming) {
                onClose()
            }
        }
        document.addEventListener("keydown", handleKeyDown)
        return () => document.removeEventListener("keydown", handleKeyDown)
    }, [isOpen, isRenaming, onClose])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        const trimmedName = name.trim()
        if (!trimmedName) {
            setError("Project name cannot be empty")
            return
        }

        if (trimmedName === currentName) {
            onClose()
            return
        }

        try {
            await onRename(trimmedName)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to rename project")
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div
                ref={modalRef}
                className="w-full max-w-md mx-4 rounded-xl border border-[#283039] bg-[#18212b] p-6 shadow-2xl"
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white">Rename Project</h2>
                    <button
                        onClick={onClose}
                        disabled={isRenaming}
                        className="text-[#9dabb9] hover:text-white disabled:opacity-50"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <label htmlFor="projectName" className="text-sm font-medium text-[#9dabb9]">
                            Project Name
                        </label>
                        <input
                            ref={inputRef}
                            id="projectName"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full rounded-lg border border-[#283039] bg-[#101922] px-4 py-2.5 text-white placeholder-[#9dabb9]/60 focus:border-[#137fec] focus:ring-1 focus:ring-[#137fec] focus:outline-none"
                            placeholder="Enter project name"
                            disabled={isRenaming}
                        />
                    </div>

                    {error && (
                        <div className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">error</span>
                            {error}
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-3 mt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isRenaming}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-[#9dabb9] hover:bg-white/5 hover:text-white transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isRenaming || !name.trim()}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white bg-[#137fec] hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isRenaming ? (
                                <>
                                    <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                                    Saving...
                                </>
                            ) : (
                                "Save Changes"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
