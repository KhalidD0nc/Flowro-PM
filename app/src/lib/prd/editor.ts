import type { PRDConfig, PRDFeature, PRDFlow, PRDFlowStep, ProposedPrdChanges } from "@/lib/prd/schema"
import { prdConfigSchema } from "@/lib/prd/schema"

export interface PRDEditorValidationIssue {
    path: string
    message: string
}

export interface PRDEditorSaveState {
    dirty: boolean
    isSaving: boolean
    saveError: string | null
    lastSavedAt: string | null
}

export type ProposalDraftState = "ready" | "stale" | "applied"

function optionalString(value?: string): string | undefined {
    const trimmed = value?.trim()
    return trimmed ? trimmed : undefined
}

export function clonePrdConfig(prd: PRDConfig): PRDConfig {
    return structuredClone(prd)
}

export function createEmptyFlowStep(): PRDFlowStep {
    return {
        id: `step-${Math.random().toString(36).slice(2, 8)}`,
        actor: "",
        screen: "",
        action: "",
        outcome: "",
        nextStepId: "",
    }
}

export function createEmptyFlow(): PRDFlow {
    return {
        id: `flow-${Math.random().toString(36).slice(2, 8)}`,
        name: "",
        steps: [createEmptyFlowStep()],
    }
}

export function createEmptyFeature(): PRDFeature {
    return {
        id: `feature-${Math.random().toString(36).slice(2, 8)}`,
        title: "",
        description: "",
        priority: "must",
        scope: "mvp",
        acceptanceCriteria: [""],
    }
}

export function createEmptyPrdConfig(projectName?: string): PRDConfig {
    return {
        metadata: {
            productName: projectName?.trim() || "Untitled Product",
            platforms: ["web"],
            targetAudience: "",
            designVibe: "",
        },
        entities: [],
        flows: [createEmptyFlow()],
        features: [createEmptyFeature()],
    }
}

export function normalizePrdConfig(prd: PRDConfig): PRDConfig {
    return {
        metadata: {
            productName: prd.metadata.productName.trim(),
            platforms: [...prd.metadata.platforms],
            targetAudience: prd.metadata.targetAudience.trim(),
            designVibe: prd.metadata.designVibe.trim(),
        },
        entities: prd.entities.map((entity) => ({
            name: entity.name.trim(),
            description: optionalString(entity.description),
            fields: entity.fields.map((field) => ({
                name: field.name.trim(),
                type: field.type.trim(),
                required: field.required,
                relationshipTo: optionalString(field.relationshipTo),
            })),
        })),
        flows: prd.flows.map((flow) => ({
            id: flow.id.trim(),
            name: flow.name.trim(),
            steps: flow.steps.map((step) => ({
                id: step.id.trim(),
                actor: optionalString(step.actor),
                screen: step.screen.trim(),
                action: step.action.trim(),
                outcome: optionalString(step.outcome),
                nextStepId: optionalString(step.nextStepId),
            })),
        })),
        features: prd.features.map((feature) => ({
            id: feature.id.trim(),
            title: feature.title.trim(),
            description: feature.description.trim(),
            priority: feature.priority,
            scope: feature.scope,
            acceptanceCriteria: feature.acceptanceCriteria.map((criterion) => criterion.trim()),
        })),
    }
}

export function serializeNormalizedPrd(prd: PRDConfig): string {
    return JSON.stringify(normalizePrdConfig(prd))
}

export function hashPrdConfig(prd: PRDConfig): string {
    const input = serializeNormalizedPrd(prd)
    let hash = 0x811c9dc5

    for (let index = 0; index < input.length; index += 1) {
        hash ^= input.charCodeAt(index)
        hash = Math.imul(hash, 0x01000193)
    }

    return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`
}

export function getProposalDraftState(
    proposedChanges: ProposedPrdChanges,
    currentPrd: PRDConfig | null
): ProposalDraftState {
    if (!currentPrd) {
        return "stale"
    }

    const currentHash = hashPrdConfig(currentPrd)
    if (currentHash === hashPrdConfig(proposedChanges.nextPrdConfig)) {
        return "applied"
    }

    return currentHash === proposedChanges.basePrdHash ? "ready" : "stale"
}

export function canApplyProposal(
    proposedChanges: ProposedPrdChanges,
    currentPrd: PRDConfig | null
): boolean {
    return getProposalDraftState(proposedChanges, currentPrd) === "ready"
}

export function validatePrdDraft(prd: PRDConfig | null): PRDEditorValidationIssue[] {
    if (!prd) {
        return []
    }

    const result = prdConfigSchema.safeParse(normalizePrdConfig(prd))
    if (result.success) {
        return []
    }

    return result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
    }))
}
