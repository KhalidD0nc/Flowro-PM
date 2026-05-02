import { NextRequest, NextResponse } from "next/server"
import { verifyAuthToken, isAuthError, unauthorizedResponse } from "@/app/api/blueprints/auth"
import {
    createBuildRun,
    getProject,
    getProjectPlanByProjectId,
    setProjectStage,
} from "@/lib/firebase/collections"
import { timestampToISO } from "@/lib/firebase/schema"
import { buildStage3Prompt } from "@/lib/build-worker/agentPrompt"
import { executeBuildRun } from "@/lib/build-worker/executor"
import { getBuildStartPlanError } from "@/lib/build-worker/startGuard"
import { createBuildContract, getTemplateManifest } from "@/lib/project-plan/schema"
import { mkdirSync } from "fs"
import { homedir } from "os"
import path from "path"

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

        const promptPreview = promptSnapshot.slice(0, 1000)

        await setProjectStage(projectId, "coding")
        const run = await createBuildRun({
            projectId,
            templateId: templateManifest.id,
            status: "queued",
            steps: ["Build queued"],
            logs: [`[build-worker] Queued build with model ${BUILD_MODEL}`],
            filesChanged: [],
            previewUrl: null,
            phase: "queued",
            currentAction: "Queued build worker",
            totalFiles: 0,
            completedFiles: 0,
            fallbackUsed: false,
            promptPreview,
            promptSnapshot,
            targetWorkspacePath,
            model: BUILD_MODEL,
            agentStatus: "prompt_ready",
            commandsRun: [],
            previewAvailable: false,
            buildContractSnapshot: buildContract,
            verificationResults: [],
            detectedPackages: [],
            installedPackages: [],
            validationErrors: [],
            repairAttempts: 0,
        })

        // Fire build execution in the background so the HTTP response returns immediately
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
            executeBuildRun(projectId, run.id, job).catch((err) => {
                console.error(`[build-run ${run.id}] Unhandled executor error:`, err)
            })
        )

        return NextResponse.json({
            ...run,
            createdAt: timestampToISO(run.createdAt),
            updatedAt: timestampToISO(run.updatedAt),
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to start build"
        const status = message.includes("Access denied") ? 403 : message.includes("not found") ? 404 : 500
        return NextResponse.json({ error: message }, { status })
    }
}
