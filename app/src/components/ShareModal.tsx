"use client"

import { useState } from "react"
import { useAuth } from "./Providers"

interface ShareModalProps {
    isOpen: boolean
    onClose: () => void
    blueprintId: string
    projectId: string
    projectName: string
}

export default function ShareModal({
    isOpen,
    onClose,
    blueprintId,
    projectId,
    projectName,
}: ShareModalProps) {
    const { user } = useAuth()
    const [shareUrl, setShareUrl] = useState<string>("")
    const [isGenerating, setIsGenerating] = useState(false)
    const [isCopied, setIsCopied] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [viewCount, setViewCount] = useState<number>(0)

    // Generate share link when modal opens
    const handleGenerateLink = async () => {
        if (!user) {
            setError("You must be logged in to share blueprints")
            return
        }

        setIsGenerating(true)
        setError(null)

        try {
            const token = await user.getIdToken()
            const response = await fetch("/api/share", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    blueprintId,
                    projectId,
                }),
            })

            if (!response.ok) {
                throw new Error("Failed to generate share link")
            }

            const data = await response.json()
            setShareUrl(data.shareUrl)
            setViewCount(data.shareToken.viewCount || 0)
        } catch (err) {
            console.error("Generate share link error:", err)
            setError(err instanceof Error ? err.message : "Failed to generate share link")
        } finally {
            setIsGenerating(false)
        }
    }

    // Copy to clipboard
    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl)
            setIsCopied(true)
            setTimeout(() => setIsCopied(false), 2000)
        } catch (err) {
            console.error("Copy to clipboard error:", err)
            setError("Failed to copy link")
        }
    }

    // Auto-generate link when modal opens
    if (isOpen && !shareUrl && !isGenerating && !error) {
        handleGenerateLink()
    }

    if (!isOpen) return null

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-[#1f2937] border border-[#283039] rounded-xl shadow-2xl z-[70] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#283039] bg-[#111418]">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#137fec]">share</span>
                        Share Blueprint
                    </h2>
                    <button
                        onClick={onClose}
                        className="flex items-center justify-center rounded-lg p-2 text-[#9dabb9] transition-colors hover:bg-white/10 hover:text-white"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    <p className="text-[#d0d6dc] text-sm">
                        Anyone with this link can view <strong>{projectName}</strong> blueprint (read-only)
                    </p>

                    {/* Loading State */}
                    {isGenerating && (
                        <div className="flex items-center justify-center py-8">
                            <span className="material-symbols-outlined text-[#137fec] text-4xl animate-spin">
                                progress_activity
                            </span>
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    )}

                    {/* Share URL */}
                    {shareUrl && !isGenerating && (
                        <>
                            <div className="bg-[#111418] border border-[#283039] rounded-lg p-4 flex items-center gap-3">
                                <input
                                    type="text"
                                    value={shareUrl}
                                    readOnly
                                    className="flex-1 bg-transparent text-[#d0d6dc] text-sm focus:outline-none"
                                />
                                <button
                                    onClick={handleCopyLink}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${isCopied
                                            ? "bg-green-500/20 text-green-400"
                                            : "bg-[#137fec] hover:bg-blue-600 text-white"
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-[18px]">
                                        {isCopied ? "check" : "content_copy"}
                                    </span>
                                    {isCopied ? "Copied!" : "Copy"}
                                </button>
                            </div>

                            {/* Stats */}
                            <div className="flex items-center gap-4 text-sm text-[#9dabb9]">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[16px]">visibility</span>
                                    <span>{viewCount} views</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[16px]">schedule</span>
                                    <span>Never expires</span>
                                </div>
                            </div>

                            {/* Info */}
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                                <p className="text-blue-400 text-sm flex items-start gap-2">
                                    <span className="material-symbols-outlined text-[18px] mt-0.5">info</span>
                                    <span>
                                        Viewers will see a read-only version with a &quot;Create your own blueprint&quot; call-to-action
                                    </span>
                                </p>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#283039] bg-[#111418]">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-[#9dabb9] hover:text-white hover:bg-white/10 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </>
    )
}
