import type { PRDEntity, PRDFlow } from "@/lib/prd/schema"

function cleanId(value: string): string {
    const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")
    return normalized || "item"
}

function escapeLabel(value: string): string {
    return value
        .replace(/"/g, "'")
        .replace(/\n+/g, " ")
        .replace(/</g, "(")
        .replace(/>/g, ")")
        .trim()
}

function wrapText(lines: string[]): string {
    return lines.filter(Boolean).map(escapeLabel).join("<br/>")
}

export function mapPRDFlowsToMermaid(flows: PRDFlow[]): string {
    const lines = [
        "flowchart TD",
        "classDef flowNode fill:#0f1722,stroke:#2f8fff,stroke-width:1px,color:#e2ecf7;",
        "classDef flowEnd fill:#13263b,stroke:#7dd3fc,stroke-width:1px,color:#f8fbff;",
    ]

    for (const flow of flows) {
        const flowKey = cleanId(flow.id || flow.name)
        lines.push(`subgraph ${flowKey}[\"${escapeLabel(flow.name || "Untitled flow")}\"]`)

        flow.steps.forEach((step, index) => {
            const stepId = `${flowKey}-${cleanId(step.id || `step-${index + 1}`)}`
            const label = wrapText([
                `${index + 1}. ${step.screen || "Untitled screen"}`,
                step.action || "Action pending",
                step.actor ? `Actor: ${step.actor}` : "",
                step.outcome ? `Outcome: ${step.outcome}` : "",
            ])

            lines.push(`${stepId}[\"${label}\"]`)
            lines.push(`class ${stepId} ${index === flow.steps.length - 1 ? "flowEnd" : "flowNode"}`)
        })

        flow.steps.forEach((step, index) => {
            const fromId = `${flowKey}-${cleanId(step.id || `step-${index + 1}`)}`
            const fallbackNext = flow.steps[index + 1]
            const explicitNext = step.nextStepId
                ? flow.steps.find((candidate) => candidate.id === step.nextStepId)
                : undefined
            const next = explicitNext || fallbackNext

            if (!next) {
                return
            }

            const toIndex = flow.steps.findIndex((candidate) => candidate.id === next.id)
            const toId = `${flowKey}-${cleanId(next.id || `step-${toIndex + 1}`)}`
            const edgeLabel = step.outcome ? `|\"${escapeLabel(step.outcome)}\"|` : ""
            lines.push(`${fromId} -->${edgeLabel} ${toId}`)
        })

        lines.push("end")
    }

    return lines.join("\n")
}

export function mapPRDEntitiesToMermaid(entities: PRDEntity[]): string {
    const lines = ["erDiagram"]
    const relationships = new Set<string>()

    if (entities.length === 0) {
        lines.push('PLACEHOLDER {')
        lines.push("  string message")
        lines.push("}")
        return lines.join("\n")
    }

    for (const entity of entities) {
        lines.push(`${cleanId(entity.name).toUpperCase()} {`)

        if (entity.fields.length === 0) {
            lines.push("  string empty")
        }

        for (const field of entity.fields) {
            const marker = field.required ? "required" : "optional"
            lines.push(`  ${cleanId(field.type || "string")} ${cleanId(field.name || "field")} "${marker}"`)

            if (field.relationshipTo) {
                const source = cleanId(entity.name).toUpperCase()
                const target = cleanId(field.relationshipTo).toUpperCase()
                relationships.add(`${source} }o--|| ${target} : "${escapeLabel(field.name || "relation")}"`)
            }
        }

        lines.push("}")
    }

    relationships.forEach((relationship) => {
        lines.push(relationship)
    })

    return lines.join("\n")
}
