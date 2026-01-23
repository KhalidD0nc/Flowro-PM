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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transformContent = (content: unknown): UBPContent => {
        if (!content) return {} as UBPContent

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const apiData = content as any

        // Transform productVision
        const productVision = apiData.productVision ? {
            description: apiData.productVision.problem || apiData.productVision.description,
            primaryGoal: apiData.productVision.successSignal || apiData.productVision.primaryGoal,
            targetAudience: apiData.productVision.targetActor || apiData.productVision.targetAudience
        } : undefined

        // Transform actors from API format to array format
        let actors: { name: string; description: string; icon?: string }[] | undefined
        if (apiData.actors) {
            if (Array.isArray(apiData.actors)) {
                actors = apiData.actors
            } else {
                // Convert object format to array
                actors = []
                if (apiData.actors.primary) {
                    actors.push({ name: apiData.actors.primary, description: "Primary user", icon: "person" })
                }
                if (apiData.actors.secondary && Array.isArray(apiData.actors.secondary)) {
                    apiData.actors.secondary.forEach((s: string) => {
                        actors!.push({ name: s, description: "Support role", icon: "group" })
                    })
                }
                if (apiData.actors.systems && Array.isArray(apiData.actors.systems)) {
                    apiData.actors.systems.forEach((s: string) => {
                        actors!.push({ name: s, description: "External system", icon: "smart_toy" })
                    })
                }
            }
        }

        // Transform behaviors
        const behaviors = apiData.behaviors?.map((b: { id?: string; trigger?: string; systemResponse?: string; title?: string; given?: string; when?: string; then?: string; diagramCode?: string; diagram?: string; priority?: string }) => ({
            id: b.id || "BH-01",
            title: b.title || b.systemResponse || "Behavior",
            priority: b.priority,
            given: b.given || (b.trigger ? `User triggers: ${b.trigger}` : undefined),
            when: b.when || b.trigger,
            then: b.then || b.systemResponse,
            diagram: b.diagram || b.diagramCode
        }))

        // Transform constraints from constraintsRisks
        let constraints: { type: "warning" | "risk"; title: string; description: string }[] | undefined
        if (apiData.constraints && Array.isArray(apiData.constraints)) {
            constraints = apiData.constraints
        } else if (apiData.constraintsRisks) {
            constraints = []
            if (apiData.constraintsRisks.constraints) {
                apiData.constraintsRisks.constraints.forEach((c: string) => {
                    constraints!.push({ type: "warning", title: "Constraint", description: c })
                })
            }
            if (apiData.constraintsRisks.risks) {
                apiData.constraintsRisks.risks.forEach((r: string) => {
                    constraints!.push({ type: "risk", title: "Risk", description: r })
                })
            }
        }

        // Transform techStack to techDecisions
        let techDecisions: { category: string; choice: string }[] | undefined
        if (apiData.techDecisions && Array.isArray(apiData.techDecisions)) {
            techDecisions = apiData.techDecisions
        } else if (apiData.techStack) {
            techDecisions = Object.entries(apiData.techStack).map(([category, choice]) => ({
                category: category.charAt(0).toUpperCase() + category.slice(1),
                choice: String(choice)
            }))
        }

        // Transform phases
        const phases = apiData.phases?.map((p: { phase?: string; name?: string; goal?: string; description?: string; outputs?: string[]; timeline?: string; status?: string }, i: number) => ({
            name: p.name || p.phase || `Phase ${i + 1}`,
            timeline: p.timeline,
            description: p.description || p.goal || (p.outputs ? p.outputs.join(", ") : ""),
            status: p.status || (i === 0 ? "current" : "upcoming") as "completed" | "current" | "upcoming"
        }))

        // Transform integrations
        const integrations = apiData.integrations?.map((i: { service?: string; system?: string; purpose?: string; dataFlow?: string; method?: string }) => ({
            system: i.system || i.service || "External Service",
            method: i.method || i.dataFlow || "API",
            purpose: i.purpose || ""
        }))

        // Transform changelog
        let changelog: { version: string; title: string; description: string; timestamp?: string }[] | undefined
        if (apiData.changelog && Array.isArray(apiData.changelog)) {
            changelog = apiData.changelog
        } else if (apiData.changeLog && Array.isArray(apiData.changeLog)) {
            changelog = apiData.changeLog.map((c: { version?: string; summary?: string; reason?: string; title?: string; description?: string; timestamp?: string }) => ({
                version: c.version || "0.1",
                title: c.title || c.summary || "Update",
                description: c.description || c.reason || "",
                timestamp: c.timestamp || "Just now"
            }))
        }

        return {
            productVision,
            scope: apiData.scope,
            actors,
            behaviors,
            constraints,
            techDecisions,
            phases,
            integrations,
            changelog
        }
    }

    const transformedContent = transformContent(data.blueprint.content)

    // Success state - show UBPViewer in readOnly mode
    return (
        <div className="min-h-screen bg-[#0d141c]">
            {/* Render UBPViewer in read-only mode, always open */}
            <UBPViewer
                isOpen={true}
                onClose={() => { }} // Disable close in public view
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
