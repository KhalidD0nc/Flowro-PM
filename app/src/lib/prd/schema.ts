import { z } from "zod"

const platformSchema = z.enum(["web", "ios", "android"])

export const prdFieldSchema = z.object({
    name: z.string().min(1),
    type: z.string().min(1),
    required: z.boolean(),
    relationshipTo: z.string().min(1).optional(),
})

export const prdEntitySchema = z.object({
    name: z.string().min(1),
    description: z.string().min(1).optional(),
    fields: z.array(prdFieldSchema),
})

export const prdFlowStepSchema = z.object({
    id: z.string().min(1),
    actor: z.string().min(1).optional(),
    screen: z.string().min(1),
    action: z.string().min(1),
    outcome: z.string().min(1).optional(),
    nextStepId: z.string().min(1).optional(),
})

export const prdFlowSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    steps: z.array(prdFlowStepSchema).min(1),
})

export const prdFeatureSchema = z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    description: z.string().min(1),
    priority: z.enum(["must", "should", "could"]),
    scope: z.enum(["mvp", "later"]),
    acceptanceCriteria: z.array(z.string().min(1)).min(1),
})

export const prdMetadataSchema = z.object({
    productName: z.string().min(1),
    platforms: z.array(platformSchema).min(1),
    targetAudience: z.string().min(1),
    designVibe: z.string().min(1),
})

export const prdConfigSchema = z.object({
    metadata: prdMetadataSchema,
    entities: z.array(prdEntitySchema),
    flows: z.array(prdFlowSchema).min(1),
    features: z.array(prdFeatureSchema).min(1),
})

export const prdProposalActionSchema = z.enum(["add", "update", "remove"])

export const proposedPrdChangesSchema = z.object({
    action: prdProposalActionSchema,
    summary: z.string().min(1),
    sections: z.array(z.string().min(1)).min(1),
    changes: z.record(z.string(), z.unknown()),
    basePrdHash: z.string().min(1),
    nextPrdConfig: prdConfigSchema,
})

export const generatePrdResponseSchema = z.object({
    intent: z.literal("initial"),
    message: z.string().min(1),
    prdConfig: prdConfigSchema,
})

export const discussionResponseSchema = z.object({
    intent: z.literal("discussion"),
    message: z.string().min(1),
})

export const proposalResponseSchema = z.object({
    intent: z.literal("proposal"),
    message: z.string().min(1),
    proposedChanges: proposedPrdChangesSchema,
})

export const enhanceDiscussionResponseSchema = discussionResponseSchema

export const enhanceResponseSchema = z.union([
    enhanceDiscussionResponseSchema,
    proposalResponseSchema,
])

export const anyGenerateResponseSchema = z.union([
    generatePrdResponseSchema,
    discussionResponseSchema,
])

export type PRDPlatform = z.infer<typeof platformSchema>
export type PRDField = z.infer<typeof prdFieldSchema>
export type PRDEntity = z.infer<typeof prdEntitySchema>
export type PRDFlowStep = z.infer<typeof prdFlowStepSchema>
export type PRDFlow = z.infer<typeof prdFlowSchema>
export type PRDFeature = z.infer<typeof prdFeatureSchema>
export type PRDMetadata = z.infer<typeof prdMetadataSchema>
export type PRDConfig = z.infer<typeof prdConfigSchema>
export type PRDProposalAction = z.infer<typeof prdProposalActionSchema>
export type ProposedPrdChanges = z.infer<typeof proposedPrdChangesSchema>
export type GeneratePRDResponse = z.infer<typeof generatePrdResponseSchema>
export type DiscussionResponse = z.infer<typeof discussionResponseSchema>
export type ProposalResponse = z.infer<typeof proposalResponseSchema>
export type EnhanceResponse = z.infer<typeof enhanceResponseSchema>

export function validatePRDConfig(input: unknown): PRDConfig {
    return prdConfigSchema.parse(input)
}

export function parseProposedPrdChanges(input: unknown): ProposedPrdChanges | undefined {
    const result = proposedPrdChangesSchema.safeParse(input)
    return result.success ? result.data : undefined
}
