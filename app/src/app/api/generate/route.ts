import { NextRequest, NextResponse } from "next/server"
import { verifyAuthToken, isAuthError, unauthorizedResponse } from "../blueprints/auth"
import { getProjectById, updateProjectChatHistory, getLatestBlueprint, updateBlueprintContent, ChatMessage } from "../blueprints/service"
import { generateFromMessage } from "./service"

export async function POST(request: NextRequest) {
    try {
        // 1. Verify Firebase token
        const authResult = await verifyAuthToken(request)

        if (isAuthError(authResult)) {
            return unauthorizedResponse(authResult)
        }

        // 2. Parse request body
        const body = await request.json()
        const { message, projectId, context } = body

        if (!message) {
            return NextResponse.json({ error: "Message required" }, { status: 400 })
        }

        // 3. Generate response from LLM
        const result = await generateFromMessage({ message, context })

        // 4. Save chat history to Project (not Blueprint) if projectId provided
        if (projectId) {
            const project = await getProjectById(projectId)

            if (project && project.userId === authResult.userId) {
                const newMessages: ChatMessage[] = [
                    {
                        role: "user",
                        content: message,
                        timestamp: new Date().toISOString(),
                    },
                    {
                        role: "assistant",
                        content: result.rawContent,
                        timestamp: new Date().toISOString(),
                    },
                ]

                // Save chat history to project (continues even when blueprints are locked)
                await updateProjectChatHistory(projectId, newMessages)

                // Also update the latest draft blueprint's content if there is one
                const latestBlueprint = await getLatestBlueprint(projectId)
                if (latestBlueprint && latestBlueprint.status === "draft") {
                    try {
                        await updateBlueprintContent(latestBlueprint.id, result.content)
                    } catch {
                        // Blueprint might be locked, that's okay - chat still saved to project
                        console.log("Blueprint is locked, chat history saved to project only")
                    }
                }
            }
        }

        return NextResponse.json({
            content: result.content,
            reasoningDetails: result.reasoningDetails,
        })
    } catch (error) {
        console.error("Generate error:", error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Generation failed" },
            { status: 500 }
        )
    }
}
