import { NextRequest, NextResponse } from "next/server"
import { verifyAuthToken, isAuthError, unauthorizedResponse } from "../blueprints/auth"
import { getBlueprintById, updateBlueprintContent, ChatMessage } from "../blueprints/service"
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
        const { message, blueprintId, context } = body

        if (!message) {
            return NextResponse.json({ error: "Message required" }, { status: 400 })
        }

        // 3. Generate response from LLM
        const result = await generateFromMessage({ message, context })

        // 4. Save to Firestore if blueprintId provided
        if (blueprintId) {
            const blueprint = await getBlueprintById(blueprintId)

            if (blueprint && blueprint.userId === authResult.userId) {
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

                await updateBlueprintContent(blueprintId, result.content, newMessages)
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
