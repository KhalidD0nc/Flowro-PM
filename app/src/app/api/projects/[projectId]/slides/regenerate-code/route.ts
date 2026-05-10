import { NextRequest, NextResponse } from "next/server"
import { isAuthError, unauthorizedResponse, verifyAuthToken } from "../../../../blueprints/auth"
import { getProject, updateProject } from "@/lib/firebase/collections"
import { logError } from "@/lib/logger"
import { attachSlideCodeToDeck } from "@/lib/slides/codeDeck"

async function verifySlidesProject(projectId: string, userId: string) {
  const project = await getProject(projectId)
  if (!project) throw new Error("Project not found")
  if (project.userId !== userId) throw new Error("Access denied: you do not own this project")
  if ((project.projectType ?? "app") !== "slides") throw new Error("Project is not a Slides workspace")
  if (!project.slidesDeckStory || !project.slidesDeck) throw new Error("Generate a Slides deck before regenerating slideCode")
  return project
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  let projectIdForStatus: string | null = null
  try {
    const authResult = await verifyAuthToken(request)
    if (isAuthError(authResult)) return unauthorizedResponse(authResult)

    const { projectId } = await params
    projectIdForStatus = projectId
    const body = await request.json().catch(() => ({}))
    const instruction = typeof body.instruction === "string" ? body.instruction.trim() : undefined
    const project = await verifySlidesProject(projectId, authResult.userId)

    await updateProject(projectId, { slidesStatus: "designing_slides" })
    const deck = await attachSlideCodeToDeck({
      deck: project.slidesDeck!,
      story: project.slidesDeckStory!,
      sources: project.slidesSources ?? [],
      intent: instruction,
    })
    await updateProject(projectId, { slidesDeck: deck, slidesStatus: "ready" })

    return NextResponse.json({ success: true, slidesDeck: deck, slidesStatus: "ready" })
  } catch (error) {
    logError("slides_regenerate_code", { error: String(error) })
    if (projectIdForStatus) {
      await updateProject(projectIdForStatus, { slidesStatus: "failed" }).catch(() => undefined)
    }
    const message = error instanceof Error ? error.message : "Failed to regenerate Slides slideCode"
    const status = message.includes("Access denied") ? 403 : message.includes("not found") ? 404 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
