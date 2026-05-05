import { NextRequest, NextResponse } from "next/server"
import { verifyAuthToken, isAuthError, unauthorizedResponse } from "@/app/api/blueprints/auth"
import { getBuildRuns, getProject, setProjectStage, updateBuildRun } from "@/lib/firebase/collections"
import { getPreviewPort, isServerReady, runCommand, startDevServer } from "@/lib/build-worker/fs"
import { validateVitePreview } from "@/lib/build-worker/vite"
import { findLatestRecoverablePreviewRun, findLatestRelaunchablePreviewRun } from "@/lib/previewSelection"

const CHECK_TIMEOUT_MS = 2000
const RELAUNCH_READY_TIMEOUT_MS = 30000
const BUILD_TIMEOUT_MS = 180000

async function verifyOwnership(projectId: string, userId: string): Promise<void> {
    const project = await getProject(projectId)
    if (!project) throw new Error("Project not found")
    if (project.userId !== userId) throw new Error("Access denied")
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const authResult = await verifyAuthToken(request)
        if (isAuthError(authResult)) return unauthorizedResponse(authResult)

        const { projectId } = await params
        await verifyOwnership(projectId, authResult.userId)

        const runs = await getBuildRuns(projectId)
        const successRun = findLatestRelaunchablePreviewRun(runs)
        const recoverableRun = successRun ?? findLatestRecoverablePreviewRun(runs)

        if (!recoverableRun?.targetWorkspacePath) {
            return NextResponse.json({ error: "No reusable build workspace found" }, { status: 404 })
        }

        const port = getPreviewPort(projectId)
        const previewUrl = `http://localhost:${port}`

        const alive = await isServerReady(previewUrl, CHECK_TIMEOUT_MS, 400)
        if (!alive) {
            startDevServer(recoverableRun.targetWorkspacePath, projectId, port)
            // Give the server a moment to bind before the client polls
            await new Promise((r) => setTimeout(r, 800))
        }

        const ready = alive || await isServerReady(previewUrl, RELAUNCH_READY_TIMEOUT_MS, 500)
        const validation = ready
            ? await validateVitePreview(previewUrl)
            : { success: false, errors: ["Preview server did not become ready"], warnings: [] }

        if (!validation.success) {
            return NextResponse.json({ error: `Preview relaunch failed: ${validation.errors.join("; ")}` }, { status: 502 })
        }

        if (recoverableRun.status !== "success" || !recoverableRun.previewAvailable) {
            const diagnosticBuild = await runCommand(
                recoverableRun.targetWorkspacePath,
                "npm run build",
                BUILD_TIMEOUT_MS,
                undefined,
                { env: { NODE_ENV: "production" } },
            )

            if (diagnosticBuild.exitCode !== 0) {
                const output = `${diagnosticBuild.stderr}\n${diagnosticBuild.stdout}`
                    .split("\n")
                    .map((line) => line.trim())
                    .filter(Boolean)
                    .join(" ")
                    .slice(0, 400)
                return NextResponse.json({ error: `Existing workspace still fails production build: ${output}` }, { status: 409 })
            }

            await updateBuildRun(projectId, recoverableRun.id, {
                status: "success",
                phase: "completed",
                agentStatus: "completed",
                previewUrl,
                previewAvailable: true,
                validationErrors: [],
                currentAction: "Preview relaunched from existing workspace",
                logs: [
                    ...(recoverableRun.logs ?? []),
                    "[build-worker] Preview relaunched from existing workspace",
                ],
                steps: [
                    ...(recoverableRun.steps ?? []),
                    "Preview relaunched from existing workspace",
                ],
            })
            await setProjectStage(projectId, "preview_ready")
        }

        return NextResponse.json({ previewUrl, wasRestarted: !alive, runId: recoverableRun.id, recovered: recoverableRun.id !== successRun?.id })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to relaunch preview"
        const status = message.includes("Access denied") ? 403 : message.includes("not found") ? 404 : 500
        return NextResponse.json({ error: message }, { status })
    }
}
