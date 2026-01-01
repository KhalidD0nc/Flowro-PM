import { NextRequest, NextResponse } from "next/server"
import { verifyAuthToken, isAuthError, unauthorizedResponse } from "./auth"
import { getProjectBlueprints, getBlueprintById, updateBlueprintContent, lockBlueprint, createBlueprintVersion } from "./service"

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

        const blueprints = await getProjectBlueprints(projectId)

        return NextResponse.json({ blueprints })
    } catch (error) {
        console.error("List blueprints error:", error)
        return NextResponse.json({ error: "Failed to list blueprints" }, { status: 500 })
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

        const blueprint = await createBlueprintVersion(projectId, version || "0.1")

        return NextResponse.json(blueprint)
    } catch (error) {
        console.error("Create blueprint error:", error)
        return NextResponse.json({ error: "Failed to create blueprint" }, { status: 500 })
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

        // Lock action
        if (action === "lock") {
            await lockBlueprint(blueprintId)
            return NextResponse.json({ success: true, message: "Blueprint locked" })
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
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
