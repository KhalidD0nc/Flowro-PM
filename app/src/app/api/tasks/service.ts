import { getAdminDb } from "@/lib/firebase-admin"

// =============================================================================
// Types
// =============================================================================

export interface Task {
    id: string
    projectId: string
    workspaceId?: string
    title: string
    description?: string
    status: "todo" | "in_progress" | "done" | string
    priority: "low" | "medium" | "high" | "critical"
    assigneeId?: string
    createdBy: string
    dueDate?: string
    source: {
        type: "manual" | "ai_generated"
        blueprintId?: string
        sectionType?: "behavior" | "phase" | "constraint" | "integration"
        sectionId?: string
    }
    columnOrder: number
    tags?: string[]
    createdAt: string
    updatedAt: string
}

export interface KanbanColumn {
    id: string
    name: string
    color: string
    order: number
}

export interface CreateTaskInput {
    projectId: string
    workspaceId?: string
    title: string
    description?: string
    status?: string
    priority?: "low" | "medium" | "high" | "critical"
    assigneeId?: string
    createdBy: string
    dueDate?: string
    source?: Task["source"]
    tags?: string[]
}

export interface UpdateTaskInput {
    title?: string
    description?: string
    status?: string
    priority?: "low" | "medium" | "high" | "critical"
    assigneeId?: string
    dueDate?: string
    tags?: string[]
}

export interface MoveTaskInput {
    newStatus: string
    newOrder: number
}

// Default Launch Plan columns
export const DEFAULT_LAUNCH_COLUMNS: KanbanColumn[] = [
    { id: "planning", name: "Planning", color: "#9dabb9", order: 0 },
    { id: "in_progress", name: "In Progress", color: "#137fec", order: 1 },
    { id: "launched", name: "Launched", color: "#10b981", order: 2 },
]

// =============================================================================
// Task Service Functions
// =============================================================================

/**
 * Gets all tasks for a project, optionally filtered by status
 */
export async function getProjectTasks(
    projectId: string,
    status?: string
): Promise<Task[]> {
    const db = getAdminDb()

    let query = db.collection("tasks").where("projectId", "==", projectId)

    if (status) {
        query = query.where("status", "==", status)
    }

    const snapshot = await query.get()

    const tasks = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as Task[]

    // Sort by columnOrder within each status
    return tasks.sort((a, b) => a.columnOrder - b.columnOrder)
}

/**
 * Gets a single task by ID
 */
export async function getTaskById(taskId: string): Promise<Task | null> {
    const doc = await getAdminDb().collection("tasks").doc(taskId).get()

    if (!doc.exists) {
        return null
    }

    return {
        id: doc.id,
        ...doc.data(),
    } as Task
}

/**
 * Creates a new task
 */
export async function createTask(input: CreateTaskInput): Promise<Task> {
    const db = getAdminDb()
    const now = new Date().toISOString()

    // Get the highest columnOrder for the target status to append at end
    const status = input.status || "planning"
    const existingTasks = await getProjectTasks(input.projectId, status)
    const maxOrder = existingTasks.length > 0
        ? Math.max(...existingTasks.map(t => t.columnOrder))
        : -1

    const taskData = {
        projectId: input.projectId,
        workspaceId: input.workspaceId || null,
        title: input.title,
        description: input.description || null,
        status,
        priority: input.priority || "medium",
        assigneeId: input.assigneeId || null,
        createdBy: input.createdBy,
        dueDate: input.dueDate || null,
        source: input.source || { type: "manual" as const },
        columnOrder: maxOrder + 1,
        tags: input.tags || [],
        createdAt: now,
        updatedAt: now,
    }

    const taskRef = await db.collection("tasks").add(taskData)

    return {
        id: taskRef.id,
        ...taskData,
    } as Task
}

/**
 * Updates a task's details (not position)
 */
export async function updateTask(
    taskId: string,
    input: UpdateTaskInput
): Promise<Task> {
    const db = getAdminDb()
    const taskRef = db.collection("tasks").doc(taskId)
    const taskDoc = await taskRef.get()

    if (!taskDoc.exists) {
        throw new Error("Task not found")
    }

    const updates: Record<string, unknown> = {
        updatedAt: new Date().toISOString(),
    }

    if (input.title !== undefined) updates.title = input.title
    if (input.description !== undefined) updates.description = input.description
    if (input.status !== undefined) updates.status = input.status
    if (input.priority !== undefined) updates.priority = input.priority
    if (input.assigneeId !== undefined) updates.assigneeId = input.assigneeId
    if (input.dueDate !== undefined) updates.dueDate = input.dueDate
    if (input.tags !== undefined) updates.tags = input.tags

    await taskRef.update(updates)

    const updatedDoc = await taskRef.get()
    return {
        id: updatedDoc.id,
        ...updatedDoc.data(),
    } as Task
}

/**
 * Moves a task to a new status/position (drag-drop)
 * Handles reordering of other tasks in the affected columns
 */
export async function moveTask(
    taskId: string,
    input: MoveTaskInput
): Promise<Task> {
    const db = getAdminDb()
    const taskRef = db.collection("tasks").doc(taskId)

    const result = await db.runTransaction(async (transaction) => {
        const taskDoc = await transaction.get(taskRef)

        if (!taskDoc.exists) {
            throw new Error("Task not found")
        }

        const task = { id: taskDoc.id, ...taskDoc.data() } as Task
        const oldStatus = task.status
        const newStatus = input.newStatus
        const newOrder = input.newOrder

        // Get all tasks in the destination column
        const destColumnSnapshot = await db
            .collection("tasks")
            .where("projectId", "==", task.projectId)
            .where("status", "==", newStatus)
            .get()

        const destTasks = destColumnSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Task))
            .filter(t => t.id !== taskId) // Exclude the moving task
            .sort((a, b) => a.columnOrder - b.columnOrder)

        // If moving within the same column, handle reordering
        if (oldStatus === newStatus) {
            // Reorder tasks in the same column
            const reorderedTasks = [...destTasks]
            const currentIndex = destTasks.findIndex(t => t.columnOrder >= newOrder)
            const insertIndex = currentIndex === -1 ? destTasks.length : currentIndex

            // Update orders for tasks after the insertion point
            for (let i = insertIndex; i < reorderedTasks.length; i++) {
                const t = reorderedTasks[i]
                if (t.columnOrder >= newOrder) {
                    transaction.update(db.collection("tasks").doc(t.id), {
                        columnOrder: t.columnOrder + 1,
                    })
                }
            }
        } else {
            // Moving to a different column
            // First, close the gap in the old column
            const oldColumnSnapshot = await db
                .collection("tasks")
                .where("projectId", "==", task.projectId)
                .where("status", "==", oldStatus)
                .get()

            const oldTasks = oldColumnSnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as Task))
                .filter(t => t.id !== taskId)
                .sort((a, b) => a.columnOrder - b.columnOrder)

            // Reorder tasks in old column
            oldTasks.forEach((t, idx) => {
                if (t.columnOrder !== idx) {
                    transaction.update(db.collection("tasks").doc(t.id), {
                        columnOrder: idx,
                    })
                }
            })

            // Make room in the new column
            for (const t of destTasks) {
                if (t.columnOrder >= newOrder) {
                    transaction.update(db.collection("tasks").doc(t.id), {
                        columnOrder: t.columnOrder + 1,
                    })
                }
            }
        }

        // Update the moved task
        transaction.update(taskRef, {
            status: newStatus,
            columnOrder: newOrder,
            updatedAt: new Date().toISOString(),
        })

        return {
            ...task,
            status: newStatus,
            columnOrder: newOrder,
            updatedAt: new Date().toISOString(),
        }
    })

    return result
}

/**
 * Deletes a task
 */
export async function deleteTask(taskId: string): Promise<void> {
    const db = getAdminDb()
    const taskRef = db.collection("tasks").doc(taskId)
    const taskDoc = await taskRef.get()

    if (!taskDoc.exists) {
        throw new Error("Task not found")
    }

    await taskRef.delete()
}

/**
 * Verifies that a user has access to a task (via project ownership)
 */
export async function verifyTaskAccess(
    taskId: string,
    userId: string
): Promise<Task> {
    const task = await getTaskById(taskId)

    if (!task) {
        throw new Error("Task not found")
    }

    // Check project ownership
    const projectDoc = await getAdminDb()
        .collection("projects")
        .doc(task.projectId)
        .get()

    if (!projectDoc.exists) {
        throw new Error("Project not found")
    }

    const project = projectDoc.data()
    if (project?.userId !== userId) {
        throw new Error("Access denied: You don't have permission to access this task")
    }

    return task
}

/**
 * Gets tasks grouped by status for Kanban board display
 */
export async function getProjectTasksGrouped(
    projectId: string
): Promise<Record<string, Task[]>> {
    const tasks = await getProjectTasks(projectId)

    const grouped: Record<string, Task[]> = {
        planning: [],
        in_progress: [],
        launched: [],
    }

    for (const task of tasks) {
        const status = task.status
        if (!grouped[status]) {
            grouped[status] = []
        }
        grouped[status].push(task)
    }

    // Sort each group by columnOrder
    for (const status of Object.keys(grouped)) {
        grouped[status].sort((a, b) => a.columnOrder - b.columnOrder)
    }

    return grouped
}
