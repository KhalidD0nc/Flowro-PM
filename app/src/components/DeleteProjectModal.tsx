"use client"

import { useEffect, useRef, useState } from "react"

interface DeleteProjectModalProps {
    isOpen: boolean
    onClose: () => void
    onDelete: () => Promise<void>
    projectName: string
    isDeleting: boolean
}

export default function DeleteProjectModal({
    isOpen,
    onClose,
    onDelete,
    projectName,
    isDeleting,
}: DeleteProjectModalProps) {
    const [confirmName, setConfirmName] = useState("")
    const [error, setError] = useState<string | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const modalRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (isOpen) {
            // Reset state when modal opens to prevent accidental deletion
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setConfirmName("")
            setError(null)
            // Use a small timeout to ensure the modal is rendered before focusing
            setTimeout(() => {
                if (inputRef.current) {
                    inputRef.current.focus()
                }
            }, 50)
        }
    }, [isOpen])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen && !isDeleting) {
                onClose()
            }
        }
        document.addEventListener("keydown", handleKeyDown)
        return () => document.removeEventListener("keydown", handleKeyDown)
    }, [isOpen, isDeleting, onClose])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (confirmName !== projectName) {
            setError("Project name does not match")
            return
        }

        try {
            await onDelete()
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete project")
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
                    <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-lg bg-red-500/10">
                            <span className="material-symbols-outlined text-red-500">warning</span>
                        </div>
                        <h2 className="text-xl font-bold text-white">Delete Project</h2>
                    </div>
                </div>

                <div className="mb-6">
                    <p className="text-[#9dabb9] mb-4">
                        This action cannot be undone. This will permanently delete the project <span className="font-bold text-white">&quot;{projectName}&quot;</span> and all associated blueprints and chat history.
                    </p>
                    <p className="text-sm text-[#9dabb9]">
                        Please type <span className="font-bold text-white select-user">{projectName}</span> to confirm.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <input
                        ref={inputRef}
                        type="text"
                        value={confirmName}
                        onChange={(e) => setConfirmName(e.target.value)}
                        className="w-full rounded-lg border border-[#283039] bg-[#101922] px-4 py-2.5 text-white placeholder-[#9dabb9]/60 focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none"
                        placeholder="Type project name to confirm"
                        disabled={isDeleting}
                    />

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
                            disabled={isDeleting}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-[#9dabb9] hover:bg-white/5 hover:text-white transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isDeleting || confirmName !== projectName}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isDeleting ? (
                                <>
                                    <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                                    Deleting...
                                </>
                            ) : (
                                "Delete Project"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
