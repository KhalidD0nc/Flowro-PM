/**
 * Blueprint Types
 * 
 * Shared types for blueprint-related components.
 * Separated to avoid circular dependencies.
 * 
 * @see /Docs/Architecture-Simplification-Plan.md Phase 4
 */

// =============================================================================
// UBP Content Types
// =============================================================================

/**
 * UBP Content type for blueprint viewer
 * Compatible with both schema and legacy UBPViewer types
 */
export interface UBPContent {
  productVision?: {
    description?: string
    primaryGoal?: string
    targetAudience?: string
  }
  scope?: {
    inScope?: string[]
    outOfScope?: string[]
    deferred?: string[]
  }
  actors?: {
    name: string
    description: string
    type?: "primary" | "secondary" | "system"
    icon?: string
    color?: string
  }[]
  behaviors?: {
    id: string
    title: string
    priority?: "high" | "medium" | "low" | string
    given?: string
    when?: string
    then?: string
    diagram?: string
  }[]
  constraints?: {
    type: "warning" | "risk" | "constraint"
    title: string
    description: string
  }[]
  techDecisions?: {
    category: string
    choice: string
    rationale?: string
  }[]
  phases?: {
    name: string
    timeline?: string
    description: string
    goals?: string[]
    status?: "completed" | "current" | "upcoming"
  }[]
  integrations?: {
    system: string
    method: string
    purpose: string
  }[]
  changelog?: {
    version: string
    title: string
    description: string
    timestamp?: string
  }[]
}

/**
 * Blueprint history snapshot for version display
 */
export interface BlueprintSnapshot {
  id: string
  version: string
  changeDescription?: string
  timestamp: string
  contentSnapshot: UBPContent
}

/**
 * UBP Section data union type
 */
export type UBPSectionData =
  | UBPContent["productVision"]
  | UBPContent["scope"]
  | UBPContent["actors"]
  | UBPContent["behaviors"]
  | UBPContent["constraints"]
  | UBPContent["techDecisions"]
  | UBPContent["phases"]
  | UBPContent["integrations"]
  | UBPContent["changelog"]
