import { z } from "zod"
import type { PRDConfig } from "@/lib/prd/schema"

export const projectStageSchema = z.enum([
    "planning",
    "plan_approved",
    "coding",
    "preview_ready",
    "failed",
])

export const templateIdSchema = z.enum(["vite-react-app", "vite-react-supabase-app", "nextjs-app"])

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

export const databasePlanSchema = z.object({
    provider: z.enum(["none", "supabase_postgres"]).default("none"),
    authMode: z.enum(["none", "email_only"]).default("none"),
    rlsStrategy: z.enum(["user_owned", "public_read_user_write", "admin_only"]).default("user_owned"),
})

export const projectPlanSchema = z.object({
    metadata: z.object({
        productName: z.string().min(1),
        version: z.string().min(1).default("0.1"),
        status: z.enum(["draft", "approved"]).default("draft"),
    }),
    templateId: templateIdSchema.default("vite-react-app"),
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
    database: databasePlanSchema.optional(),
})

export const projectPlanGenerateResponseSchema = z.object({
    intent: z.literal("initial"),
    message: z.string().min(1),
    projectPlan: projectPlanSchema,
})

export const buildContractSchema = z.object({
    projectId: z.string().min(1),
    templateId: templateIdSchema,
    productName: z.string().min(1),
    visualDirection: z.array(z.string().min(1)).min(1),
    routes: z.array(routePlanSchema).min(1),
    componentRules: z.array(z.string().min(1)).min(1),
    frontendGuardrails: z.array(z.string().min(1)).min(1),
    securityGuardrails: z.array(z.string().min(1)).min(1),
    businessLogicGuardrails: z.array(z.string().min(1)).min(1),
    mockDataStrategy: z.string().min(1),
    acceptanceChecks: z.array(z.string().min(1)).min(1),
    createdAt: z.string().optional(),
})

export const commandRunSchema = z.object({
    command: z.string().min(1),
    status: z.enum(["success", "failed"]),
    summary: z.string().min(1),
    stdout: z.string().optional(),
    stderr: z.string().optional(),
})

export const verificationResultSchema = z.object({
    check: z.string().min(1),
    status: z.enum(["passed", "failed", "not_run"]),
    notes: z.string().optional(),
})

export const buildPhaseSchema = z.enum([
    "queued",
    "planning",
    "provisioning",
    "schema_gen",
    "generating",
    "installing",
    "building",
    "repairing",
    "fallback",
    "preview",
    "completed",
    "failed",
    "canceled",
])

export const buildRunSchema = z.object({
    id: z.string().min(1),
    projectId: z.string().min(1),
    templateId: templateIdSchema,
    status: z.enum(["queued", "running", "success", "failed", "canceled"]),
    steps: z.array(z.string().min(1)).default([]),
    logs: z.array(z.string().min(1)).default([]),
    filesChanged: z.array(z.string().min(1)).default([]),
    previewUrl: z.string().nullable().default(null),
    error: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    promptPreview: z.string().optional(),
    promptSnapshot: z.string().optional(),
    targetWorkspacePath: z.string().optional(),
    model: z.string().optional().default("kimi-k2.6"),
    agentStatus: z.enum(["prompt_ready", "building", "completed", "blocked"]).optional(),
    commandsRun: z.array(commandRunSchema).default([]),
    previewAvailable: z.boolean().optional(),
    phase: buildPhaseSchema.optional(),
    currentAction: z.string().optional(),
    startedAt: z.string().optional(),
    finishedAt: z.string().optional(),
    elapsedMs: z.number().nonnegative().optional(),
    totalFiles: z.number().int().nonnegative().optional(),
    completedFiles: z.number().int().nonnegative().optional(),
    currentFile: z.string().optional(),
    fallbackUsed: z.boolean().optional(),
    buildContractSnapshot: buildContractSchema.optional(),
    verificationResults: z.array(verificationResultSchema).default([]),
    detectedPackages: z.array(z.string().min(1)).default([]),
    installedPackages: z.array(z.string().min(1)).default([]),
    validationErrors: z.array(z.string().min(1)).default([]),
    repairAttempts: z.number().int().nonnegative().optional(),
    runType: z.enum(["initial_build", "edit"]).optional(),
    editInstruction: z.string().optional(),
    supabaseProvision: z.object({
        projectId: z.string().optional(),
        projectRef: z.string().optional(),
        projectUrl: z.string().optional(),
        browserKey: z.string().optional(),
        browserKeyType: z.enum(["publishable", "anon"]).optional(),
        anonKey: z.string().optional(),
        canonicalTables: z.array(z.object({
            modelName: z.string(),
            tableName: z.string(),
            columns: z.array(z.object({
                fieldName: z.string(),
                columnName: z.string(),
                pgType: z.string(),
                required: z.boolean(),
            })),
        })).optional(),
        migrationPath: z.string().optional(),
        schemaSQL: z.string().optional(),
        rlsPoliciesSQL: z.string().optional(),
        status: z.enum(["provisioned", "failed"]),
        error: z.string().optional(),
    }).optional(),
})

export type ProjectStage = z.infer<typeof projectStageSchema>
export type TemplateId = z.infer<typeof templateIdSchema>
export type TemplateManifest = z.infer<typeof templateManifestSchema>
export type RoutePlan = z.infer<typeof routePlanSchema>
export type DataModelPlan = z.infer<typeof dataModelPlanSchema>
export type DatabasePlan = z.infer<typeof databasePlanSchema>
export type ProjectPlan = z.infer<typeof projectPlanSchema>
export type BuildContract = z.infer<typeof buildContractSchema>
export type BuildRun = z.infer<typeof buildRunSchema>
export type BuildPhase = z.infer<typeof buildPhaseSchema>

export const TEMPLATE_MANIFESTS: Record<TemplateId, TemplateManifest> = {
    "vite-react-app": {
        id: "vite-react-app",
        name: "Vite React App",
        description: "A local-first React preview application using Vite, TypeScript, and Tailwind CSS.",
        stack: ["Vite", "React", "TypeScript", "Tailwind CSS"],
        packageManager: "npm",
        scripts: {
            install: "npm install",
            dev: "npm run dev",
            build: "npm run build",
        },
        editablePaths: ["src", "public"],
        constraints: [
            "Generate a web application only.",
            "Use Vite React for the local preview loop.",
            "Do not change package.json, vite.config.ts, tsconfig.json, or other base config files.",
            "Prefer existing template conventions over custom architecture.",
        ],
    },
    "vite-react-supabase-app": {
        id: "vite-react-supabase-app",
        name: "Vite React + Supabase App",
        description: "A React preview application with Supabase PostgreSQL backend, RLS policies, and optional email auth.",
        stack: ["Vite", "React", "TypeScript", "Tailwind CSS", "Supabase"],
        packageManager: "npm",
        scripts: {
            install: "npm install",
            dev: "npm run dev",
            build: "npm run build",
        },
        editablePaths: ["src", "public"],
        constraints: [
            "Generate a web application only.",
            "Use Vite React for the local preview loop.",
            "Use src/lib/supabase.ts for all client access. Never call createClient() elsewhere.",
            "Do not change package.json, vite.config.ts, tsconfig.json, or other base config files.",
            "Prefer existing template conventions over custom architecture.",
        ],
    },
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

export function getTemplateManifest(templateId: string): TemplateManifest {
    const manifest = TEMPLATE_MANIFESTS[templateId as TemplateId]
    if (!manifest) {
        throw new Error(`Unknown template ID: ${templateId}`)
    }
    return manifest
}

export function createBuildContract(projectId: string, plan: ProjectPlan, templateManifest: TemplateManifest): BuildContract {
    return buildContractSchema.parse({
        projectId,
        templateId: templateManifest.id,
        productName: plan.metadata.productName,
        visualDirection: plan.uiRequirements.length > 0
            ? plan.uiRequirements
            : ["Create a polished, responsive product app with clear hierarchy."],
        routes: plan.routes,
        componentRules: [
            "Use the template component kit from src/components/ui before creating one-off controls.",
            "Use AppShell, Button, Panel, MetricCard, StatusBadge, EmptyState, and DataList where they fit.",
            "Create new components only when the interaction is domain-specific or repeated.",
            "Use lucide-react icons for iconography; do not use emoji as UI icons.",
            "Keep clickable targets at least 44px tall/wide and include visible keyboard focus states.",
        ],
        frontendGuardrails: [
            "Generate a landing-first app: route / is a polished product landing page and route /app is the usable product workspace.",
            "The landing page must make the product name the strongest first-viewport signal, use short copy, one strong visual idea, and a primary CTA that navigates to /app.",
            "The /app workspace must implement the approved routes, actions, data models, states, and acceptance checks.",
            "Use dense but readable product UI inside /app with clear navigation, states, and responsive layouts.",
            "Avoid decorative-only sections, nested cards, and oversized hero typography inside app surfaces.",
            "Avoid generic SaaS card grids, default Inter-only styling, overused purple gradients, and card-heavy composition.",
            "Use CSS variables and Tailwind consistently for theme color, spacing, and responsive behavior.",
            "Use intentional motion for entrance or interaction states, and respect prefers-reduced-motion.",
            "Keep text readable on mobile and desktop without overlapping controls.",
        ],
        securityGuardrails: [
            "Do not expose secrets, API keys, tokens, or private configuration in client code.",
            "Do not add auth, payments, databases, or cloud services unless explicitly required by the approved plan.",
            "Use local mock data when an integration is not approved for V1.",
        ],
        businessLogicGuardrails: [
            "Implement the routes, actions, data models, and acceptance checks from the approved plan.",
            "Show realistic empty, loading, and error states where the workflow implies them.",
            "If plan details conflict, prioritize acceptance checks and core user actions.",
        ],
        mockDataStrategy: plan.database?.provider === "supabase_postgres"
            ? "Use the Supabase client from src/lib/supabase.ts and helpers from src/lib/supabase-helpers.ts. VITE_SUPABASE_URL plus VITE_SUPABASE_PUBLISHABLE_KEY or legacy VITE_SUPABASE_ANON_KEY are in .env.local. Use the canonical table map generated in src/lib/supabase.schema.ts."
            : plan.integrations.some((integration) => integration.requiredForV1)
                ? "Use local mock data for preview UI and clearly isolate any integration placeholders."
                : "Use realistic local mock data only; do not add backend services.",
        acceptanceChecks: plan.acceptanceChecks,
        createdAt: new Date().toISOString(),
    })
}

export function prdToProjectPlan(prd: PRDConfig): ProjectPlan {
    return projectPlanSchema.parse({
        metadata: {
            productName: prd.metadata.productName,
            version: "0.1",
            status: "draft",
        },
        templateId: "vite-react-app",
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
