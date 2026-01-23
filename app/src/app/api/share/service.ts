import { getAdminDb } from "@/lib/firebase-admin"
import { nanoid } from "nanoid"

// =============================================================================
// Types
// =============================================================================

/**
 * ShareToken - Represents a public shareable link to a blueprint
 */
export interface ShareToken {
    id: string
    token: string // Unique share ID (e.g., "abc123def456")
    blueprintId: string // Foreign key to blueprints collection
    projectId: string // Foreign key to projects collection (for easier querying)
    createdBy: string // User ID who created the share
    expiresAt: string | null // Null = never expires
    viewCount: number // Track how many times link was viewed
    lastViewedAt: string | null // Last time someone viewed the link
    isActive: boolean // Allow revocation
    createdAt: string
}

export interface CreateShareTokenInput {
    blueprintId: string
    projectId: string
    createdBy: string
    expiresAt?: string | null
}

// =============================================================================
// Share Token Service Functions
// =============================================================================

/**
 * Creates a new share token for a blueprint
 * Generates a unique 12-character token ID
 */
export async function createShareToken(input: CreateShareTokenInput): Promise<ShareToken> {
    const db = getAdminDb()
    const now = new Date().toISOString()

    // Generate unique token (12 characters, URL-safe)
    const token = nanoid(12)

    const shareTokenData = {
        token,
        blueprintId: input.blueprintId,
        projectId: input.projectId,
        createdBy: input.createdBy,
        expiresAt: input.expiresAt || null,
        viewCount: 0,
        lastViewedAt: null,
        isActive: true,
        createdAt: now,
    }

    const shareTokenRef = await db.collection("shareTokens").add(shareTokenData)

    return {
        id: shareTokenRef.id,
        ...shareTokenData,
    }
}

/**
 * Gets a share token by its unique token string
 * Returns null if not found or inactive/expired
 */
export async function getShareByToken(token: string): Promise<ShareToken | null> {
    const db = getAdminDb()

    const snapshot = await db
        .collection("shareTokens")
        .where("token", "==", token)
        .where("isActive", "==", true)
        .limit(1)
        .get()

    if (snapshot.empty) {
        return null
    }

    const doc = snapshot.docs[0]
    const shareData = {
        id: doc.id,
        ...doc.data(),
    } as ShareToken

    // Check if expired
    if (shareData.expiresAt && new Date(shareData.expiresAt) < new Date()) {
        return null
    }

    return shareData
}

/**
 * Gets share token by blueprint ID
 * Returns the most recent active share token for a blueprint
 */
export async function getShareByBlueprintId(blueprintId: string): Promise<ShareToken | null> {
    const db = getAdminDb()

    const snapshot = await db
        .collection("shareTokens")
        .where("blueprintId", "==", blueprintId)
        .where("isActive", "==", true)
        .get()

    if (snapshot.empty) {
        return null
    }

    // Sort by creation date and return the most recent
    const shares = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
    })) as ShareToken[]

    shares.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    return shares[0]
}

/**
 * Increments view count for a share token
 */
export async function incrementViewCount(token: string): Promise<void> {
    const db = getAdminDb()

    const snapshot = await db
        .collection("shareTokens")
        .where("token", "==", token)
        .limit(1)
        .get()

    if (snapshot.empty) {
        return
    }

    const doc = snapshot.docs[0]
    const shareData = doc.data()

    await doc.ref.update({
        viewCount: (shareData.viewCount || 0) + 1,
        lastViewedAt: new Date().toISOString(),
    })
}

/**
 * Revokes (deactivates) a share token
 */
export async function revokeShareToken(token: string, userId: string): Promise<void> {
    const db = getAdminDb()

    const snapshot = await db
        .collection("shareTokens")
        .where("token", "==", token)
        .limit(1)
        .get()

    if (snapshot.empty) {
        throw new Error("Share token not found")
    }

    const doc = snapshot.docs[0]
    const shareData = doc.data()

    // Verify user owns this share token
    if (shareData.createdBy !== userId) {
        throw new Error("Access denied: You don't have permission to revoke this share")
    }

    await doc.ref.update({
        isActive: false,
    })
}

/**
 * Gets all share tokens created by a user
 */
export async function getUserShareTokens(userId: string): Promise<ShareToken[]> {
    const db = getAdminDb()

    const snapshot = await db
        .collection("shareTokens")
        .where("createdBy", "==", userId)
        .get()

    const shares = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
    })) as ShareToken[]

    // Sort by creation date (newest first)
    return shares.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
}
