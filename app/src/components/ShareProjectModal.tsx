"use client"

import { useState, useEffect, useRef } from "react"

interface ProjectShare {
    odurId?: string
    email: string
    role: "editor" | "viewer"
    invitedAt: string
    acceptedAt?: string
}

interface ShareSettings {
    visibility: "private" | "shared"
    sharedWith: ProjectShare[]
    publicLinkEnabled: boolean
    publicLinkId?: string
}

interface ShareProjectModalProps {
    isOpen: boolean
    projectId: string
    projectName: string
    onClose: () => void
    getToken: () => Promise<string>
}

export default function ShareProjectModal({
    isOpen,
    projectId,
    projectName,
    onClose,
    getToken,
}: ShareProjectModalProps) {
    const [settings, setSettings] = useState<ShareSettings | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Invite form state
    const [email, setEmail] = useState("")
    const [role, setRole] = useState<"editor" | "viewer">("viewer")
    const [isInviting, setIsInviting] = useState(false)

    // Public link state
    const [isTogglingLink, setIsTogglingLink] = useState(false)
    const [copied, setCopied] = useState(false)

    const emailInputRef = useRef<HTMLInputElement>(null)

    // Fetch share settings when modal opens
    useEffect(() => {
        if (!isOpen) {
            setSettings(null)
            setLoading(true)
            setError(null)
            setEmail("")
            return
        }

        async function fetchSettings() {
            try {
                const token = await getToken()
                const res = await fetch(`/api/projects/${projectId}/share`, {
                    headers: { Authorization: `Bearer ${token}` },
                })

                if (!res.ok) {
                    throw new Error("Failed to load share settings")
                }

                const data = await res.json()
                setSettings(data)
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load")
            } finally {
                setLoading(false)
            }
        }

        fetchSettings()
    }, [isOpen, projectId, getToken])

    // Handle ESC key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                onClose()
            }
        }
        document.addEventListener("keydown", handleKeyDown)
        return () => document.removeEventListener("keydown", handleKeyDown)
    }, [isOpen, onClose])

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email.trim() || isInviting) return

        setIsInviting(true)
        setError(null)

        try {
            const token = await getToken()
            const res = await fetch(`/api/projects/${projectId}/share`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email: email.trim(), role }),
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || "Failed to invite")
            }

            const data = await res.json()

            // Add to local state
            setSettings(prev => prev ? {
                ...prev,
                visibility: "shared",
                sharedWith: [...prev.sharedWith, data.share],
            } : null)

            setEmail("")
            emailInputRef.current?.focus()
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to invite")
        } finally {
            setIsInviting(false)
        }
    }

    const handleRemoveShare = async (shareEmail: string) => {
        try {
            const token = await getToken()
            const res = await fetch(`/api/projects/${projectId}/share`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email: shareEmail }),
            })

            if (!res.ok) {
                throw new Error("Failed to remove")
            }

            // Update local state
            setSettings(prev => {
                if (!prev) return null
                const updated = prev.sharedWith.filter(s => s.email !== shareEmail)
                return {
                    ...prev,
                    sharedWith: updated,
                    visibility: updated.length > 0 ? "shared" : "private",
                }
            })
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to remove")
        }
    }

    const handleTogglePublicLink = async () => {
        if (isTogglingLink || !settings) return

        setIsTogglingLink(true)
        try {
            const token = await getToken()
            const res = await fetch(`/api/projects/${projectId}/share`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ publicLink: !settings.publicLinkEnabled }),
            })

            if (!res.ok) {
                throw new Error("Failed to toggle link")
            }

            const data = await res.json()
            setSettings(prev => prev ? {
                ...prev,
                publicLinkEnabled: data.publicLinkEnabled,
                publicLinkId: data.publicLinkId,
            } : null)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to toggle")
        } finally {
            setIsTogglingLink(false)
        }
    }

    const copyPublicLink = () => {
        if (!settings?.publicLinkId) return

        const url = `${window.location.origin}/share/${settings.publicLinkId}`
        navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
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
            <div className="relative w-full max-w-md mx-4 rounded-2xl border border-[#283039] bg-[#18212b]/95 p-6 shadow-2xl shadow-black/40 max-h-[90vh] overflow-y-auto">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 rounded-lg p-2 text-[#9dabb9] transition-colors hover:bg-white/10 hover:text-white"
                >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                </button>

                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="flex size-10 items-center justify-center rounded-lg bg-[#137fec]/10">
                            <span className="material-symbols-outlined text-[#137fec]">share</span>
                        </div>
                        <h2 className="text-xl font-bold text-white">Share Project</h2>
                    </div>
                    <p className="text-sm text-[#9dabb9] truncate">{projectName}</p>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <span className="material-symbols-outlined text-[#137fec] animate-spin text-2xl">
                            progress_activity
                        </span>
                    </div>
                ) : (
                    <>
                        {/* Error message */}
                        {error && (
                            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
                                <span className="material-symbols-outlined text-[18px]">error</span>
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Invite by email */}
                        <form onSubmit={handleInvite} className="mb-6">
                            <label className="block text-sm font-medium text-[#9dabb9] mb-2">
                                Invite by email
                            </label>
                            <div className="flex gap-2">
                                <input
                                    ref={emailInputRef}
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="colleague@company.com"
                                    className="flex-1 rounded-lg border border-[#283039] bg-[#101922] px-3 py-2 text-sm text-white placeholder-[#9dabb9]/60 focus:border-[#137fec] focus:ring-1 focus:ring-[#137fec] focus:outline-none"
                                    disabled={isInviting}
                                />
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value as "editor" | "viewer")}
                                    className="rounded-lg border border-[#283039] bg-[#101922] px-3 py-2 text-sm text-white focus:border-[#137fec] focus:outline-none"
                                    disabled={isInviting}
                                >
                                    <option value="viewer">Viewer</option>
                                    <option value="editor">Editor</option>
                                </select>
                                <button
                                    type="submit"
                                    disabled={!email.trim() || isInviting}
                                    className="rounded-lg bg-[#137fec] px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isInviting ? (
                                        <span className="material-symbols-outlined animate-spin text-[18px]">
                                            progress_activity
                                        </span>
                                    ) : (
                                        "Invite"
                                    )}
                                </button>
                            </div>
                        </form>

                        {/* Shared with list */}
                        {settings?.sharedWith && settings.sharedWith.length > 0 && (
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-[#9dabb9] mb-2">
                                    Shared with
                                </label>
                                <div className="space-y-2">
                                    {settings.sharedWith.map((share) => (
                                        <div
                                            key={share.email}
                                            className="flex items-center justify-between rounded-lg border border-[#283039] bg-[#101922] px-3 py-2"
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="flex size-8 items-center justify-center rounded-full bg-[#283039]">
                                                    <span className="material-symbols-outlined text-[16px] text-[#9dabb9]">
                                                        person
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-white">{share.email}</p>
                                                    <p className="text-xs text-[#9dabb9] capitalize">{share.role}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveShare(share.email)}
                                                className="rounded-lg p-1.5 text-[#9dabb9] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                                title="Remove access"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">close</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Public link */}
                        <div className="border-t border-[#283039] pt-4">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <p className="text-sm font-medium text-white">Public link</p>
                                    <p className="text-xs text-[#9dabb9]">Anyone with the link can view</p>
                                </div>
                                <button
                                    onClick={handleTogglePublicLink}
                                    disabled={isTogglingLink}
                                    className={`relative w-11 h-6 rounded-full transition-colors ${
                                        settings?.publicLinkEnabled
                                            ? "bg-[#137fec]"
                                            : "bg-[#283039]"
                                    }`}
                                >
                                    <span
                                        className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                                            settings?.publicLinkEnabled ? "translate-x-5" : ""
                                        }`}
                                    />
                                </button>
                            </div>

                            {settings?.publicLinkEnabled && settings.publicLinkId && (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={`${typeof window !== 'undefined' ? window.location.origin : ''}/share/${settings.publicLinkId}`}
                                        className="flex-1 rounded-lg border border-[#283039] bg-[#101922] px-3 py-2 text-sm text-[#9dabb9] focus:outline-none"
                                    />
                                    <button
                                        onClick={copyPublicLink}
                                        className="rounded-lg border border-[#283039] bg-[#101922] px-3 py-2 text-sm text-white hover:bg-[#283039] transition-colors"
                                    >
                                        {copied ? (
                                            <span className="material-symbols-outlined text-[18px] text-green-400">check</span>
                                        ) : (
                                            <span className="material-symbols-outlined text-[18px]">content_copy</span>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
