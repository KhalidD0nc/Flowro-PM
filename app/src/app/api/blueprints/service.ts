import { getAdminDb } from "@/lib/firebase-admin"

// Types
export interface Blueprint {
    id: string
    userId: string
    projectName: string
    version: string
    status: string
    content: unknown | null
    chatHistory: ChatMessage[]
    createdAt: string
    updatedAt: string
}

export interface ChatMessage {
    role: "user" | "assistant"
    content: string
    timestamp: string
}

export interface CreateBlueprintInput {
    userId: string
    projectName: string
}

// Blueprint Service Functions

/**
 * Fetches all blueprints for a specific user, ordered by creation date (newest first)
 */
export async function getUserBlueprints(userId: string): Promise<Blueprint[]> {
    const snapshot = await getAdminDb()
        .collection("blueprints")
        .where("userId", "==", userId)
        .orderBy("createdAt", "desc")
        .get()

    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as Blueprint[]
}

/**
 * Creates a new blueprint for a user
 */
export async function createBlueprint(input: CreateBlueprintInput): Promise<Blueprint> {
    const { userId, projectName } = input
    const now = new Date().toISOString()

    const blueprintData = {
        userId,
        projectName,
        version: "0.1",
        status: "draft",
        content: null,
        chatHistory: [],
        createdAt: now,
        updatedAt: now,
    }

    const docRef = await getAdminDb().collection("blueprints").add(blueprintData)

    return {
        id: docRef.id,
        ...blueprintData,
    }
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
 * Updates a blueprint's content and chat history
 */
export async function updateBlueprintContent(
    blueprintId: string,
    content: unknown,
    newMessages: ChatMessage[]
): Promise<void> {
    const blueprintRef = getAdminDb().collection("blueprints").doc(blueprintId)
    const blueprint = await blueprintRef.get()

    if (!blueprint.exists) {
        throw new Error("Blueprint not found")
    }

    const existingHistory = blueprint.data()?.chatHistory || []

    await blueprintRef.update({
        content,
        chatHistory: [...existingHistory, ...newMessages],
        updatedAt: new Date().toISOString(),
    })
}
