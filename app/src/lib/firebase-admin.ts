import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"

// Initialize Firebase Admin (for server-side)
// Initialize Firebase Admin (for server-side)
function formatPrivateKey(key: string) {
    return key.replace(/\\n/g, "\n")
}

export function getAdminApp() {
    if (getApps().length > 0) {
        return getApps()[0]
    }

    const projectId = process.env.FIREBASE_PROJECT_ID
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    const privateKey = process.env.FIREBASE_PRIVATE_KEY

    if (!projectId || !clientEmail || !privateKey) {
        throw new Error(
            "Missing Firebase Admin environment variables. " +
            "Check FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY."
        )
    }

    return initializeApp({
        credential: cert({
            projectId,
            clientEmail,
            privateKey: formatPrivateKey(privateKey),
        }),
    })
}

export function getAdminAuth() {
    return getAuth(getAdminApp())
}

export function getAdminDb() {
    return getFirestore(getAdminApp())
}
