import { NextRequest, NextResponse } from "next/server"
import { Timestamp } from "firebase-admin/firestore"
import { isAuthError, unauthorizedResponse, verifyAuthToken } from "../../../../blueprints/auth"
import { addMessage, getProject, updateProject } from "@/lib/firebase/collections"
import type { MessageIntent, MessageRole } from "@/lib/firebase/schema"
import { logError } from "@/lib/logger"
import { generateSlidesDeck } from "@/lib/slides/deck"
import { generateSlidesDeckStory } from "@/lib/slides/story"

type ChatMessagePayload = {
  role?: MessageRole
  content?: string
  intent?: MessageIntent | null
}

async function verifySlidesOwnership(projectId: string, userId: string) {
  const project = await getProject(projectId)
  if (!project) throw new Error("Project not found")
  if (project.userId !== userId) throw new Error("Access denied: you do not own this project")
  if ((project.projectType ?? "app") !== "slides") throw new Error("Project is not a Slides workspace")
  return project
}

function validMessages(value: unknown): ChatMessagePayload[] {
  return (Array.isArray(value) ? value : []).filter((msg) =>
    msg &&
    (msg.role === "user" || msg.role === "assistant") &&
    typeof msg.content === "string" &&
    msg.content.trim().length > 0
  )
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const authResult = await verifyAuthToken(request)
    if (isAuthError(authResult)) {
      return unauthorizedResponse(authResult)
    }

    const { projectId } = await params
    const body = await request.json()
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : ""
    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    const project = await verifySlidesOwnership(projectId, authResult.userId)
    await updateProject(projectId, { slidesStatus: project.slidesWebSearchEnabled ? "searching_web" : "building_story" })

    const story = await generateSlidesDeckStory({
      prompt,
      sources: project.slidesSources ?? [],
      webSearchEnabled: Boolean(project.slidesWebSearchEnabled),
    })

    const assistantContent = story.brief.blockerQuestion
      ? story.brief.blockerQuestion
      : `I generated the internal brief, a ${story.outline.length}-slide claim-led outline, and the structured deck preview.`

    const messages = validMessages(body.appendChat)
    const messagesToPersist = messages.length
      ? messages
      : [
          { role: "user" as const, content: prompt, intent: "discussion" as const },
          { role: "assistant" as const, content: assistantContent, intent: "discussion" as const },
        ]

    const savedMessages = []
    for (const msg of messagesToPersist) {
      savedMessages.push(await addMessage(projectId, {
        role: msg.role as MessageRole,
        content: msg.role === "assistant" ? assistantContent : msg.content as string,
        intent: msg.intent === "initial" || msg.intent === "clarification" || msg.intent === "discussion" || msg.intent === "proposal"
          ? msg.intent
          : "discussion",
        timestamp: Timestamp.now(),
      }))
    }

    if (story.brief.blockerQuestion) {
      await updateProject(projectId, {
        slidesDeckStory: story,
        slidesStatus: "needs_attention",
      })

      return NextResponse.json({
        success: true,
        assistantContent,
        slidesStatus: "needs_attention",
        slidesDeckStory: story,
        messages: savedMessages.map((msg) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          intent: msg.intent,
          timestamp: msg.timestamp.toDate().toISOString(),
        })),
      })
    }

    await updateProject(projectId, {
      slidesDeckStory: story,
      slidesStatus: "drafting",
    })

    const deck = await generateSlidesDeck({
      story,
      sources: project.slidesSources ?? [],
    })

    await updateProject(projectId, {
      slidesDeckStory: story,
      slidesDeck: deck,
      slidesStatus: "ready",
    })

    return NextResponse.json({
      success: true,
      assistantContent: `I generated a ${deck.slides.length}-slide structured deck preview. You can select a slide for targeted edits or export the deck.`,
      slidesStatus: "ready",
      slidesDeckStory: story,
      slidesDeck: deck,
      messages: savedMessages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        intent: msg.intent,
        timestamp: msg.timestamp.toDate().toISOString(),
      })),
    })
  } catch (error) {
    logError("slides_story", { error: String(error) })
    const message = error instanceof Error ? error.message : "Failed to build Slides story"
    const status = message.includes("Access denied")
      ? 403
      : message.includes("not found")
        ? 404
        : message.includes("not a Slides")
          ? 400
          : 500
    return NextResponse.json({ error: message }, { status })
  }
}
