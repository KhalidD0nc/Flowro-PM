import { NextRequest, NextResponse } from "next/server"
import { isAuthError, unauthorizedResponse, verifyAuthToken } from "../../../../blueprints/auth"
import { getProject, updateProject } from "@/lib/firebase/collections"
import { logError } from "@/lib/logger"
import { exportSlidesDeckCodeToPptx, exportSlidesDeckToPdf, exportSlidesDeckToPptx } from "@/lib/slides/export"

function filenameFor(name: string, extension: string) {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "flowro-slides"}.${extension}`
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const authResult = await verifyAuthToken(request)
    if (isAuthError(authResult)) return unauthorizedResponse(authResult)

    const { projectId } = await params
    const project = await getProject(projectId)
    if (!project) throw new Error("Project not found")
    if (project.userId !== authResult.userId) throw new Error("Access denied: you do not own this project")
    if ((project.projectType ?? "app") !== "slides") throw new Error("Project is not a Slides workspace")
    if (!project.slidesDeck) throw new Error("Generate a Slides deck before exporting")

    const format = request.nextUrl.searchParams.get("format") === "pdf" ? "pdf" : "pptx"
    await updateProject(projectId, { slidesStatus: "rendering" })
    // Path A: prefer LLM-emitted slideCode for pptx export when present (real shapes/charts/text).
    // Legacy JSON exporter is the fallback while the slideCode pipeline is still being validated.
    const deck = project.slidesDeck
    const slideCode = deck.diagnostics?.slideCodeProvider !== "deterministic" ? deck.slideCode : undefined
    const bytes = format === "pdf"
      ? exportSlidesDeckToPdf(deck)
      : slideCode
        ? await exportSlidesDeckCodeToPptx({
            slideCode,
            assets: deck.assets,
            title: deck.title,
            subtitle: deck.subtitle,
          }).catch(async (err) => {
            logError("slides_export_slidecode_fallback", { error: String(err) })
            return await exportSlidesDeckToPptx(deck)
          })
        : await exportSlidesDeckToPptx(deck)
    await updateProject(projectId, { slidesStatus: "ready" })

    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": format === "pdf"
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${filenameFor(project.name, format)}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    logError("slides_export", { error: String(error) })
    const message = error instanceof Error ? error.message : "Failed to export Slides deck"
    const status = message.includes("Access denied") ? 403 : message.includes("not found") ? 404 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
