import { getAdminDb } from "@/lib/firebase-admin"

// =============================================================================
// Types
// =============================================================================

export interface ChatMessage {
    role: "user" | "assistant"
    content: string
    timestamp: string
}

/**
 * Project - Top-level collection
 * Contains chat history that persists even when blueprints are locked
 */
export interface Project {
    id: string
    userId: string
    projectName: string
    description?: string
    chatHistory: ChatMessage[]
    createdAt: string
    updatedAt: string
}

/**
 * Blueprint - Belongs to a Project
 * Can be draft or locked. When locked, content cannot be changed.
 */
export interface Blueprint {
    id: string
    projectId: string
    version: string
    status: "draft" | "locked" | "approved"
    content: unknown | null
    createdAt: string
    lockedAt?: string
}

export interface CreateProjectInput {
    userId: string
    projectName: string
    description?: string
}

// =============================================================================
// Project Service Functions
// =============================================================================

/**
 * Fetches all projects for a specific user, ordered by creation date (newest first)
 */
export async function getUserProjects(userId: string): Promise<Project[]> {
    const snapshot = await getAdminDb()
        .collection("projects")
        .where("userId", "==", userId)
        .orderBy("createdAt", "desc")
        .get()

    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as Project[]
}

/**
 * Creates a new project for a user with an initial draft blueprint
 */
export async function createProject(input: CreateProjectInput): Promise<{ project: Project; blueprint: Blueprint }> {
    const { userId, projectName, description } = input
    const now = new Date().toISOString()
    const db = getAdminDb()

    // Create the project document
    const projectData = {
        userId,
        projectName,
        description: description || undefined,
        chatHistory: [],
        createdAt: now,
        updatedAt: now,
    }

    const projectRef = await db.collection("projects").add(projectData)

    // Create an initial draft blueprint for the project
    const blueprintData = {
        projectId: projectRef.id,
        version: "0.1",
        status: "draft" as const,
        content: null,
        createdAt: now,
    }

    const blueprintRef = await db.collection("blueprints").add(blueprintData)

    return {
        project: {
            id: projectRef.id,
            ...projectData,
        },
        blueprint: {
            id: blueprintRef.id,
            ...blueprintData,
        },
    }
}

/**
 * Gets a project by ID
 */
export async function getProjectById(projectId: string): Promise<Project | null> {
    const doc = await getAdminDb().collection("projects").doc(projectId).get()

    if (!doc.exists) {
        return null
    }

    return {
        id: doc.id,
        ...doc.data(),
    } as Project
}

/**
 * Verifies that a user owns a specific project
 * @param projectId - The project ID to check
 * @param userId - The user ID to verify ownership for
 * @returns True if the user owns the project
 * @throws Error if project not found or user doesn't own it
 */
export async function verifyProjectOwnership(projectId: string, userId: string): Promise<boolean> {
    const project = await getProjectById(projectId)

    if (!project) {
        throw new Error("Project not found")
    }

    if (project.userId !== userId) {
        throw new Error("Access denied: You don't have permission to access this project")
    }

    return true
}

/**
 * Verifies that a user owns a blueprint (via its parent project)
 * @param blueprintId - The blueprint ID to check
 * @param userId - The user ID to verify ownership for
 * @returns The blueprint if ownership is verified
 * @throws Error if blueprint not found or user doesn't own it
 */
export async function verifyBlueprintOwnership(blueprintId: string, userId: string): Promise<Blueprint> {
    const blueprint = await getBlueprintById(blueprintId)

    if (!blueprint) {
        throw new Error("Blueprint not found")
    }

    // Verify ownership through the parent project
    await verifyProjectOwnership(blueprint.projectId, userId)

    return blueprint
}

/**
 * Updates a project's chat history by appending new messages
 */
export async function updateProjectChatHistory(
    projectId: string,
    newMessages: ChatMessage[]
): Promise<void> {
    const projectRef = getAdminDb().collection("projects").doc(projectId)
    const project = await projectRef.get()

    if (!project.exists) {
        throw new Error("Project not found")
    }

    const existingHistory = project.data()?.chatHistory || []

    await projectRef.update({
        chatHistory: [...existingHistory, ...newMessages],
        updatedAt: new Date().toISOString(),
    })
}

// =============================================================================
// Blueprint Service Functions
// =============================================================================

/**
 * Gets all blueprints for a project
 */
export async function getProjectBlueprints(projectId: string): Promise<Blueprint[]> {
    const snapshot = await getAdminDb()
        .collection("blueprints")
        .where("projectId", "==", projectId)
        .orderBy("createdAt", "desc")
        .get()

    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as Blueprint[]
}

/**
 * Gets a blueprint by ID
 */
export async function getBlueprintById(blueprintId: string): Promise<Blueprint | null> {
    const doc = await getAdminDb().collection("blueprints").doc(blueprintId).get()

    if (!doc.exists) {
        return null
    }

    return {
        id: doc.id,
        ...doc.data(),
    } as Blueprint
}

/**
 * Updates a blueprint's content (only if not locked)
 */
export async function updateBlueprintContent(
    blueprintId: string,
    content: unknown
): Promise<void> {
    const blueprintRef = getAdminDb().collection("blueprints").doc(blueprintId)
    const blueprint = await blueprintRef.get()

    if (!blueprint.exists) {
        throw new Error("Blueprint not found")
    }

    const data = blueprint.data()
    if (data?.status === "locked" || data?.status === "approved") {
        throw new Error("Cannot modify a locked or approved blueprint")
    }

    await blueprintRef.update({
        content,
    })
}

/**
 * Locks a blueprint, preventing further modifications
 */
export async function lockBlueprint(blueprintId: string): Promise<void> {
    const blueprintRef = getAdminDb().collection("blueprints").doc(blueprintId)
    const blueprint = await blueprintRef.get()

    if (!blueprint.exists) {
        throw new Error("Blueprint not found")
    }

    await blueprintRef.update({
        status: "locked",
        lockedAt: new Date().toISOString(),
    })
}

/**
 * Creates a new blueprint version for a project
 */
export async function createBlueprintVersion(
    projectId: string,
    version: string
): Promise<Blueprint> {
    const now = new Date().toISOString()

    const blueprintData = {
        projectId,
        version,
        status: "draft" as const,
        content: null,
        createdAt: now,
    }

    const blueprintRef = await getAdminDb().collection("blueprints").add(blueprintData)

    return {
        id: blueprintRef.id,
        ...blueprintData,
    }
}

/**
 * Gets latest blueprint for a project
 */
export async function getLatestBlueprint(projectId: string): Promise<Blueprint | null> {
    const snapshot = await getAdminDb()
        .collection("blueprints")
        .where("projectId", "==", projectId)
        .orderBy("createdAt", "desc")
        .limit(1)
        .get()

    if (snapshot.empty) {
        return null
    }

    const doc = snapshot.docs[0]
    return {
        id: doc.id,
        ...doc.data(),
    } as Blueprint
}
