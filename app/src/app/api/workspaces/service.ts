import { getAdminDb } from "@/lib/firebase-admin"

// =============================================================================
// Types
// =============================================================================

export interface WorkspaceMember {
    userId: string
    role: "owner" | "admin" | "member" | "viewer"
    joinedAt: string
}

export interface Workspace {
    id: string
    name: string
    ownerId: string
    domain?: string
    icon?: string
    members: WorkspaceMember[]
    createdAt: string
    updatedAt: string
}

export interface CreateWorkspaceInput {
    userId: string
    name: string
    domain?: string
}

// =============================================================================
// Service Functions
// =============================================================================

/**
 * Creates a new workspace
 */
export async function createWorkspace(input: CreateWorkspaceInput): Promise<Workspace> {
    const { userId, name, domain } = input
    const now = new Date().toISOString()
    const db = getAdminDb()

    const workspaceData = {
        name,
        ownerId: userId,
        domain: domain || null,
        members: [{
            userId,
            role: "owner",
            joinedAt: now
        }],
        createdAt: now,
        updatedAt: now,
    }

    const docRef = await db.collection("workspaces").add(workspaceData)

    return {
        id: docRef.id,
        ...workspaceData,
    } as Workspace
}

/**
 * Gets a workspace by ID
 */
export async function getWorkspace(workspaceId: string): Promise<Workspace | null> {
    const doc = await getAdminDb().collection("workspaces").doc(workspaceId).get()

    if (!doc.exists) {
        return null
    }

    return {
        id: doc.id,
        ...doc.data(),
    } as Workspace
}

/**
 * Gets all workspaces for a user
 */
export async function getUserWorkspaces(userId: string): Promise<Workspace[]> {
    // Current query limitation: we need to filter where members array contains an object with userId
    // Firestore doesn't support searching inside array of objects easily without composite keys or structural changes.
    // For scalability (as requested), we should ideally use a subcollection or root collection for memberships.
    // HOWEVER, for Phase 1 starting simple (and cost effective for reads), we can keep members array if small (<100 members).
    // Given the prompt "Teams -> Workspaces -> Projects" was scaled down to "Workspace -> Project", 
    // sticking to a member array is fine for MVP, but to be "Scalable" as requested, let's query carefully.

    // BETTER APPROACH FOR SCALABILITY:
    // Query workspaces where `ownerId` == userId
    // OR have a separate `workspace_members` collection.

    // For now, to match the "Not Complex" request while remaining robust:
    // We will query by ownerId for sure.
    // Real "Member" queries in Firestore often use a helper field like `memberIds: string[]`.

    const db = getAdminDb()

    // 1. Get owned workspaces
    const ownedSnapshot = await db.collection("workspaces")
        .where("ownerId", "==", userId)
        .get()

    const workspaces = ownedSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    })) as Workspace[]

    // TODO: Add support for "member" workspaces when invitations are implemented
    // This would likely involve checking a `memberIds` array field or a separate collection.

    return workspaces
}

/**
 * Ensures a user has at least one workspace. 
 * If none exist, creates a "Personal" workspace.
 */
export async function ensurePersonalWorkspace(userId: string, userName?: string): Promise<Workspace> {
    const workspaces = await getUserWorkspaces(userId)

    if (workspaces.length > 0) {
        return workspaces[0]
    }

    // Create new personal workspace
    const name = userName ? `${userName}'s Workspace` : "My Workspace"
    return createWorkspace({
        userId,
        name
    })
}

/**
 * Verifies user has access to workspace
 */
export async function verifyWorkspaceAccess(workspaceId: string, userId: string): Promise<boolean> {
    const workspace = await getWorkspace(workspaceId)

    if (!workspace) {
        throw new Error("Workspace not found")
    }

    const isMember = workspace.members.some(m => m.userId === userId)
    if (!isMember) {
        throw new Error("Access denied")
    }

    return true
}
