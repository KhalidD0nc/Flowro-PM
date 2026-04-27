import { getTemplateManifest, type BuildRun, type DesignArtifact, type ProjectPlan } from "@/lib/project-plan/schema"

export function createStubBuildRun(projectId: string, plan: ProjectPlan, design: DesignArtifact): Omit<BuildRun, "id" | "createdAt" | "updatedAt"> {
    const template = getTemplateManifest(plan.templateId)
    const previewUrl = `/api/projects/${projectId}/design/screens/${design.screenId}/html`

    return {
        projectId,
        templateId: template.id,
        status: "success",
        steps: [
            "Validated approved project plan",
            "Loaded approved Stitch design artifact",
            `Selected ${template.name} template`,
            "Prepared first build task manifest",
            "Published design-backed preview URL",
        ],
        logs: [
            `[build-worker] template=${template.id}`,
            `[build-worker] product="${plan.metadata.productName}"`,
            `[build-worker] design=${design.screenId}`,
            "[build-worker] stub build completed; autonomous file generation is deferred to the next milestone.",
        ],
        filesChanged: [
            "templates/nextjs-app/src/app/page.tsx (planned)",
            "templates/nextjs-app/src/components/generated/AppShell.tsx (planned)",
            "templates/nextjs-app/src/lib/generated/project-plan.ts (planned)",
        ],
        previewUrl,
    }
}
