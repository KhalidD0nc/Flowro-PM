import type { EnsureProjectResult, GenerateScreenInput, GenerateScreenResult, ScreenListItem, StitchProvider } from "@/lib/stitch/types"

export class StitchService {
    private ensureProjectPromise: Promise<EnsureProjectResult> | null = null

    constructor(private readonly provider: StitchProvider) {}

    async ensureProject(currentProjectId: string | undefined, name: string): Promise<EnsureProjectResult> {
        if (currentProjectId) {
            return { projectId: currentProjectId, created: false }
        }

        if (this.ensureProjectPromise) {
            return this.ensureProjectPromise
        }

        this.ensureProjectPromise = this.provider.createProject(name).then((project) => ({
            projectId: project.projectId,
            created: true,
        })).finally(() => {
            this.ensureProjectPromise = null
        })

        return this.ensureProjectPromise
    }

    async listScreens(projectId: string): Promise<ScreenListItem[]> {
        return this.provider.listScreens(projectId)
    }

    async getScreenHtml(htmlUrl: string, projectId?: string): Promise<string> {
        return this.provider.getScreenHtml(htmlUrl, projectId)
    }

    async getFreshImageUrl(projectId: string, screenId: string): Promise<string> {
        return this.provider.getFreshImageUrl(projectId, screenId)
    }

    async generateScreen(input: GenerateScreenInput): Promise<GenerateScreenResult> {
        return this.provider.generateScreen(input)
    }
}
