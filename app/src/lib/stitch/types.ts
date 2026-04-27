export interface EnsureProjectResult {
    projectId: string
    created: boolean
}

export interface GenerateScreenInput {
    projectId: string
    prompt: string
}

export interface GenerateScreenResult {
    html: string
    metadata: {
        screenId: string
        htmlUrl: string | null
        imageUrl: string | null
        name?: string
    }
}

export interface ScreenListItem {
    screenId: string
    imageUrl: string | null
    htmlUrl: string | null
    name?: string
}

export interface StitchProvider {
    createProject(name: string): Promise<{ projectId: string }>
    generateScreen(input: GenerateScreenInput): Promise<GenerateScreenResult>
    listScreens(projectId: string): Promise<ScreenListItem[]>
    getScreenHtml(htmlUrl: string, projectId?: string): Promise<string>
    getFreshImageUrl(projectId: string, screenId: string): Promise<string>
}
