import { NextRequest, NextResponse } from "next/server"
import { isAuthError, unauthorizedResponse, verifyAuthToken } from "../../../../blueprints/auth"
import { getProject, updateProject } from "@/lib/firebase/collections"
import { logError } from "@/lib/logger"
import { generateSlidesDeck } from "@/lib/slides/deck"

async function verifySlidesProject(projectId: string, userId: string) {
  const project = await getProject(projectId)
  if (!project) throw new Error("Project not found")
  if (project.userId !== userId) throw new Error("Access denied: you do not own this project")
  if ((project.projectType ?? "app") !== "slides") throw new Error("Project is not a Slides workspace")
  if (!project.slidesDeckStory) throw new Error("Slides story is required before slide generation")
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
    const project = await verifySlidesProject(projectId, authResult.userId)

    await updateProject(projectId, { slidesStatus: "drafting" })
    const deck = await generateSlidesDeck({
      story: project.slidesDeckStory!,
      sources: project.slidesSources ?? [],
    })
    await updateProject(projectId, { slidesDeck: deck, slidesStatus: "ready" })

    return NextResponse.json({ success: true, slidesDeck: deck, slidesStatus: "ready" })
  } catch (error) {
    logError("slides_generate", { error: String(error) })
    const message = error instanceof Error ? error.message : "Failed to generate Slides deck"
    const status = message.includes("Access denied") ? 403 : message.includes("not found") ? 404 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
