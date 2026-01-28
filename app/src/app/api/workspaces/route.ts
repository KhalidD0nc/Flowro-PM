import { NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"
import { createWorkspace, getUserWorkspaces, ensurePersonalWorkspace } from "./service"

// Helper to get user from token
async function getUserFromRequest(request: NextRequest) {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
        return null
    }
    const token = authHeader.split("Bearer ")[1]
    try {
        const decodedToken = await getAuth().verifyIdToken(token)
        return decodedToken
    } catch (error) {
        return null
    }
}

export async function GET(request: NextRequest) {
    const user = await getUserFromRequest(request)
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        // Ensure the user has at least one workspace (migration aid)
        // If they have none, this will create "Personal" and return it in the list.
        await ensurePersonalWorkspace(user.uid, user.name)

        const workspaces = await getUserWorkspaces(user.uid)
        return NextResponse.json({ workspaces })
    } catch (error) {
        console.error("Error fetching workspaces:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    const user = await getUserFromRequest(request)
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        const { name } = await request.json()
        if (!name) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 })
        }

        const workspace = await createWorkspace({
            userId: user.uid,
            name
        })

        return NextResponse.json(workspace)
    } catch (error) {
        console.error("Error creating workspace:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
