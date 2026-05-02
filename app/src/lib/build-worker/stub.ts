import { createBuildContract, getTemplateManifest, type BuildRun, type ProjectPlan } from "@/lib/project-plan/schema"

export type PromptMetadata = {
    promptPreview: string
    promptSnapshot: string
    targetWorkspacePath: string
    model: string
    agentStatus: BuildRun["agentStatus"]
}

export function createStubBuildRun(
    projectId: string,
    plan: ProjectPlan,
    promptMetadata?: PromptMetadata
): Omit<BuildRun, "id" | "createdAt" | "updatedAt"> {
    const template = getTemplateManifest("vite-react-app")
    const buildContract = createBuildContract(projectId, plan, template)

    return {
        projectId,
        templateId: template.id,
        status: "success",
        steps: [
            "Validated approved project plan",
            "Created internal build contract",
            `Selected ${template.name} template`,
            "Prepared first build task manifest",
            "Queued contract-backed preview build",
        ],
        logs: [
            `[build-worker] template=${template.id}`,
            `[build-worker] product="${plan.metadata.productName}"`,
            `[build-worker] routes=${plan.routes.map((route) => route.path).join(", ")}`,
            "[build-worker] stub build completed; autonomous file generation is deferred to the next milestone.",
        ],
        filesChanged: [
            "templates/vite-react-app/src/App.tsx (planned)",
            "templates/vite-react-app/src/components/generated/AppShell.tsx (planned)",
            "templates/vite-react-app/src/lib/generated/project-plan.ts (planned)",
        ],
        previewUrl: null,
        commandsRun: [],
        previewAvailable: false,
        buildContractSnapshot: buildContract,
        verificationResults: [],
        detectedPackages: [],
        installedPackages: [],
        validationErrors: [],
        repairAttempts: 0,
        promptPreview: promptMetadata?.promptPreview,
        promptSnapshot: promptMetadata?.promptSnapshot,
        targetWorkspacePath: promptMetadata?.targetWorkspacePath,
        model: promptMetadata?.model ?? "kimi-k2.6",
        agentStatus: promptMetadata?.agentStatus,
    }
}
