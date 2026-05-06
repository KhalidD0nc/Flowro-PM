import { NextRequest, NextResponse } from "next/server"
import { verifyAuthToken, isAuthError, unauthorizedResponse } from "./auth"
import { logError } from "@/lib/logger"
import {
    getProject,
    getBlueprintByProjectId,
    getBlueprintHistory,
    getBlueprint,
    upsertBlueprintFromAI,
    saveBlueprintVersion,
} from "@/lib/firebase/collections"
import { getAdminDb } from "@/lib/firebase-admin"
import { Timestamp } from "firebase-admin/firestore"
import { COLLECTIONS, timestampToISO, type UBPContent } from "@/lib/firebase/schema"

async function verifyProjectOwnership(projectId: string, userId: string): Promise<void> {
    const project = await getProject(projectId)
    if (!project) {
        throw new Error("Project not found")
    }
    if (project.userId !== userId) {
        throw new Error("Access denied: you do not own this project")
    }
}

type BlueprintResponse = {
    id: string
    projectId: string
    version: string
    status: "draft" | "locked" | "approved"
    content: unknown | null
    createdAt: string
    lockedAt?: string
}

function mapBlueprintResponse(input: {
    id: string
    projectId: string
    content: unknown | null
    createdAt: string
}): BlueprintResponse {
    const contentObj = (input.content || {}) as Record<string, unknown>
    const metadata = (contentObj.metadata || {}) as Record<string, unknown>
    const version = (metadata.version as string) || "1.0"
    const status = (metadata.status as "draft" | "locked" | "approved") || "draft"

    return {
        id: input.id,
        projectId: input.projectId,
        version,
        status,
        content: input.content,
        createdAt: input.createdAt,
        lockedAt: undefined,
    }
}

// GET /api/blueprints?projectId=xxx - List blueprints for a project
export async function GET(request: NextRequest) {
    try {
        const authResult = await verifyAuthToken(request)

        if (isAuthError(authResult)) {
            return unauthorizedResponse(authResult)
        }

        const { searchParams } = new URL(request.url)
        const projectId = searchParams.get("projectId")

        if (!projectId) {
            return NextResponse.json({ error: "projectId query parameter required" }, { status: 400 })
        }

        await verifyProjectOwnership(projectId, authResult.userId)

        const blueprint = await getBlueprintByProjectId(projectId)
        if (!blueprint) {
            return NextResponse.json({ blueprints: [] })
        }

        const history = await getBlueprintHistory(blueprint.id)
        const currentVersion = blueprint.content?.metadata?.version || "1.0"

        const current = mapBlueprintResponse({
            id: blueprint.id,
            projectId: blueprint.projectId,
            content: blueprint.content ?? null,
            createdAt: timestampToISO(blueprint.updatedAt),
        })

        const historyEntries = history
            .filter((snapshot) => snapshot.version !== currentVersion)
            .map((snapshot) =>
                mapBlueprintResponse({
                    id: snapshot.id,
                    projectId: blueprint.projectId,
                    content: snapshot.contentSnapshot ?? null,
                    createdAt: timestampToISO(snapshot.timestamp),
                })
            )

        const blueprints = [current, ...historyEntries].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )

        return NextResponse.json({ blueprints })
    } catch (error) {
        logError("list_blueprints", { error: String(error) })
        const message = error instanceof Error ? error.message : "Failed to list blueprints"
        const status = message.includes("Access denied") ? 403 : message.includes("not found") ? 404 : 500
        return NextResponse.json({ error: message }, { status })
    }
}

// POST /api/blueprints - Create new blueprint version for a project
export async function POST(request: NextRequest) {
    try {
        const authResult = await verifyAuthToken(request)

        if (isAuthError(authResult)) {
            return unauthorizedResponse(authResult)
        }

        const body = await request.json()
        const { projectId, content } = body

        if (!projectId) {
            return NextResponse.json({ error: "projectId required" }, { status: 400 })
        }

        await verifyProjectOwnership(projectId, authResult.userId)

        if (!content) {
            return NextResponse.json({ error: "content required" }, { status: 400 })
        }

        await upsertBlueprintFromAI(projectId, content as UBPContent, undefined, "Manual creation")

        return NextResponse.json({ success: true })
    } catch (error) {
        logError("create_blueprint", { error: String(error) })
        const message = error instanceof Error ? error.message : "Failed to create blueprint"
        const status = message.includes("Access denied") ? 403 : message.includes("not found") ? 404 : 500
        return NextResponse.json({ error: message }, { status })
    }
}

// PATCH /api/blueprints - Update blueprint content or lock it
export async function PATCH(request: NextRequest) {
    try {
        const authResult = await verifyAuthToken(request)

        if (isAuthError(authResult)) {
            return unauthorizedResponse(authResult)
        }

        const body = await request.json()
        const { blueprintId, content, action } = body

        if (!blueprintId) {
            return NextResponse.json({ error: "blueprintId required" }, { status: 400 })
        }

        // Fetch blueprint to get its actual projectId (never trust client-supplied projectId for auth)
        const blueprint = await getBlueprint(blueprintId)
        if (!blueprint) {
            return NextResponse.json({ error: "Blueprint not found" }, { status: 404 })
        }

        // Verify ownership using the blueprint's projectId (source of truth)
        await verifyProjectOwnership(blueprint.projectId, authResult.userId)

        if (action === "save-version") {
            const result = await saveBlueprintVersion(blueprintId)
            const lockedBlueprint = mapBlueprintResponse({
                id: result.lockedSnapshot.id,
                projectId: result.blueprint.projectId,
                content: result.lockedSnapshot.contentSnapshot,
                createdAt: timestampToISO(result.lockedSnapshot.timestamp),
            })
            const newDraft = mapBlueprintResponse({
                id: result.blueprint.id,
                projectId: result.blueprint.projectId,
                content: result.blueprint.content,
                createdAt: timestampToISO(result.blueprint.updatedAt),
            })

            return NextResponse.json({
                success: true,
                message: "Version saved as milestone",
                lockedBlueprint,
                newDraft,
            })
        }

        if (action === "lock" || action === "unlock") {
            const now = Timestamp.now()
            const currentVersion = blueprint.content.metadata?.version || "1.0"
            const productName = blueprint.content.metadata?.productName || ""
            const status = action === "lock" ? "locked" : "draft"

            const updatedContent: UBPContent = {
                ...blueprint.content,
                metadata: {
                    ...blueprint.content.metadata,
                    productName,
                    version: currentVersion,
                    status,
                },
            }

            await getAdminDb().collection(COLLECTIONS.BLUEPRINTS).doc(blueprintId).update({
                content: updatedContent,
                updatedAt: now,
            })

            return NextResponse.json({
                success: true,
                message: action === "lock" ? "Blueprint locked" : "Blueprint unlocked",
            })
        }

        if (content !== undefined) {
            await upsertBlueprintFromAI(blueprint.projectId, content as UBPContent, undefined, "Manual update")
            
            return NextResponse.json({ success: true, message: "Blueprint content updated" })
        }

        return NextResponse.json({ error: "No action or content provided" }, { status: 400 })
    } catch (error) {
        logError("update_blueprint", { error: String(error) })
        const message = error instanceof Error ? error.message : "Failed to update blueprint"
        const status = message.includes("Access denied") ? 403 :
            message.includes("not found") ? 404 :
                message.includes("locked") ? 409 : 500
        return NextResponse.json({ error: message }, { status })
    }
}
