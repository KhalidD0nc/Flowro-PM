/**
 * Blueprint Export Utilities
 * 
 * Exports blueprints in formats optimized for AI code agents:
 * - JSON: Structured data for programmatic consumption
 * - Markdown: Human-readable with Mermaid diagram code blocks
 */

import type { UBPContent } from "@/components/UBPViewer"

// =============================================================================
// Types
// =============================================================================

export type ExportFormat = "json" | "markdown"

export interface ExportMetadata {
    projectName: string
    projectDescription?: string
    blueprintId: string
    version: string
    status: "draft" | "locked" | "approved"
    createdAt: string
    lockedAt?: string
}

export interface ExportData {
    exportedAt: string
    exportFormat: ExportFormat
    project: {
        name: string
        description?: string
    }
    blueprint: {
        id: string
        version: string
        status: "draft" | "locked" | "approved"
        createdAt: string
        lockedAt?: string
        content: UBPContent | null
    }
}

// =============================================================================
// Main Export Functions
// =============================================================================

/**
 * Export blueprint to specified format
 */
export function exportBlueprint(
    content: UBPContent | null,
    metadata: ExportMetadata,
    format: ExportFormat
): string {
    const exportData: ExportData = {
        exportedAt: new Date().toISOString(),
        exportFormat: format,
        project: {
            name: metadata.projectName,
            description: metadata.projectDescription,
        },
        blueprint: {
            id: metadata.blueprintId,
            version: metadata.version,
            status: metadata.status,
            createdAt: metadata.createdAt,
            lockedAt: metadata.lockedAt,
            content,
        },
    }

    switch (format) {
        case "json":
            return toJSON(exportData)
        case "markdown":
            return toMarkdown(exportData)
        default:
            throw new Error(`Unsupported export format: ${format}`)
    }
}

/**
 * Export as JSON - structured data for AI agents
 */
function toJSON(data: ExportData): string {
    return JSON.stringify(data, null, 2)
}

/**
 * Export as Markdown - readable format with Mermaid diagram code
 */
function toMarkdown(data: ExportData): string {
    const { project, blueprint, exportedAt } = data
    const ubp = blueprint.content
    const lines: string[] = []

    // Header
    lines.push(`# ${project.name}`)
    if (project.description) {
        lines.push(`\n> ${project.description}`)
    }

    // Metadata section
    lines.push(`\n## Metadata`)
    lines.push(`- **Version:** ${blueprint.version}`)
    lines.push(`- **Status:** ${blueprint.status}`)
    lines.push(`- **Created:** ${formatDate(blueprint.createdAt)}`)
    if (blueprint.lockedAt) {
        lines.push(`- **Locked:** ${formatDate(blueprint.lockedAt)}`)
    }
    lines.push(`- **Exported:** ${formatDate(exportedAt)}`)

    if (!ubp) {
        lines.push(`\n---\n\n*No blueprint content available.*`)
        return lines.join("\n")
    }

    lines.push(`\n---`)

    // 1. Product Vision
    if (ubp.productVision) {
        lines.push(`\n## 1. Product Vision`)
        if (ubp.productVision.description) {
            lines.push(`\n${ubp.productVision.description}`)
        }
        if (ubp.productVision.primaryGoal) {
            lines.push(`\n### Primary Goal`)
            lines.push(ubp.productVision.primaryGoal)
        }
        if (ubp.productVision.targetAudience) {
            lines.push(`\n### Target Audience`)
            lines.push(ubp.productVision.targetAudience)
        }
    }

    // 2. Scope
    if (ubp.scope) {
        lines.push(`\n## 2. Scope`)
        if (ubp.scope.inScope && ubp.scope.inScope.length > 0) {
            lines.push(`\n### In Scope`)
            ubp.scope.inScope.forEach((item) => {
                lines.push(`- ${item}`)
            })
        }
        if (ubp.scope.outOfScope && ubp.scope.outOfScope.length > 0) {
            lines.push(`\n### Out of Scope`)
            ubp.scope.outOfScope.forEach((item) => {
                lines.push(`- ${item}`)
            })
        }
    }

    // 3. Actors
    if (ubp.actors && ubp.actors.length > 0) {
        lines.push(`\n## 3. Actors`)
        ubp.actors.forEach((actor) => {
            lines.push(`\n### ${actor.name}`)
            lines.push(actor.description)
        })
    }

    // 4. Behaviors (with Gherkin and Mermaid)
    if (ubp.behaviors && ubp.behaviors.length > 0) {
        lines.push(`\n## 4. Behaviors`)
        ubp.behaviors.forEach((behavior) => {
            lines.push(`\n### ${behavior.id}: ${behavior.title}`)
            if (behavior.priority) {
                lines.push(`**Priority:** ${behavior.priority}`)
            }

            // Gherkin-style specification
            if (behavior.given || behavior.when || behavior.then) {
                lines.push(`\n\`\`\`gherkin`)
                if (behavior.given) lines.push(`GIVEN ${behavior.given}`)
                if (behavior.when) lines.push(`WHEN ${behavior.when}`)
                if (behavior.then) lines.push(`THEN ${behavior.then}`)
                lines.push(`\`\`\``)
            }

            // Mermaid diagram code (not rendered, just code for AI agents)
            if (behavior.diagram) {
                lines.push(`\n\`\`\`mermaid`)
                lines.push(behavior.diagram)
                lines.push(`\`\`\``)
            }
        })
    }

    // 5. Constraints & Risks
    if (ubp.constraints && ubp.constraints.length > 0) {
        lines.push(`\n## 5. Constraints & Risks`)
        ubp.constraints.forEach((constraint) => {
            const icon = constraint.type === "risk" ? "⚠️" : "📋"
            lines.push(`\n### ${icon} ${constraint.title}`)
            lines.push(`**Type:** ${constraint.type}`)
            lines.push(`\n${constraint.description}`)
        })
    }

    // 6. Technology Decisions
    if (ubp.techDecisions && ubp.techDecisions.length > 0) {
        lines.push(`\n## 6. Technology Decisions`)
        lines.push(`\n| Category | Choice |`)
        lines.push(`|----------|--------|`)
        ubp.techDecisions.forEach((tech) => {
            lines.push(`| ${tech.category} | ${tech.choice} |`)
        })
    }

    // 7. Implementation Phases
    if (ubp.phases && ubp.phases.length > 0) {
        lines.push(`\n## 7. Implementation Phases`)
        ubp.phases.forEach((phase, index) => {
            const statusIcon =
                phase.status === "completed" ? "✅" :
                    phase.status === "current" ? "🔄" : "⏳"
            lines.push(`\n### ${statusIcon} Phase ${index + 1}: ${phase.name}`)
            if (phase.timeline) {
                lines.push(`**Timeline:** ${phase.timeline}`)
            }
            lines.push(`\n${phase.description}`)
        })
    }

    // 8. Integration Points
    if (ubp.integrations && ubp.integrations.length > 0) {
        lines.push(`\n## 8. Integration Points`)
        lines.push(`\n| System | Method | Purpose |`)
        lines.push(`|--------|--------|---------|`)
        ubp.integrations.forEach((integration) => {
            lines.push(`| ${integration.system} | \`${integration.method}\` | ${integration.purpose} |`)
        })
    }

    // 9. Change Log
    if (ubp.changelog && ubp.changelog.length > 0) {
        lines.push(`\n## 9. Change Log`)
        ubp.changelog.forEach((entry) => {
            lines.push(`\n### v${entry.version}: ${entry.title}`)
            if (entry.timestamp) {
                lines.push(`*${entry.timestamp}*`)
            }
            lines.push(`\n${entry.description}`)
        })
    }

    return lines.join("\n")
}

// =============================================================================
// Download Utility
// =============================================================================

/**
 * Trigger browser download of exported content
 */
export function downloadBlueprint(
    content: string,
    filename: string,
    format: ExportFormat
): void {
    const mimeTypes: Record<ExportFormat, string> = {
        json: "application/json",
        markdown: "text/markdown",
    }

    const extensions: Record<ExportFormat, string> = {
        json: "json",
        markdown: "md",
    }

    const blob = new Blob([content], { type: mimeTypes[format] })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")

    link.href = url
    link.download = `${filename}.${extensions[format]}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}

/**
 * Generate a safe filename from project name and version
 */
export function generateFilename(projectName: string, version: string): string {
    const safeName = projectName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
    return `${safeName}-v${version}-blueprint`
}

// =============================================================================
// Helpers
// =============================================================================

function formatDate(isoString: string): string {
    try {
        return new Date(isoString).toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        })
    } catch {
        return isoString
    }
}
