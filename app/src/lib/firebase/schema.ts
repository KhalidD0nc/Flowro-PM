/**
 * Firebase Schema Definitions
 * 
 * Implements "One Project = One Blueprint" architecture with:
 * - Subcollection-based storage for infinite scalability
 * - Automatic version history via snapshots
 * - Strict 1:1 project-blueprint relationship
 * 
 * @see /Docs/Architecture-Simplification-Plan.md
 */

import { Timestamp } from "firebase/firestore"

// =============================================================================
// Core Types
// =============================================================================

/**
 * Message intent types for LLM responses
 */
export type MessageIntent = "initial" | "discussion" | "proposal"

/**
 * Message role in conversation
 */
export type MessageRole = "user" | "assistant"

/**
 * Blueprint status lifecycle
 */
export type BlueprintStatus = "draft" | "locked" | "approved"

// =============================================================================
// UBP Content Structure (9 Sections)
// =============================================================================

export interface UBPMetadata {
    productName: string
    version: string
    status: BlueprintStatus
}

export interface UBPProductVision {
    description?: string
    primaryGoal?: string
    targetAudience?: string
    problem?: string
    targetActor?: string
    successSignal?: string
}

export interface UBPScope {
    inScope?: string[]
    outOfScope?: string[]
    deferred?: string[]
}

export interface UBPActor {
    name: string
    description: string
    type: "primary" | "secondary" | "system"
    icon?: string
    color?: string
}

export interface UBPBehavior {
    id: string
    title: string
    priority?: "high" | "medium" | "low"
    given?: string
    when?: string
    then?: string
    diagram?: string // Mermaid diagram code
}

export interface UBPConstraint {
    type: "warning" | "risk" | "constraint"
    title: string
    description: string
}

export interface UBPTechDecision {
    category: string
    choice: string
    rationale?: string
}

export interface UBPPhase {
    name: string
    timeline?: string
    description: string
    goals?: string[]
    status?: "completed" | "current" | "upcoming"
}

export interface UBPIntegration {
    system: string
    method: string
    purpose: string
}

export interface UBPChangeLogEntry {
    version: string
    title: string
    description: string
    timestamp?: string
}

/**
 * Complete UBP Content Structure
 * Contains all 9 sections of the Unified Blueprint
 */
export interface UBPContent {
    metadata?: UBPMetadata
    productVision?: UBPProductVision
    scope?: UBPScope
    actors?: UBPActor[]
    behaviors?: UBPBehavior[]
    constraints?: UBPConstraint[]
    techDecisions?: UBPTechDecision[]
    phases?: UBPPhase[]
    integrations?: UBPIntegration[]
    changelog?: UBPChangeLogEntry[]
}

// =============================================================================
// Firestore Document Types
// =============================================================================

/**
 * Project Document (Root Collection)
 * 
 * Primary container and ownership root. Contains:
 * - Basic metadata
 * - Last message preview for Command Center
 * - Timestamps
 * 
 * Subcollections:
 * - messages: Chat history (unlimited)
 */
export interface ProjectDocument {
    id: string
    userId: string // Owner's Firebase UID
    name: string
    lastMessage?: string // Preview for Command Center list
    createdAt: Timestamp
    updatedAt: Timestamp
}

/**
 * Project Document for Create Operations
 * (without id, which is auto-generated)
 */
export interface ProjectCreateData {
    userId: string
    name: string
    lastMessage?: string
    createdAt: Timestamp
    updatedAt: Timestamp
}

/**
 * Message Document (Subcollection under Projects)
 * 
 * Individual chat message. Stored in subcollection to:
 * - Avoid 1MB document limit
 * - Enable pagination
 * - Fast project list loads
 */
export interface MessageDocument {
    id: string
    role: MessageRole
    content: string
    proposedChanges?: Partial<UBPContent> // Optional proposed UBP changes
    intent: MessageIntent
    timestamp: Timestamp
}

/**
 * Message Document for Create Operations
 */
export interface MessageCreateData {
    role: MessageRole
    content: string
    proposedChanges?: Partial<UBPContent>
    intent: MessageIntent
    timestamp: Timestamp
}

/**
 * Blueprint Document (Root Collection)
 * 
 * The single "living" document reflecting current product vision state.
 * Linked to project via projectId (strict 1:1 relationship).
 * 
 * Subcollections:
 * - history: Version snapshots (auto-created on changes)
 */
export interface BlueprintDocument {
    id: string
    projectId: string // Foreign key to projects collection
    content: UBPContent
    updatedAt: Timestamp
}

/**
 * Blueprint Document for Create Operations
 */
export interface BlueprintCreateData {
    projectId: string
    content: UBPContent
    updatedAt: Timestamp
}

/**
 * Blueprint History Snapshot (Subcollection under Blueprints)
 * 
 * Frozen UBP state created automatically when:
 * - AI generates initial blueprint
 * - AI proposes and user accepts changes
 * - Manual edits are saved
 */
export interface BlueprintHistoryDocument {
    id: string
    contentSnapshot: UBPContent
    triggeringMessageId?: string // Link to causative message
    version: string // e.g., "1.0", "1.1"
    changeDescription?: string // Brief description of what changed
    timestamp: Timestamp
}

/**
 * Blueprint History Document for Create Operations
 */
export interface BlueprintHistoryCreateData {
    contentSnapshot: UBPContent
    triggeringMessageId?: string
    version: string
    changeDescription?: string
    timestamp: Timestamp
}

// =============================================================================
// API Response Types
// =============================================================================

/**
 * Project list item for Command Center
 * Lightweight version without full chat history
 */
export interface ProjectListItem {
    id: string
    name: string
    lastMessage?: string
    createdAt: string // ISO string
    updatedAt: string // ISO string
}

/**
 * Full project with messages and blueprint
 */
export interface ProjectWithDetails {
    project: ProjectDocument
    messages: MessageDocument[]
    blueprint: BlueprintDocument | null
}

/**
 * Paginated messages response
 */
export interface PaginatedMessages {
    messages: MessageDocument[]
    hasMore: boolean
    nextCursor?: string // Last message ID for pagination
}

/**
 * Blueprint with version history
 */
export interface BlueprintWithHistory {
    blueprint: BlueprintDocument
    history: BlueprintHistoryDocument[]
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Convert Firestore Timestamp to ISO string for API responses
 */
export function timestampToISO(timestamp: Timestamp): string {
    return timestamp.toDate().toISOString()
}

/**
 * Convert ISO string to Firestore Timestamp
 */
export function isoToTimestamp(iso: string): Timestamp {
    return Timestamp.fromDate(new Date(iso))
}

/**
 * Generate next version string
 * e.g., "1.0" -> "1.1", "1.9" -> "1.10"
 */
export function incrementVersion(currentVersion: string): string {
    const parts = currentVersion.split(".")
    if (parts.length !== 2) {
        return "1.0"
    }
    const major = parseInt(parts[0], 10)
    const minor = parseInt(parts[1], 10)
    return `${major}.${minor + 1}`
}

/**
 * Create empty UBP content with default structure
 */
export function createEmptyUBPContent(): UBPContent {
    return {
        metadata: {
            productName: "",
            version: "1.0",
            status: "draft",
        },
        productVision: {},
        scope: {
            inScope: [],
            outOfScope: [],
            deferred: [],
        },
        actors: [],
        behaviors: [],
        constraints: [],
        techDecisions: [],
        phases: [],
        integrations: [],
        changelog: [],
    }
}

// =============================================================================
// Collection Path Constants
// =============================================================================

export const COLLECTIONS = {
    PROJECTS: "projects",
    BLUEPRINTS: "blueprints",
    MESSAGES: "messages", // Subcollection under projects
    HISTORY: "history", // Subcollection under blueprints
    USERS: "Users",
    SHARE_TOKENS: "shareTokens",
    PROJECT_SHARES: "projectShares",
} as const

export type CollectionName = typeof COLLECTIONS[keyof typeof COLLECTIONS]
