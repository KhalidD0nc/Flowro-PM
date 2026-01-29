// Tech stack validation with strict enums
// Ensures AI can only choose from approved technology options

import { z } from "zod"

// Approved frontend options
export const FRONTEND_OPTIONS = [
  "nextjs",
  "react",
  "flutter"
] as const

// Approved backend options
export const BACKEND_OPTIONS = [
  "nextjs_api",
  "express",
  "fastAPI",
] as const

// Approved database options
export const DATABASE_OPTIONS = [
  "firebase_firestore",
  "supabase_postgres",
] as const

// TypeScript types
export type FrontendOption = typeof FRONTEND_OPTIONS[number]
export type BackendOption = typeof BACKEND_OPTIONS[number]
export type DatabaseOption = typeof DATABASE_OPTIONS[number]

// Zod validation schemas
export const FrontendSchema = z.enum(FRONTEND_OPTIONS)
export const BackendSchema = z.enum(BACKEND_OPTIONS)
export const DatabaseSchema = z.enum(DATABASE_OPTIONS)

export const TechStackSchema = z.object({
  frontend: FrontendSchema,
  backend: BackendSchema,
  database: DatabaseSchema
})

/**
 * Validate tech stack from AI response
 * Returns validation result or error message
 */
export function validateTechStack(
  techStack: unknown
): { valid: true; data: z.infer<typeof TechStackSchema> } | { valid: false; error: string } {
  try {
    const data = TechStackSchema.parse(techStack)
    return { valid: true, data }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(i => i.message).join(", ")
      return {
        valid: false,
        error: `Invalid tech stack: ${issues}\n\nMust choose from:\n` +
               `Frontend: ${FRONTEND_OPTIONS.join(", ")}\n` +
               `Backend: ${BACKEND_OPTIONS.join(", ")}\n` +
               `Database: ${DATABASE_OPTIONS.join(", ")}`
      }
    }
    return { valid: false, error: "Unknown validation error" }
  }
}

/**
 * Get safe default tech stack
 * Used as fallback when validation fails
 */
export function getSafeDefaults() {
  return {
    frontend: "nextjs" as const,
    backend: "nextjs_api" as const,
    database: "firebase_firestore" as const
  }
}

/**
 * Check if tech stack option is valid
 */
export function isValidTechOption(category: "frontend" | "backend" | "database", value: string): boolean {
  switch (category) {
    case "frontend":
      return FRONTEND_OPTIONS.includes(value as FrontendOption)
    case "backend":
      return BACKEND_OPTIONS.includes(value as BackendOption)
    case "database":
      return DATABASE_OPTIONS.includes(value as DatabaseOption)
  }
}
