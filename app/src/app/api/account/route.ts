import { NextRequest, NextResponse } from "next/server"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"
import { logError } from "@/lib/logger"

export async function DELETE(request: NextRequest) {
    try {
        const adminAuth = getAdminAuth()
        const adminDb = getAdminDb()

        // Get the authorization token
        const authHeader = request.headers.get("Authorization")
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const token = authHeader.split("Bearer ")[1]
        const decodedToken = await adminAuth.verifyIdToken(token)
        const userId = decodedToken.uid

        // Delete user data from Firestore
        const batch = adminDb.batch()

        // 1. Delete all user's projects
        const projectsSnapshot = await adminDb
            .collection("projects")
            .where("userId", "==", userId)
            .get()

        for (const doc of projectsSnapshot.docs) {
            // Delete blueprints for each project
            const blueprintsSnapshot = await adminDb
                .collection("blueprints")
                .where("projectId", "==", doc.id)
                .get()

            blueprintsSnapshot.docs.forEach((bpDoc) => {
                batch.delete(bpDoc.ref)
            })

            batch.delete(doc.ref)
        }

        // 2. Delete user document
        const userRef = adminDb.collection("users").doc(userId)
        batch.delete(userRef)

        // Commit the batch
        await batch.commit()

        // 3. Delete user from Firebase Auth
        await adminAuth.deleteUser(userId)

        return NextResponse.json({ success: true })
    } catch (error) {
        logError("delete_account", { error: String(error) })
        return NextResponse.json(
            { error: "Failed to delete account" },
            { status: 500 }
        )
    }
}

