import { NextRequest, NextResponse } from "next/server"
import { Timestamp } from "firebase-admin/firestore"
import { isAuthError, unauthorizedResponse, verifyAuthToken } from "../../../../blueprints/auth"
import { addMessage, getProject, updateProject } from "@/lib/firebase/collections"
import { logError } from "@/lib/logger"
import { attachSlideCodeToDeck } from "@/lib/slides/codeDeck"
import { editSlidesDeck } from "@/lib/slides/deck"

async function verifySlidesProject(projectId: string, userId: string) {
  const project = await getProject(projectId)
  if (!project) throw new Error("Project not found")
  if (project.userId !== userId) throw new Error("Access denied: you do not own this project")
  if ((project.projectType ?? "app") !== "slides") throw new Error("Project is not a Slides workspace")
  if (!project.slidesDeckStory || !project.slidesDeck) throw new Error("Generate a Slides deck before editing")
  return project
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const authResult = await verifyAuthToken(request)
    if (isAuthError(authResult)) return unauthorizedResponse(authResult)

    const { projectId } = await params
    const body = await request.json()
    const instruction = typeof body.instruction === "string" ? body.instruction.trim() : ""
    const slideId = typeof body.slideId === "string" && body.slideId.trim() ? body.slideId.trim() : undefined
    if (!instruction) return NextResponse.json({ error: "Instruction is required" }, { status: 400 })

    const project = await verifySlidesProject(projectId, authResult.userId)
    await updateProject(projectId, { slidesStatus: "drafting" })

    const structuredDeck = await editSlidesDeck({
      deck: project.slidesDeck!,
      story: project.slidesDeckStory!,
      instruction,
      slideId,
    })
    const deck = await attachSlideCodeToDeck({
      deck: structuredDeck,
      story: project.slidesDeckStory!,
      sources: project.slidesSources ?? [],
      intent: instruction,
    })
    await updateProject(projectId, { slidesDeck: deck, slidesStatus: "ready" })

    const target = slideId ? `slide ${slideId}` : "the whole deck"
    const assistantContent = `Applied the requested edit to ${target} and preserved mapped source references.`
    const userMessage = await addMessage(projectId, {
      role: "user",
      content: instruction,
      intent: "discussion",
      timestamp: Timestamp.now(),
    })
    const assistantMessage = await addMessage(projectId, {
      role: "assistant",
      content: assistantContent,
      intent: "discussion",
      timestamp: Timestamp.now(),
    })

    return NextResponse.json({
      success: true,
      slidesDeck: deck,
      slidesStatus: "ready",
      assistantContent,
      messages: [userMessage, assistantMessage].map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        intent: msg.intent,
        timestamp: msg.timestamp.toDate().toISOString(),
      })),
    })
  } catch (error) {
    logError("slides_edit", { error: String(error) })
    const message = error instanceof Error ? error.message : "Failed to edit Slides deck"
    const status = message.includes("Access denied") ? 403 : message.includes("not found") ? 404 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
