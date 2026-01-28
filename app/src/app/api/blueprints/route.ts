import { NextRequest, NextResponse } from "next/server"
import { verifyAuthToken, isAuthError, unauthorizedResponse } from "./auth"
import {
    getProjectBlueprints,
    updateBlueprintContent,
    lockBlueprint,
    unlockBlueprint,
    createBlueprintVersion,
    saveVersion,
    verifyProjectOwnership,
    verifyBlueprintOwnership
} from "./service"

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

        // Verify user owns this project before returning blueprints
        await verifyProjectOwnership(projectId, authResult.userId)

        const blueprints = await getProjectBlueprints(projectId)

        return NextResponse.json({ blueprints })
    } catch (error) {
        console.error("List blueprints error:", error)
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
        const { projectId, version } = body

        if (!projectId) {
            return NextResponse.json({ error: "projectId required" }, { status: 400 })
        }

        // Verify user owns this project before creating blueprint
        await verifyProjectOwnership(projectId, authResult.userId)

        const blueprint = await createBlueprintVersion(projectId, version || "0.1")

        return NextResponse.json(blueprint)
    } catch (error) {
        console.error("Create blueprint error:", error)
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

        // Verify user owns this blueprint before modifying
        await verifyBlueprintOwnership(blueprintId, authResult.userId)

        // Lock action
        if (action === "lock") {
            await lockBlueprint(blueprintId)
            return NextResponse.json({ success: true, message: "Blueprint locked" })
        }

        // Unlock action - revert a locked blueprint to draft status
        if (action === "unlock") {
            await unlockBlueprint(blueprintId)
            return NextResponse.json({ success: true, message: "Blueprint unlocked" })
        }

        // Save Version action - lock current and create new draft
        if (action === "save-version") {
            const result = await saveVersion(blueprintId)
            return NextResponse.json({
                success: true,
                message: "Version saved as milestone",
                lockedBlueprint: result.lockedBlueprint,
                newDraft: result.newDraft
            })
        }

        // Update content
        if (content !== undefined) {
            await updateBlueprintContent(blueprintId, content)
            return NextResponse.json({ success: true, message: "Blueprint content updated" })
        }

        return NextResponse.json({ error: "No action or content provided" }, { status: 400 })
    } catch (error) {
        console.error("Update blueprint error:", error)
        const message = error instanceof Error ? error.message : "Failed to update blueprint"
        const status = message.includes("Access denied") ? 403 :
            message.includes("not found") ? 404 :
                message.includes("locked") ? 409 : 500
        return NextResponse.json({ error: message }, { status })
    }
}
