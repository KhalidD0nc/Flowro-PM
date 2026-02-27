/**
 * UBP Transform Utilities
 * 
 * Handles transformation between raw AI/API output and the UBPContent
 * format that the UBP viewer expects. This is the single canonical
 * location for these transforms — previously duplicated in ChatView.tsx.
 */

import type { UBPContent } from "@/components/UBPViewer"

// =============================================================================
// Transform: API → UBPContent
// =============================================================================

/**
 * Transform raw AI/API data into the structured UBPContent format.
 * 
 * Handles multiple naming conventions the AI may use:
 * - productVision.problem → description
 * - productVision.successSignal → primaryGoal
 * - productVision.targetActor → targetAudience
 * - constraintsRisks → constraints
 * - techStack → techDecisions
 * - changeLog → changelog
 * 
 * Also normalizes nested structures like actors (object → array).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function transformApiToUBP(apiData: any): UBPContent {
    const productVision = apiData.productVision ? {
        description: apiData.productVision.problem || apiData.productVision.description,
        primaryGoal: apiData.productVision.successSignal || apiData.productVision.primaryGoal,
        targetAudience: apiData.productVision.targetActor || apiData.productVision.targetAudience
    } : undefined

    let actors: { name: string; description: string; icon?: string }[] | undefined
    if (apiData.actors) {
        if (Array.isArray(apiData.actors)) {
            actors = apiData.actors
        } else {
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

    const behaviors = apiData.behaviors?.map((b: { id?: string; trigger?: string; systemResponse?: string; title?: string; given?: string; when?: string; then?: string; diagramCode?: string; diagram?: string; priority?: string }) => ({
        id: b.id || "BH-01",
        title: b.title || b.systemResponse || "Behavior",
        priority: b.priority,
        given: b.given || (b.trigger ? `User triggers: ${b.trigger}` : undefined),
        when: b.when || b.trigger,
        then: b.then || b.systemResponse,
        diagram: b.diagram || b.diagramCode
    }))

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

    let techDecisions: { category: string; choice: string }[] | undefined
    if (apiData.techDecisions && Array.isArray(apiData.techDecisions)) {
        techDecisions = apiData.techDecisions
    } else if (apiData.techStack) {
        techDecisions = Object.entries(apiData.techStack).map(([category, choice]) => ({
            category: category.charAt(0).toUpperCase() + category.slice(1),
            choice: String(choice)
        }))
    }

    const phases = apiData.phases?.map((p: { phase?: string; name?: string; goal?: string; description?: string; outputs?: string[]; timeline?: string; status?: string }, i: number) => ({
        name: p.name || p.phase || `Phase ${i + 1}`,
        timeline: p.timeline,
        description: p.description || p.goal || (p.outputs ? p.outputs.join(", ") : ""),
        status: p.status || (i === 0 ? "current" : "upcoming") as "completed" | "current" | "upcoming"
    }))

    const integrations = apiData.integrations?.map((i: { service?: string; system?: string; purpose?: string; dataFlow?: string; method?: string }) => ({
        system: i.system || i.service || "External Service",
        method: i.method || i.dataFlow || "API",
        purpose: i.purpose || ""
    }))

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

// =============================================================================
// Type Guard: isUBPContent
// =============================================================================

/**
 * Check if content has UBP structure (at least one recognized section).
 */
export function isUBPContent(content: unknown): boolean {
    if (!content || typeof content !== "object") return false

    const ubpKeys = [
        "productVision",
        "scope",
        "actors",
        "behaviors",
        "constraints",
        "constraintsRisks",
        "techDecisions",
        "techStack",
        "phases",
        "integrations",
        "changelog",
        "changeLog",
    ]
    const contentObj = content as Record<string, unknown>

    return ubpKeys.some((key) => key in contentObj)
}
