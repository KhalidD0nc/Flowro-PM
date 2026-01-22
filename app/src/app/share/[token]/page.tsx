"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import UBPViewer, { type UBPContent } from "@/components/UBPViewer"

interface SharedBlueprintData {
    blueprint: {
        id: string
        version: string
        status: "draft" | "locked" | "approved"
        content: UBPContent
        createdAt: string
        lockedAt?: string
    }
    project: {
        projectName: string
        description?: string
    }
    shareData: {
        viewCount: number
        createdAt: string
    }
}

export default function SharedBlueprintPage() {
    const params = useParams()
    const router = useRouter()
    const token = params.token as string

    const [data, setData] = useState<SharedBlueprintData | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function fetchSharedBlueprint() {
            try {
                const response = await fetch(`/api/share/${token}`)

                if (!response.ok) {
                    if (response.status === 404) {
                        setError("This share link has expired or doesn't exist")
                    } else {
                        setError("Failed to load shared blueprint")
                    }
                    return
                }

                const blueprintData = await response.json()
                setData(blueprintData)
            } catch (err) {
                console.error("Fetch shared blueprint error:", err)
                setError("Failed to load shared blueprint")
            } finally {
                setIsLoading(false)
            }
        }

        if (token) {
            fetchSharedBlueprint()
        }
    }, [token])

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0d141c] flex flex-col items-center justify-center">
                <span className="material-symbols-outlined text-[#137fec] text-6xl animate-spin mb-4">
                    progress_activity
                </span>
                <p className="text-[#9dabb9] text-lg">Loading shared blueprint...</p>
            </div>
        )
    }

    // Error state
    if (error || !data) {
        return (
            <div className="min-h-screen bg-[#0d141c] flex flex-col items-center justify-center p-6">
                <div className="max-w-md text-center">
                    <div className="size-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
                        <span className="material-symbols-outlined text-red-500 text-5xl">
                            link_off
                        </span>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-3">
                        {error || "Blueprint Not Found"}
                    </h1>
                    <p className="text-[#9dabb9] mb-6">
                        This share link may have expired, been revoked, or never existed.
                    </p>
                    <a
                        href="/auth"
                        className="inline-flex items-center gap-2 bg-[#137fec] hover:bg-blue-600 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px]">rocket_launch</span>
                        Create Your Own Blueprint
                    </a>
                </div>
            </div>
        )
    }

    // Format dates
    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        })
    }

    // Transform blueprint content if needed (handle both API and UBP formats)
    const transformContent = (content: unknown): UBPContent => {
        if (!content) return {} as UBPContent

        const contentObj = content as Record<string, unknown>

        // If actors is not an array, transform it
        if (contentObj.actors && !Array.isArray(contentObj.actors)) {
            const actors: { name: string; description: string; icon?: string }[] = []
            const actorsObj = contentObj.actors as { primary?: string; secondary?: string[]; systems?: string[] }

            if (actorsObj.primary) {
                actors.push({ name: actorsObj.primary, description: "Primary user", icon: "person" })
            }
            if (actorsObj.secondary && Array.isArray(actorsObj.secondary)) {
                actorsObj.secondary.forEach((s: string) => {
                    actors.push({ name: s, description: "Support role", icon: "group" })
                })
            }
            if (actorsObj.systems && Array.isArray(actorsObj.systems)) {
                actorsObj.systems.forEach((s: string) => {
                    actors.push({ name: s, description: "External system", icon: "smart_toy" })
                })
            }
            contentObj.actors = actors
        }

        return contentObj as UBPContent
    }

    const transformedContent = transformContent(data.blueprint.content)

    // Success state - show UBPViewer in readOnly mode
    return (
        <div className="min-h-screen bg-[#0d141c]">
            {/* Render UBPViewer in read-only mode, always open */}
            <UBPViewer
                isOpen={true}
                onClose={() => {}} // Disable close in public view
                ubp={transformedContent}
                projectName={data.project.projectName}
                projectDescription={data.project.description}
                version={data.blueprint.version}
                status={data.blueprint.status}
                createdAt={data.blueprint.createdAt}
                lockedAt={data.blueprint.lockedAt}
                lastUpdated={formatDate(data.blueprint.lockedAt || data.blueprint.createdAt)}
                currentBlueprintId={data.blueprint.id}
                readOnly={true} // Enable read-only mode with viral CTA
            />
        </div>
    )
}
