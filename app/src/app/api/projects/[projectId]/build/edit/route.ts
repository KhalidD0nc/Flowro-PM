import { NextRequest, NextResponse } from "next/server"
import { mkdirSync } from "fs"
import { homedir } from "os"
import path from "path"
import { verifyAuthToken, isAuthError, unauthorizedResponse } from "@/app/api/blueprints/auth"
import { logError } from "@/lib/logger"
import {
    createBuildRun,
    getBuildRuns,
    getProject,
    getProjectPlanByProjectId,
    setProjectStage,
} from "@/lib/firebase/collections"
import { timestampToISO } from "@/lib/firebase/schema"
import { executeEditRun } from "@/lib/build-worker/editExecutor"
import { getBuildStartPlanError } from "@/lib/build-worker/startGuard"
import { createBuildContract, getTemplateManifest } from "@/lib/project-plan/schema"
import { buildStage3Prompt } from "@/lib/build-worker/agentPrompt"

const BUILD_MODEL = process.env.OPENROUTER_MODEL_BUILD || "moonshotai/kimi-k2.6"
const GENERATED_APPS_BASE = process.env.FLOWRO_GENERATED_APPS_PATH || path.join(homedir(), "Desktop", "Flowro-Apps")

function getTargetWorkspacePath(projectId: string): string {
    return path.join(GENERATED_APPS_BASE, projectId)
}

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

        const body = await request.json().catch(() => ({}))
        const instruction = typeof body.instruction === "string" ? body.instruction.trim() : ""
        if (!instruction) {
            return NextResponse.json({ error: "instruction is required" }, { status: 400 })
        }

        const latestRuns = await getBuildRuns(projectId)
        const latestSuccessfulPreview = latestRuns.find((run) => run.status === "success" && run.previewAvailable && run.previewUrl)
        if (!latestSuccessfulPreview) {
            return NextResponse.json({ error: "Start and complete a build before applying targeted edits." }, { status: 409 })
        }

        const planDoc = await getProjectPlanByProjectId(projectId)
        const planError = getBuildStartPlanError(planDoc)
        if (planError) {
            return NextResponse.json({ error: planError.error }, { status: planError.status })
        }

        const templateManifest = getTemplateManifest("vite-react-app")
        const buildPlan = {
            ...planDoc!.plan,
            templateId: templateManifest.id,
        }
        const buildContract = createBuildContract(projectId, buildPlan, templateManifest)
        const targetWorkspacePath = getTargetWorkspacePath(projectId)
        mkdirSync(targetWorkspacePath, { recursive: true })

        const promptSnapshot = buildStage3Prompt({
            projectId,
            projectPlan: buildPlan,
            buildContract,
            templateManifest,
            targetWorkspacePath,
            editablePaths: templateManifest.editablePaths,
            commands: templateManifest.scripts,
        })

        await setProjectStage(projectId, "coding")
        const run = await createBuildRun({
            projectId,
            templateId: templateManifest.id,
            status: "queued",
            steps: ["Targeted edit queued"],
            logs: [`[build-worker] Queued targeted edit with model ${BUILD_MODEL}: ${instruction}`],
            filesChanged: [],
            previewUrl: latestSuccessfulPreview.previewUrl ?? null,
            phase: "queued",
            currentAction: "Queued targeted edit worker",
            totalFiles: 0,
            completedFiles: 0,
            fallbackUsed: false,
            promptPreview: promptSnapshot.slice(0, 1000),
            promptSnapshot,
            targetWorkspacePath,
            model: BUILD_MODEL,
            agentStatus: "prompt_ready",
            commandsRun: [],
            previewAvailable: true,
            buildContractSnapshot: buildContract,
            verificationResults: [],
            detectedPackages: [],
            installedPackages: [],
            validationErrors: [],
            repairAttempts: 0,
            runType: "edit",
            editInstruction: instruction,
        })

        const job = {
            projectId,
            projectPlan: buildPlan,
            buildContract,
            templateManifest,
            targetWorkspacePath,
            editablePaths: templateManifest.editablePaths,
            commands: templateManifest.scripts,
        }

        Promise.resolve().then(() =>
            executeEditRun(projectId, run.id, job, instruction).catch((err) => {
                logError("edit_run_executor", { runId: run.id, error: String(err) })
            })
        )

        return NextResponse.json({
            ...run,
            createdAt: timestampToISO(run.createdAt),
            updatedAt: timestampToISO(run.updatedAt),
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to start targeted edit"
        const status = message.includes("Access denied") ? 403 : message.includes("not found") ? 404 : 500
        return NextResponse.json({ error: message }, { status })
    }
}
