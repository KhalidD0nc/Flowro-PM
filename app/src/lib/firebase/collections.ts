/**
 * Firebase Collection Helper Functions (Server-Side)
 * 
 * Provides CRUD operations for the subcollection-based schema:
 * - Projects: Root collection with messages subcollection
 * - Blueprints: Root collection with history subcollection
 * - Automatic versioning on blueprint updates
 * 
 * IMPORTANT: This module uses firebase-admin SDK for server-side operations.
 * Firestore security rules do NOT apply - authorization must be enforced
 * in application code (API routes) before calling these functions.
 * 
 * @see /Docs/Architecture-Simplification-Plan.md
 */

import { getAdminDb } from "../firebase-admin"
import { Timestamp, FieldValue } from "firebase-admin/firestore"
import {
    COLLECTIONS,
    type ProjectDocument,
    type ProjectCreateData,
    type ProjectListItem,
    type MessageDocument,
    type MessageCreateData,
    type BlueprintDocument,
    type BlueprintCreateData,
    type PRDDocument,
    type PRDCreateData,
    type BlueprintHistoryDocument,
    type BlueprintHistoryCreateData,
    type UBPContent,
    type PaginatedMessages,
    createEmptyUBPContent,
    timestampToISO,
    incrementVersion,
} from "./schema"
import { validatePRDConfig, type PRDConfig } from "@/lib/prd/schema"

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Maximum operations per Firestore batch (leaving buffer from 500 limit)
 */
const BATCH_CHUNK_SIZE = 450

/**
 * Get the admin Firestore instance
 */
function getDb() {
    return getAdminDb()
}

function normalizeNonEmptyString(value?: string): string | undefined {
    if (value === undefined || value === null) {
        return undefined
    }
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
}

/**
 * Delete documents in chunks to avoid Firestore's 500-write batch limit.
 * Handles unlimited subcollection documents safely without loading all refs at once.
 */
async function deleteCollectionDocs(
    collectionPath: string,
    batchSize: number = BATCH_CHUNK_SIZE
): Promise<void> {
    const db = getDb()
    while (true) {
        const snapshot = await db.collection(collectionPath).limit(batchSize).get()
        if (snapshot.empty) return

        const batch = db.batch()
        snapshot.docs.forEach((docSnap) => batch.delete(docSnap.ref))
        await batch.commit()

        if (snapshot.size < batchSize) return
    }
}

/**
 * Safely merge incoming UBP content with existing blueprint content.
 * Preserves existing sections when incoming content doesn't specify them.
 * Prevents silent data loss from partial AI updates.
 */
function mergeUBPContent(existing: UBPContent, incoming: UBPContent): UBPContent {
    return {
        // Metadata: merge with priority to incoming, preserve existing fallbacks
        metadata: {
            productName:
                normalizeNonEmptyString(incoming.metadata?.productName) ??
                normalizeNonEmptyString(existing.metadata?.productName) ??
                "",
            version: incoming.metadata?.version ?? existing.metadata?.version ?? "1.0",
            status: incoming.metadata?.status ?? existing.metadata?.status ?? "draft",
        },
        // Sections: use incoming if explicitly provided (even if empty array), otherwise preserve existing
        productVision: incoming.productVision !== undefined ? incoming.productVision : existing.productVision,
        scope: incoming.scope !== undefined ? incoming.scope : existing.scope,
        actors: incoming.actors !== undefined ? incoming.actors : existing.actors,
        behaviors: incoming.behaviors !== undefined ? incoming.behaviors : existing.behaviors,
        constraints: incoming.constraints !== undefined ? incoming.constraints : existing.constraints,
        techDecisions: incoming.techDecisions !== undefined ? incoming.techDecisions : existing.techDecisions,
        phases: incoming.phases !== undefined ? incoming.phases : existing.phases,
        integrations: incoming.integrations !== undefined ? incoming.integrations : existing.integrations,
        changelog: incoming.changelog !== undefined ? incoming.changelog : existing.changelog,
    }
}

/**
 * Deep equality check for UBP content (excludes version metadata).
 * Used to detect if actual content changed before creating version snapshot.
 */
function hasContentChanged(existing: UBPContent, updated: UBPContent): boolean {
    // Compare content without version metadata (version always changes on update)
    const existingForCompare = {
        ...existing,
        metadata: existing.metadata ? {
            productName: existing.metadata.productName,
            status: existing.metadata.status,
            // Exclude version from comparison
        } : undefined,
    }
    const updatedForCompare = {
        ...updated,
        metadata: updated.metadata ? {
            productName: updated.metadata.productName,
            status: updated.metadata.status,
            // Exclude version from comparison
        } : undefined,
    }

    return JSON.stringify(existingForCompare) !== JSON.stringify(updatedForCompare)
}

// =============================================================================
// Projects Collection
// =============================================================================

/**
 * Create a new project
 * @returns The created project document with generated ID
 */
export async function createProject(data: Omit<ProjectCreateData, "createdAt" | "updatedAt" | "collaboratorUserIds">): Promise<ProjectDocument> {
    const db = getDb()
    const now = Timestamp.now()
    const projectData: ProjectCreateData = {
        ...data,
        collaboratorUserIds: [], // Initialize empty for Firestore security rules
        createdAt: now,
        updatedAt: now,
    }

    const docRef = await db.collection(COLLECTIONS.PROJECTS).add(projectData)

    return {
        id: docRef.id,
        ...projectData,
    }
}

/**
 * Get a project by ID
 */
export async function getProject(projectId: string): Promise<ProjectDocument | null> {
    const db = getDb()
    const docSnap = await db.collection(COLLECTIONS.PROJECTS).doc(projectId).get()

    if (!docSnap.exists) {
        return null
    }

    return {
        id: docSnap.id,
        ...docSnap.data(),
    } as ProjectDocument
}

/**
 * Get all projects for a user (fast, no chat history)
 * Used for Command Center "Jump Back In" section
 */
export async function getUserProjects(userId: string): Promise<ProjectListItem[]> {
    const db = getDb()
    const querySnapshot = await db
        .collection(COLLECTIONS.PROJECTS)
        .where("userId", "==", userId)
        .orderBy("updatedAt", "desc")
        .get()

    return querySnapshot.docs.map((doc) => {
        const data = doc.data()
        return {
            id: doc.id,
            name: data.name,
            lastMessage: data.lastMessage,
            createdAt: timestampToISO(data.createdAt),
            updatedAt: timestampToISO(data.updatedAt),
        }
    })
}

/**
 * Update a project
 */
export async function updateProject(
    projectId: string,
    updates: Partial<Pick<ProjectDocument, "name" | "lastMessage">>
): Promise<void> {
    const db = getDb()
    await db.collection(COLLECTIONS.PROJECTS).doc(projectId).update({
        ...updates,
        updatedAt: Timestamp.now(),
    })
}

/**
 * Delete a project and all related data (messages, blueprint, history)
 * Uses chunked batch deletion to handle unlimited subcollection documents.
 */
export async function deleteProject(projectId: string): Promise<void> {
    const db = getDb()

    // Delete all messages in subcollection
    const messagesPath = `${COLLECTIONS.PROJECTS}/${projectId}/${COLLECTIONS.MESSAGES}`
    await deleteCollectionDocs(messagesPath)

    await deletePrd(projectId)

    // Find blueprint and delete history + blueprint docs
    const blueprintSnap = await db
        .collection(COLLECTIONS.BLUEPRINTS)
        .where("projectId", "==", projectId)
        .get()

    for (const blueprintDoc of blueprintSnap.docs) {
        // Delete history subcollection docs
        const historyPath = `${COLLECTIONS.BLUEPRINTS}/${blueprintDoc.id}/${COLLECTIONS.HISTORY}`
        await deleteCollectionDocs(historyPath)

        // Delete blueprint document
        await blueprintDoc.ref.delete()
    }

    // Delete project document
    await db.collection(COLLECTIONS.PROJECTS).doc(projectId).delete()
}

// =============================================================================
// Messages Subcollection
// =============================================================================

/**
 * Remove undefined values from an object to make it Firestore-safe.
 * Firestore rejects documents with undefined values.
 */
function removeUndefinedValues<T extends Record<string, unknown>>(obj: T): T {
    const cleaned: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
            cleaned[key] = value
        }
    }
    return cleaned as T
}

/**
 * Add a message to a project's chat
 */
export async function addMessage(
    projectId: string,
    data: MessageCreateData
): Promise<MessageDocument> {
    const db = getDb()
    const messagesRef = db.collection(COLLECTIONS.PROJECTS).doc(projectId).collection(COLLECTIONS.MESSAGES)
    // Clean undefined values to avoid Firestore rejection
    const cleanedData = removeUndefinedValues(data as unknown as Record<string, unknown>)
    const docRef = await messagesRef.add(cleanedData)

    // Update project's lastMessage preview
    await updateProject(projectId, {
        lastMessage: data.content.slice(0, 100), // First 100 chars for preview
    })

    return {
        id: docRef.id,
        ...data,
    }
}

/**
 * Get all messages for a project
 */
export async function getMessages(projectId: string): Promise<MessageDocument[]> {
    const db = getDb()
    const querySnapshot = await db
        .collection(COLLECTIONS.PROJECTS)
        .doc(projectId)
        .collection(COLLECTIONS.MESSAGES)
        .orderBy("timestamp", "asc")
        .get()

    return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    } as MessageDocument))
}

/**
 * Get paginated messages for a project
 */
export async function getMessagesPaginated(
    projectId: string,
    pageSize: number = 50,
    afterCursor?: string
): Promise<PaginatedMessages> {
    const db = getDb()
    const messagesRef = db
        .collection(COLLECTIONS.PROJECTS)
        .doc(projectId)
        .collection(COLLECTIONS.MESSAGES)

    let queryRef = messagesRef
        .orderBy("timestamp", "desc")
        .limit(pageSize + 1) // Fetch one extra to check if there are more

    if (afterCursor) {
        const cursorDoc = await messagesRef.doc(afterCursor).get()
        if (cursorDoc.exists) {
            queryRef = messagesRef
                .orderBy("timestamp", "desc")
                .startAfter(cursorDoc)
                .limit(pageSize + 1)
        }
    }

    const querySnapshot = await queryRef.get()
    const docs = querySnapshot.docs

    const hasMore = docs.length > pageSize
    const messageDocs = hasMore ? docs.slice(0, pageSize) : docs

    // Reverse to get ascending order (oldest first)
    const messages = messageDocs
        .map((doc) => ({
            id: doc.id,
            ...doc.data(),
        } as MessageDocument))
        .reverse()

    return {
        messages,
        hasMore,
        nextCursor: hasMore ? docs[pageSize - 1].id : undefined,
    }
}

// =============================================================================
// Blueprints Collection
// =============================================================================

/**
 * Create a new blueprint for a project.
 * Uses projectId as the document ID to enforce strict 1:1 relationship.
 * If a blueprint already exists for this project, this will fail.
 * Blueprint and initial history snapshot are created atomically via batch write.
 */
export async function createBlueprint(
    data: BlueprintCreateData,
    triggeringMessageId?: string
): Promise<BlueprintDocument> {
    const db = getDb()
    // Use projectId as document ID to enforce 1:1 at storage level
    const blueprintId = data.projectId
    const docRef = db.collection(COLLECTIONS.BLUEPRINTS).doc(blueprintId)

    // Check if blueprint already exists (race condition protection)
    const existingDoc = await docRef.get()
    if (existingDoc.exists) {
        throw new Error(`Blueprint already exists for project ${data.projectId}`)
    }

    // Prepare history snapshot data (clean undefined values)
    const historyData = removeUndefinedValues({
        contentSnapshot: data.content,
        triggeringMessageId,
        version: data.content.metadata?.version || "1.0",
        changeDescription: "Initial blueprint created",
        timestamp: data.updatedAt,
    } as Record<string, unknown>)

    // ATOMIC: Create blueprint and initial history snapshot in single batch
    const batch = db.batch()
    batch.set(docRef, data)
    const historyRef = docRef.collection(COLLECTIONS.HISTORY).doc()
    batch.set(historyRef, historyData)
    await batch.commit()

    return {
        id: blueprintId,
        ...data,
    }
}

/**
 * Get the blueprint for a project.
 * Since blueprintId === projectId, this is a direct document lookup.
 */
export async function getBlueprintByProjectId(projectId: string): Promise<BlueprintDocument | null> {
    const db = getDb()
    // Direct lookup: blueprintId === projectId (enforces 1:1)
    const docSnap = await db.collection(COLLECTIONS.BLUEPRINTS).doc(projectId).get()

    if (!docSnap.exists) {
        return null
    }

    return {
        id: docSnap.id,
        ...docSnap.data(),
    } as BlueprintDocument
}

/**
 * Get a blueprint by ID
 */
export async function getBlueprint(blueprintId: string): Promise<BlueprintDocument | null> {
    const db = getDb()
    const docSnap = await db.collection(COLLECTIONS.BLUEPRINTS).doc(blueprintId).get()

    if (!docSnap.exists) {
        return null
    }

    return {
        id: docSnap.id,
        ...docSnap.data(),
    } as BlueprintDocument
}

export async function createPrd(data: PRDCreateData): Promise<PRDDocument> {
    const db = getDb()
    const prdId = data.projectId
    const docRef = db.collection(COLLECTIONS.PRDS).doc(prdId)
    const existingDoc = await docRef.get()

    if (existingDoc.exists) {
        throw new Error(`PRD already exists for project ${data.projectId}`)
    }

    const validatedConfig = validatePRDConfig(data.config)
    await docRef.set({
        ...data,
        config: validatedConfig,
    })

    return {
        id: prdId,
        ...data,
        config: validatedConfig,
    }
}

export async function getPrdByProjectId(projectId: string): Promise<PRDDocument | null> {
    const db = getDb()
    const docSnap = await db.collection(COLLECTIONS.PRDS).doc(projectId).get()

    if (!docSnap.exists) {
        return null
    }

    return {
        id: docSnap.id,
        ...docSnap.data(),
    } as PRDDocument
}

export async function replacePrd(projectId: string, config: PRDConfig): Promise<PRDDocument> {
    const db = getDb()
    const validatedConfig = validatePRDConfig(config)
    const now = Timestamp.now()

    await db.collection(COLLECTIONS.PRDS).doc(projectId).set({
        projectId,
        config: validatedConfig,
        updatedAt: now,
    })

    return {
        id: projectId,
        projectId,
        config: validatedConfig,
        updatedAt: now,
    }
}

export async function upsertPrd(projectId: string, config: PRDConfig): Promise<PRDDocument> {
    const existingPrd = await getPrdByProjectId(projectId)
    if (existingPrd) {
        return replacePrd(projectId, config)
    }

    return createPrd({
        projectId,
        config,
        updatedAt: Timestamp.now(),
    })
}

export async function deletePrd(projectId: string): Promise<void> {
    const db = getDb()
    await db.collection(COLLECTIONS.PRDS).doc(projectId).delete()
}

/**
 * Update a blueprint with automatic version history.
 * Uses safe merge semantics to preserve existing sections not in incoming content.
 * Only creates snapshot if content actually changed (prevents version inflation).
 * Blueprint update and history snapshot are created atomically via batch write.
 */
export async function updateBlueprint(
    blueprintId: string,
    content: UBPContent,
    options: {
        triggeringMessageId?: string
        changeDescription?: string
    } = {}
): Promise<{ updated: boolean; newVersion?: string }> {
    const db = getDb()
    const blueprint = await getBlueprint(blueprintId)
    if (!blueprint) {
        throw new Error(`Blueprint ${blueprintId} not found`)
    }

    // Safe merge: preserve existing sections, apply incoming changes
    const mergedContent = mergeUBPContent(blueprint.content, content)

    // Check if content actually changed (exclude version from comparison)
    if (!hasContentChanged(blueprint.content, mergedContent)) {
        // No actual content change - skip version increment and snapshot
        return { updated: false }
    }

    const now = Timestamp.now()
    const currentVersion = blueprint.content.metadata?.version || "1.0"
    const newVersion = incrementVersion(currentVersion)

    // Update version in merged content
    const updatedContent: UBPContent = {
        ...mergedContent,
        metadata: {
            ...mergedContent.metadata,
            productName: mergedContent.metadata?.productName || "",
            version: newVersion,
            status: mergedContent.metadata?.status || "draft",
        },
    }

    // Prepare history snapshot data (clean undefined values)
    const historyData = removeUndefinedValues({
        contentSnapshot: updatedContent,
        triggeringMessageId: options.triggeringMessageId,
        version: newVersion,
        changeDescription: options.changeDescription,
        timestamp: now,
    } as Record<string, unknown>)

    // ATOMIC: Update blueprint and create history snapshot in single batch
    const batch = db.batch()
    const blueprintRef = db.collection(COLLECTIONS.BLUEPRINTS).doc(blueprintId)
    batch.update(blueprintRef, {
        content: updatedContent,
        updatedAt: now,
    })
    const historyRef = blueprintRef.collection(COLLECTIONS.HISTORY).doc()
    batch.set(historyRef, historyData)
    await batch.commit()

    return { updated: true, newVersion }
}

// =============================================================================
// Blueprint History Subcollection
// =============================================================================

/**
 * Create a history snapshot for a blueprint
 */
async function createHistorySnapshot(
    blueprintId: string,
    data: BlueprintHistoryCreateData
): Promise<BlueprintHistoryDocument> {
    const db = getDb()
    const historyRef = db.collection(COLLECTIONS.BLUEPRINTS).doc(blueprintId).collection(COLLECTIONS.HISTORY)
    // Clean undefined values to avoid Firestore rejection
    const cleanedData = removeUndefinedValues(data as unknown as Record<string, unknown>)
    const docRef = await historyRef.add(cleanedData)

    return {
        id: docRef.id,
        ...data,
    }
}

/**
 * Get blueprint version history
 */
export async function getBlueprintHistory(
    blueprintId: string
): Promise<BlueprintHistoryDocument[]> {
    const db = getDb()
    const querySnapshot = await db
        .collection(COLLECTIONS.BLUEPRINTS)
        .doc(blueprintId)
        .collection(COLLECTIONS.HISTORY)
        .orderBy("timestamp", "desc")
        .get()

    return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    } as BlueprintHistoryDocument))
}

/**
 * Get a specific history snapshot
 */
export async function getHistorySnapshot(
    blueprintId: string,
    snapshotId: string
): Promise<BlueprintHistoryDocument | null> {
    const db = getDb()
    const docSnap = await db
        .collection(COLLECTIONS.BLUEPRINTS)
        .doc(blueprintId)
        .collection(COLLECTIONS.HISTORY)
        .doc(snapshotId)
        .get()

    if (!docSnap.exists) {
        return null
    }

    return {
        id: docSnap.id,
        ...docSnap.data(),
    } as BlueprintHistoryDocument
}

// =============================================================================
// Composite Operations
// =============================================================================

/**
 * Get full project details with messages and blueprint
 * Used when opening a project/chat
 */
export async function getProjectWithDetails(projectId: string): Promise<{
    project: ProjectDocument
    messages: MessageDocument[]
    blueprint: BlueprintDocument | null
    prd: PRDDocument | null
} | null> {
    const project = await getProject(projectId)
    if (!project) {
        return null
    }

    const [messages, blueprint, prd] = await Promise.all([
        getMessages(projectId),
        getBlueprintByProjectId(projectId),
        getPrdByProjectId(projectId),
    ])

    return {
        project,
        messages,
        blueprint,
        prd,
    }
}

/**
 * Create or update blueprint based on AI response
 * Implements auto-versioning logic from Architecture Plan
 */
export async function upsertBlueprintFromAI(
    projectId: string,
    content: UBPContent,
    triggeringMessageId?: string,
    changeDescription?: string
): Promise<BlueprintDocument> {
    const existingBlueprint = await getBlueprintByProjectId(projectId)

    if (!existingBlueprint) {
        const mergedContent = mergeUBPContent(createEmptyUBPContent(), content)
        // Create new blueprint
        return createBlueprint(
            {
                projectId,
                content: {
                    ...mergedContent,
                    metadata: {
                        ...mergedContent.metadata,
                        productName: mergedContent.metadata?.productName || "",
                        version: "1.0",
                        status: mergedContent.metadata?.status || "draft",
                    },
                },
                updatedAt: Timestamp.now(),
            },
            triggeringMessageId
        )
    }

    // Update existing blueprint
    await updateBlueprint(existingBlueprint.id, content, {
        triggeringMessageId,
        changeDescription,
    })

    // Return updated blueprint
    const updated = await getBlueprint(existingBlueprint.id)
    return updated!
}

/**
 * Save current blueprint as a locked snapshot and start a new draft version.
 * Creates a history snapshot for the locked version and increments the live version.
 */
export async function saveBlueprintVersion(
    blueprintId: string
): Promise<{
    lockedSnapshot: BlueprintHistoryDocument
    blueprint: BlueprintDocument
}> {
    const db = getDb()
    const blueprint = await getBlueprint(blueprintId)
    if (!blueprint) {
        throw new Error(`Blueprint ${blueprintId} not found`)
    }

    const baseContent = blueprint.content || createEmptyUBPContent()
    const currentStatus = baseContent.metadata?.status
    if (currentStatus === "locked" || currentStatus === "approved") {
        throw new Error("Blueprint is already locked")
    }

    const now = Timestamp.now()
    const currentVersion = baseContent.metadata?.version || "1.0"
    const productName = baseContent.metadata?.productName || ""

    const lockedContent: UBPContent = {
        ...baseContent,
        metadata: {
            ...baseContent.metadata,
            productName,
            version: currentVersion,
            status: "locked",
        },
    }

    const newVersion = incrementVersion(currentVersion)
    const newContent: UBPContent = {
        ...baseContent,
        metadata: {
            ...baseContent.metadata,
            productName,
            version: newVersion,
            status: "draft",
        },
    }

    // Prepare history data (no triggering message for manual saves)
    const historyData: BlueprintHistoryCreateData = {
        contentSnapshot: lockedContent,
        version: currentVersion,
        changeDescription: "Version saved",
        timestamp: now,
    }
    // Clean undefined values for Firestore
    const cleanedHistoryData = removeUndefinedValues(historyData as unknown as Record<string, unknown>)

    const batch = db.batch()
    const blueprintRef = db.collection(COLLECTIONS.BLUEPRINTS).doc(blueprintId)
    const historyRef = blueprintRef.collection(COLLECTIONS.HISTORY).doc()
    batch.set(historyRef, cleanedHistoryData)
    batch.update(blueprintRef, {
        content: newContent,
        updatedAt: now,
    })
    await batch.commit()

    return {
        lockedSnapshot: {
            id: historyRef.id,
            ...historyData,
        },
        blueprint: {
            ...blueprint,
            content: newContent,
            updatedAt: now,
        },
    }
}

// =============================================================================
// Project Collaborators
// =============================================================================

/**
 * Add a collaborator to a project
 */
export async function addCollaborator(
    projectId: string,
    collaboratorData: {
        userId: string
        email: string
        role: import("./schema").CollaboratorRole
        invitedBy: string
    }
): Promise<void> {
    const db = getDb()
    const projectRef = db.collection(COLLECTIONS.PROJECTS).doc(projectId)
    const projectSnap = await projectRef.get()

    if (!projectSnap.exists) {
        throw new Error("Project not found")
    }

    const data = projectSnap.data()
    const collaborators = data?.collaborators || []

    // Check if already a collaborator
    const existingIndex = collaborators.findIndex(
        (c: { userId: string }) => c.userId === collaboratorData.userId
    )

    const now = Timestamp.now()
    const newCollaborator = {
        ...collaboratorData,
        invitedAt: now,
        status: "pending" as const,
    }

    if (existingIndex >= 0) {
        // Update existing collaborator
        collaborators[existingIndex] = {
            ...collaborators[existingIndex],
            role: collaboratorData.role,
            invitedBy: collaboratorData.invitedBy,
            invitedAt: now,
            status: "pending" as const,
        }
    } else {
        // Add new collaborator
        collaborators.push(newCollaborator)
    }

    await projectRef.update({
        collaborators,
        collaboratorUserIds: FieldValue.arrayUnion(collaboratorData.userId),
        updatedAt: now,
    })
}

/**
 * Update collaborator status (e.g., accept invitation)
 */
export async function updateCollaboratorStatus(
    projectId: string,
    userId: string,
    status: import("./schema").CollaboratorStatus
): Promise<void> {
    const db = getDb()
    const projectRef = db.collection(COLLECTIONS.PROJECTS).doc(projectId)
    const projectSnap = await projectRef.get()

    if (!projectSnap.exists) {
        throw new Error("Project not found")
    }

    const data = projectSnap.data()
    const collaborators = data?.collaborators || []

    const collaboratorIndex = collaborators.findIndex(
        (c: { userId: string }) => c.userId === userId
    )

    if (collaboratorIndex < 0) {
        throw new Error("Collaborator not found")
    }

    const now = Timestamp.now()
    collaborators[collaboratorIndex].status = status
    if (status === "active") {
        collaborators[collaboratorIndex].acceptedAt = now
    }

    await projectRef.update({
        collaborators,
        updatedAt: now,
    })
}

/**
 * Remove a collaborator from a project
 */
export async function removeCollaborator(
    projectId: string,
    userId: string
): Promise<void> {
    const db = getDb()
    const projectRef = db.collection(COLLECTIONS.PROJECTS).doc(projectId)
    const projectSnap = await projectRef.get()

    if (!projectSnap.exists) {
        throw new Error("Project not found")
    }

    const data = projectSnap.data()
    const collaborators = (data?.collaborators || []).filter(
        (c: { userId: string }) => c.userId !== userId
    )

    await projectRef.update({
        collaborators,
        collaboratorUserIds: FieldValue.arrayRemove(userId),
        updatedAt: Timestamp.now(),
    })
}

/**
 * Check if user has access to a project and their permission level
 */
export async function checkProjectAccess(
    projectId: string,
    userId: string
): Promise<{
    hasAccess: boolean
    role: "owner" | import("./schema").CollaboratorRole | null
    canEdit: boolean
    canComment: boolean
    canAdmin: boolean
}> {
    const project = await getProject(projectId)

    if (!project) {
        return {
            hasAccess: false,
            role: null,
            canEdit: false,
            canComment: false,
            canAdmin: false,
        }
    }

    // Owner has full access
    if (project.userId === userId) {
        return {
            hasAccess: true,
            role: "owner",
            canEdit: true,
            canComment: true,
            canAdmin: true,
        }
    }

    // Check collaborators
    const collaborator = project.collaborators?.find(
        (c) => c.userId === userId && c.status === "active"
    )

    if (!collaborator) {
        return {
            hasAccess: false,
            role: null,
            canEdit: false,
            canComment: false,
            canAdmin: false,
        }
    }

    const canEdit = ["editor", "admin"].includes(collaborator.role)
    const canComment = ["commenter", "editor", "admin"].includes(collaborator.role)
    const canAdmin = collaborator.role === "admin"

    return {
        hasAccess: true,
        role: collaborator.role,
        canEdit,
        canComment,
        canAdmin,
    }
}

/**
 * Get all projects where user is owner or collaborator
 */
export async function getAccessibleProjects(userId: string): Promise<ProjectListItem[]> {
    const db = getDb()

    // Get projects owned by user
    const ownedSnapshot = await db
        .collection(COLLECTIONS.PROJECTS)
        .where("userId", "==", userId)
        .orderBy("updatedAt", "desc")
        .get()

    // Get projects where user is a collaborator (using flat userId array for efficient query)
    const collaboratorSnapshot = await db
        .collection(COLLECTIONS.PROJECTS)
        .where("collaboratorUserIds", "array-contains", userId)
        .orderBy("updatedAt", "desc")
        .get()

    const projectMap = new Map<string, ProjectListItem>()

    // Add owned projects
    ownedSnapshot.docs.forEach((doc) => {
        const data = doc.data()
        projectMap.set(doc.id, {
            id: doc.id,
            name: data.name,
            lastMessage: data.lastMessage,
            createdAt: timestampToISO(data.createdAt),
            updatedAt: timestampToISO(data.updatedAt),
        })
    })

    // Add collaborated projects (avoid duplicates)
    collaboratorSnapshot.docs.forEach((doc) => {
        if (!projectMap.has(doc.id)) {
            const data = doc.data()
            const collaborator = data.collaborators?.find(
                (c: { userId: string; status: string }) =>
                    c.userId === userId && c.status === "active"
            )
            if (collaborator) {
                projectMap.set(doc.id, {
                    id: doc.id,
                    name: data.name,
                    lastMessage: data.lastMessage,
                    createdAt: timestampToISO(data.createdAt),
                    updatedAt: timestampToISO(data.updatedAt),
                })
            }
        }
    })

    return Array.from(projectMap.values()).sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
}
