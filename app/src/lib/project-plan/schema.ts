import { z } from "zod"
import type { PRDConfig } from "@/lib/prd/schema"

export const projectStageSchema = z.enum([
    "planning",
    "plan_approved",
    "designing",
    "design_ready",
    "design_approved",
    "coding",
    "preview_ready",
    "failed",
])

export const templateIdSchema = z.enum(["nextjs-app"])

export const templateManifestSchema = z.object({
    id: templateIdSchema,
    name: z.string().min(1),
    description: z.string().min(1),
    stack: z.array(z.string().min(1)).min(1),
    packageManager: z.enum(["npm"]),
    scripts: z.object({
        install: z.string().min(1),
        dev: z.string().min(1),
        build: z.string().min(1),
    }),
    editablePaths: z.array(z.string().min(1)).min(1),
    constraints: z.array(z.string().min(1)).min(1),
})

export const routePlanSchema = z.object({
    path: z.string().min(1),
    name: z.string().min(1),
    purpose: z.string().min(1),
    primaryActions: z.array(z.string().min(1)).default([]),
})

export const dataModelPlanSchema = z.object({
    name: z.string().min(1),
    purpose: z.string().min(1),
    fields: z.array(z.string().min(1)).default([]),
})

export const integrationPlanSchema = z.object({
    name: z.string().min(1),
    purpose: z.string().min(1),
    requiredForV1: z.boolean().default(false),
})

export const buildTaskSchema = z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    description: z.string().min(1),
    status: z.enum(["pending", "ready", "blocked"]).default("pending"),
})

export const projectPlanSchema = z.object({
    metadata: z.object({
        productName: z.string().min(1),
        version: z.string().min(1).default("0.1"),
        status: z.enum(["draft", "approved"]).default("draft"),
    }),
    templateId: templateIdSchema.default("nextjs-app"),
    appSummary: z.string().min(1),
    targetUser: z.string().min(1),
    problem: z.string().min(1),
    successCriteria: z.array(z.string().min(1)).min(1),
    routes: z.array(routePlanSchema).min(1),
    dataModels: z.array(dataModelPlanSchema).default([]),
    auth: z.object({
        required: z.boolean(),
        notes: z.string().min(1),
    }),
    integrations: z.array(integrationPlanSchema).default([]),
    uiRequirements: z.array(z.string().min(1)).min(1),
    buildTasks: z.array(buildTaskSchema).min(1),
    acceptanceChecks: z.array(z.string().min(1)).min(1),
    risks: z.array(z.string().min(1)).default([]),
})

export const projectPlanGenerateResponseSchema = z.object({
    intent: z.literal("initial"),
    message: z.string().min(1),
    projectPlan: projectPlanSchema,
})

export const designArtifactSchema = z.object({
    id: z.string().min(1),
    projectId: z.string().min(1),
    provider: z.literal("stitch"),
    stitchProjectId: z.string().min(1),
    screenId: z.string().min(1),
    name: z.string().min(1),
    imageUrl: z.string().nullable(),
    htmlUrl: z.string().nullable(),
    htmlSnapshot: z.string().optional(),
    status: z.enum(["generated", "approved"]).default("generated"),
    createdAt: z.string().optional(),
    approvedAt: z.string().optional(),
    approvedBy: z.string().optional(),
})

export const buildRunSchema = z.object({
    id: z.string().min(1),
    projectId: z.string().min(1),
    templateId: templateIdSchema,
    status: z.enum(["queued", "running", "success", "failed"]),
    steps: z.array(z.string().min(1)).default([]),
    logs: z.array(z.string().min(1)).default([]),
    filesChanged: z.array(z.string().min(1)).default([]),
    previewUrl: z.string().nullable().default(null),
    error: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
})

export type ProjectStage = z.infer<typeof projectStageSchema>
export type TemplateId = z.infer<typeof templateIdSchema>
export type TemplateManifest = z.infer<typeof templateManifestSchema>
export type ProjectPlan = z.infer<typeof projectPlanSchema>
export type DesignArtifact = z.infer<typeof designArtifactSchema>
export type BuildRun = z.infer<typeof buildRunSchema>

export const TEMPLATE_MANIFESTS: Record<TemplateId, TemplateManifest> = {
    "nextjs-app": {
        id: "nextjs-app",
        name: "Next.js App",
        description: "A template-first React web application using Next.js App Router.",
        stack: ["Next.js", "React", "TypeScript", "Tailwind CSS"],
        packageManager: "npm",
        scripts: {
            install: "npm install",
            dev: "npm run dev",
            build: "npm run build",
        },
        editablePaths: ["src/app", "src/components", "src/lib"],
        constraints: [
            "Generate a web application only.",
            "Do not change the base framework.",
            "Prefer existing template conventions over custom architecture.",
        ],
    },
}

export function validateProjectPlan(input: unknown): ProjectPlan {
    return projectPlanSchema.parse(input)
}

export function getTemplateManifest(templateId: TemplateId): TemplateManifest {
    return TEMPLATE_MANIFESTS[templateId]
}

export function prdToProjectPlan(prd: PRDConfig): ProjectPlan {
    return projectPlanSchema.parse({
        metadata: {
            productName: prd.metadata.productName,
            version: "0.1",
            status: "draft",
        },
        templateId: "nextjs-app",
        appSummary: `${prd.metadata.productName} is a web app for ${prd.metadata.targetAudience}.`,
        targetUser: prd.metadata.targetAudience,
        problem: prd.features[0]?.description || "The product needs a structured web experience.",
        successCriteria: prd.features.flatMap((feature) => feature.acceptanceCriteria).slice(0, 6),
        routes: prd.flows.map((flow, index) => ({
            path: index === 0 ? "/" : `/${flow.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `flow-${index + 1}`}`,
            name: flow.name,
            purpose: flow.steps[0]?.outcome || flow.steps[0]?.action || "Support the planned user flow.",
            primaryActions: flow.steps.map((step) => step.action).filter(Boolean).slice(0, 5),
        })),
        dataModels: prd.entities.map((entity) => ({
            name: entity.name,
            purpose: entity.description || `Store ${entity.name} data.`,
            fields: entity.fields.map((field) => `${field.name}: ${field.type}${field.required ? " required" : ""}`),
        })),
        auth: {
            required: prd.features.some((feature) => /auth|login|account|profile/i.test(`${feature.title} ${feature.description}`)),
            notes: "Use template-supported authentication only when the approved plan requires accounts.",
        },
        integrations: [],
        uiRequirements: [prd.metadata.designVibe || "Create a polished, responsive web app."],
        buildTasks: prd.features.map((feature, index) => ({
            id: `T-${index + 1}`,
            title: feature.title,
            description: feature.description,
            status: "pending",
        })),
        acceptanceChecks: prd.features.flatMap((feature) => feature.acceptanceCriteria).slice(0, 8),
        risks: [],
    })
}
