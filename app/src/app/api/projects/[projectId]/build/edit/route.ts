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
import { buildPrompt, type BuildJob } from "@/lib/build-worker/agentPrompt"

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

        const plan = planDoc!.plan
        const hasDatabase = plan.database?.provider === "supabase_postgres"
        const templateId = hasDatabase ? "vite-react-supabase-app" : "vite-react-app"
        const templateManifest = getTemplateManifest(templateId)
        const buildPlan = {
            ...plan,
            templateId: templateManifest.id,
        }
        const buildContract = createBuildContract(projectId, buildPlan, templateManifest)
        const targetWorkspacePath = getTargetWorkspacePath(projectId)
        mkdirSync(targetWorkspacePath, { recursive: true })

        // Detect Arabic from the edit instruction or the existing plan
        const planRaw = JSON.stringify(buildPlan)
        const planText = planRaw.toLowerCase()
        const instructionLower = instruction.toLowerCase()
        let designArchetype: BuildJob["designArchetype"] = "saas"
        const hasArabicChars = /[؀-ۿ]/.test(planRaw) || /[؀-ۿ]/.test(instruction)
        const hasArabicKeyword = instructionLower.includes("arabic") || instructionLower.includes("in arabic") || instructionLower.includes("make it arabic") || instruction.includes("عربي") || instruction.includes("بالعربي") || planText.includes("arabic") || planRaw.includes("عربي")
        if (hasArabicChars || hasArabicKeyword) {
            designArchetype = "arabic"
        } else if (planText.includes("portfolio") || planText.includes("blog") || planText.includes("creative") || planText.includes("editorial")) {
            designArchetype = "editorial"
        } else if (planText.includes("dark") || planText.includes("night") || planText.includes("crypto") || planText.includes("gaming")) {
            designArchetype = "darkmode"
        } else if (planText.includes("playful") || planText.includes("fun") || planText.includes("kids") || planText.includes("community")) {
            designArchetype = "playful"
        } else if (planText.includes("minimal") || planText.includes("swiss") || planText.includes("luxury")) {
            designArchetype = "minimal"
        }

        const promptSnapshot = buildPrompt({
            projectId,
            projectPlan: buildPlan,
            buildContract,
            templateManifest,
            targetWorkspacePath,
            editablePaths: templateManifest.editablePaths,
            commands: templateManifest.scripts,
            designArchetype,
            supabaseConfig: plan.database,
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
            designArchetype,
            supabaseConfig: plan.database,
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
