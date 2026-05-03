import { NextRequest, NextResponse } from "next/server"
import { verifyAuthToken, isAuthError, unauthorizedResponse } from "../../../blueprints/auth"
import { logError } from "@/lib/logger"
import {
    getBlueprint,
    getProject,
    getBlueprintHistory,
    getHistorySnapshot,
} from "@/lib/firebase/collections"
import { timestampToISO } from "@/lib/firebase/schema"

/**
 * Verify that the authenticated user owns the blueprint's project
 */
async function verifyBlueprintOwnership(blueprintId: string, userId: string): Promise<void> {
    const blueprint = await getBlueprint(blueprintId)
    if (!blueprint) {
        throw new Error("Blueprint not found")
    }

    const project = await getProject(blueprint.projectId)
    if (!project) {
        throw new Error("Project not found")
    }
    if (project.userId !== userId) {
        throw new Error("Access denied: you do not own this blueprint")
    }
}

/**
 * GET /api/blueprints/[blueprintId]/history - Fetch blueprint version history
 * 
 * Returns all version snapshots for a blueprint, ordered by timestamp (newest first).
 * Each snapshot contains the frozen UBP state at that point in time.
 * 
 * Query Parameters:
 * - snapshotId: Optional. If provided, returns only that specific snapshot
 * 
 * @returns { history: BlueprintHistoryDocument[] } or { snapshot: BlueprintHistoryDocument }
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ blueprintId: string }> }
) {
    try {
        const authResult = await verifyAuthToken(request)

        if (isAuthError(authResult)) {
            return unauthorizedResponse(authResult)
        }

        const { blueprintId } = await params
        const { searchParams } = new URL(request.url)
        const snapshotId = searchParams.get("snapshotId")

        // Verify ownership
        await verifyBlueprintOwnership(blueprintId, authResult.userId)

        // If snapshotId provided, return specific snapshot
        if (snapshotId) {
            const snapshot = await getHistorySnapshot(blueprintId, snapshotId)

            if (!snapshot) {
                return NextResponse.json(
                    { error: "Snapshot not found" },
                    { status: 404 }
                )
            }

            return NextResponse.json({
                snapshot: {
                    id: snapshot.id,
                    contentSnapshot: snapshot.contentSnapshot,
                    triggeringMessageId: snapshot.triggeringMessageId,
                    version: snapshot.version,
                    changeDescription: snapshot.changeDescription,
                    timestamp: timestampToISO(snapshot.timestamp),
                },
            })
        }

        // Return full history
        const history = await getBlueprintHistory(blueprintId)

        return NextResponse.json({
            history: history.map((snapshot) => ({
                id: snapshot.id,
                contentSnapshot: snapshot.contentSnapshot,
                triggeringMessageId: snapshot.triggeringMessageId,
                version: snapshot.version,
                changeDescription: snapshot.changeDescription,
                timestamp: timestampToISO(snapshot.timestamp),
            })),
        })
    } catch (error) {
        logError("get_blueprint_history", { error: String(error) })
        const message = error instanceof Error ? error.message : "Failed to get blueprint history"
        const status = message.includes("Access denied")
            ? 403
            : message.includes("not found")
              ? 404
              : 500
        return NextResponse.json({ error: message }, { status })
    }
}
