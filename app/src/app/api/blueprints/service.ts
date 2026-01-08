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
        .get()

    const projects = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as Project[]

    // Sort in JavaScript to avoid needing composite index
    return projects.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
}

/**
 * Creates a new project for a user with an initial draft blueprint
 */
export async function createProject(input: CreateProjectInput): Promise<{ project: Project; blueprint: Blueprint }> {
    const { userId, projectName, description } = input
    const now = new Date().toISOString()
    const db = getAdminDb()

    // Create the project document - only include description if provided
    const projectData: Record<string, unknown> = {
        userId,
        projectName,
        chatHistory: [],
        createdAt: now,
        updatedAt: now,
    }

    // Only add description if it's provided (Firestore doesn't accept undefined)
    if (description) {
        projectData.description = description
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
            userId,
            projectName,
            description,
            chatHistory: [],
            createdAt: now,
            updatedAt: now,
        } as Project,
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
        .get()

    const blueprints = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as Blueprint[]

    // Sort in JavaScript to avoid needing composite index
    return blueprints.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
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
        .get()

    if (snapshot.empty) {
        return null
    }

    // Sort in JavaScript to find the latest (avoid composite index requirement)
    const blueprints = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as Blueprint[]

    blueprints.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    return blueprints[0]
}

/**
 * Helper to increment version number (e.g., "0.1" -> "0.2", "1.0" -> "1.1")
 */
function incrementVersion(version: string): string {
    const parts = version.split(".")
    if (parts.length === 2) {
        const minor = parseInt(parts[1], 10) + 1
        return `${parts[0]}.${minor}`
    }
    // Fallback: append .1
    return `${version}.1`
}

/**
 * Saves the current blueprint as a locked version (milestone) and creates a new draft
 * to continue editing. The new draft inherits the content from the locked version.
 */
export async function saveVersion(blueprintId: string): Promise<{
    lockedBlueprint: Blueprint
    newDraft: Blueprint
}> {
    const db = getAdminDb()
    const blueprintRef = db.collection("blueprints").doc(blueprintId)
    const blueprint = await blueprintRef.get()

    if (!blueprint.exists) {
        throw new Error("Blueprint not found")
    }

    const blueprintData = blueprint.data()
    if (blueprintData?.status === "locked" || blueprintData?.status === "approved") {
        throw new Error("Blueprint is already locked")
    }

    const now = new Date().toISOString()

    // Lock the current blueprint
    await blueprintRef.update({
        status: "locked",
        lockedAt: now,
    })

    const lockedBlueprint: Blueprint = {
        id: blueprintId,
        projectId: blueprintData?.projectId,
        version: blueprintData?.version || "0.1",
        status: "locked",
        content: blueprintData?.content || null,
        createdAt: blueprintData?.createdAt,
        lockedAt: now,
    }

    // Create a new draft with incremented version and same content
    const newVersion = incrementVersion(lockedBlueprint.version)
    const newDraftData = {
        projectId: lockedBlueprint.projectId,
        version: newVersion,
        status: "draft" as const,
        content: lockedBlueprint.content, // Copy content from locked version
        createdAt: now,
    }

    const newDraftRef = await db.collection("blueprints").add(newDraftData)

    const newDraft: Blueprint = {
        id: newDraftRef.id,
        ...newDraftData,
    }

    return { lockedBlueprint, newDraft }
}

