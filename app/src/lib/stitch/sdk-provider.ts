import { StitchToolClient, stitch } from "@google/stitch-sdk"
import type { GenerateScreenInput, GenerateScreenResult, ScreenListItem, StitchProvider } from "@/lib/stitch/types"

type StitchScreenLike = {
    screenId: string
    data?: {
        title?: string
        name?: string
        htmlCode?: { downloadUrl?: string }
        screenshot?: { downloadUrl?: string }
    }
    getHtml(): Promise<string>
    getImage(): Promise<string>
}

function getApiKey(): string {
    const apiKey = process.env.STITCH_API_KEY
    if (!apiKey) {
        throw new Error("STITCH_API_KEY is not configured.")
    }
    return apiKey
}

async function fetchText(url: string): Promise<string> {
    const response = await fetch(url)
    if (!response.ok) {
        throw new Error(`Failed to download generated HTML from Stitch (${response.status}).`)
    }
    return response.text()
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

async function screenToResult(screen: StitchScreenLike): Promise<GenerateScreenResult> {
    const htmlUrl =
        typeof screen.data?.htmlCode?.downloadUrl === "string"
            ? screen.data.htmlCode.downloadUrl
            : await screen.getHtml()
    const imageUrl =
        typeof screen.data?.screenshot?.downloadUrl === "string"
            ? screen.data.screenshot.downloadUrl
            : await screen.getImage()

    if (!screen.screenId || !htmlUrl) {
        throw new Error("Stitch generated a screen, but the screen metadata was incomplete.")
    }

    const html = await fetchText(htmlUrl)

    return {
        html,
        metadata: {
            screenId: screen.screenId,
            htmlUrl,
            imageUrl: imageUrl || null,
            name: screen.data?.title || screen.data?.name || "Generated screen",
        },
    }
}

export class StitchSdkProvider implements StitchProvider {
    async createProject(name: string): Promise<{ projectId: string }> {
        getApiKey()
        const project = await stitch.createProject(name)
        return { projectId: project.projectId }
    }

    async listScreens(projectId: string): Promise<ScreenListItem[]> {
        getApiKey()
        const project = stitch.project(projectId)
        const screens = await project.screens()

        return Promise.all(
            screens.map(async (screen, index) => {
                const htmlUrl =
                    typeof screen.data?.htmlCode?.downloadUrl === "string"
                        ? screen.data.htmlCode.downloadUrl
                        : await screen.getHtml().catch(() => null)
                const imageUrl =
                    typeof screen.data?.screenshot?.downloadUrl === "string"
                        ? screen.data.screenshot.downloadUrl
                        : await screen.getImage().catch(() => null)

                return {
                    screenId: screen.screenId,
                    htmlUrl: htmlUrl || null,
                    imageUrl: imageUrl || null,
                    name: screen.data?.title || screen.data?.name || `Screen ${index + 1}`,
                }
            })
        )
    }

    async getScreenHtml(htmlUrl: string): Promise<string> {
        return fetchText(htmlUrl)
    }

    async getFreshImageUrl(projectId: string, screenId: string): Promise<string> {
        const apiKey = getApiKey()
        const client = new StitchToolClient({ apiKey })
        try {
            const raw = await client.callTool<{ screenshot?: { downloadUrl: string } }>("get_screen", {
                projectId,
                screenId,
                name: `projects/${projectId}/screens/${screenId}`,
            })
            return raw.screenshot?.downloadUrl || ""
        } finally {
            await client.close()
        }
    }

    async generateScreen(input: GenerateScreenInput): Promise<GenerateScreenResult> {
        const project = stitch.project(input.projectId)
        const beforeScreens = await project.screens()
        const existingScreenIds = new Set(beforeScreens.map((screen) => screen.screenId))

        try {
            const generatedScreen = await project.generate(input.prompt, "DESKTOP")
            return screenToResult(generatedScreen)
        } catch (error) {
            const message = error instanceof Error ? error.message : ""
            if (!message.includes("Incomplete API response")) {
                throw error
            }
        }

        for (let attempt = 0; attempt < 8; attempt += 1) {
            if (attempt > 0) {
                await sleep(1500)
            }

            const afterScreens = await project.screens()
            const screen = afterScreens.find((candidate) => !existingScreenIds.has(candidate.screenId)) ?? afterScreens.at(-1)
            if (screen) {
                return screenToResult(screen)
            }
        }

        throw new Error("Stitch accepted the generation request, but the generated screen was not available yet. Please try Generate UI again in a few seconds.")
    }
}
