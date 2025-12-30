import { NextRequest, NextResponse } from "next/server"
import { verifyAuthToken, isAuthError, unauthorizedResponse } from "./auth"
import { getUserBlueprints, createBlueprint } from "./service"

// GET /api/blueprints - List user's blueprints
export async function GET(request: NextRequest) {
    try {
        const authResult = await verifyAuthToken(request)

        if (isAuthError(authResult)) {
            return unauthorizedResponse(authResult)
        }

        const blueprints = await getUserBlueprints(authResult.userId)

        return NextResponse.json({ blueprints })
    } catch (error) {
        console.error("List blueprints error:", error)
        return NextResponse.json({ error: "Failed to list blueprints" }, { status: 500 })
    }
}

// POST /api/blueprints - Create new blueprint
export async function POST(request: NextRequest) {
    try {
        const authResult = await verifyAuthToken(request)

        if (isAuthError(authResult)) {
            return unauthorizedResponse(authResult)
        }

        const body = await request.json()
        const { projectName } = body

        if (!projectName) {
            return NextResponse.json({ error: "Project name required" }, { status: 400 })
        }

        const blueprint = await createBlueprint({
            userId: authResult.userId,
            projectName,
        })

        return NextResponse.json(blueprint)
    } catch (error) {
        console.error("Create blueprint error:", error)
        return NextResponse.json({ error: "Failed to create blueprint" }, { status: 500 })
    }
}
