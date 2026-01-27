/**
 * Input sanitization utilities for preventing XSS and ensuring data quality
 */

/**
 * Sanitizes string input to prevent XSS and ensure data quality
 * @param input - Raw string input
 * @param maxLength - Maximum allowed length (default 100)
 * @returns Sanitized string or null if input is empty
 */
export function sanitizeString(
  input: string | undefined | null,
  maxLength = 100
): string | null {
  if (!input) return null

  return input
    .trim()
    .slice(0, maxLength)
    // Remove any HTML tags
    .replace(/<[^>]*>/g, "")
    // Remove control characters
    .replace(/[\x00-\x1F\x7F]/g, "")
    // Normalize whitespace
    .replace(/\s+/g, " ")
}

/**
 * Validates email format
 * @param email - Email to validate
 * @returns True if email is valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 320
}

/**
 * Validation result interface
 */
interface ValidationResult<T> {
  valid: boolean
  errors?: string[]
  data?: T
}

/**
 * Project input interface
 */
interface ProjectInput {
  projectName: string
  description?: string | null
  initialPrompt?: string | null
}

/**
 * Task input interface
 */
interface TaskInput {
  title: string
  description?: string | null
  priority?: "critical" | "high" | "medium" | "low"
  status?: "backlog" | "in_progress" | "launched"
}

/**
 * Sanitizes and validates project input
 * @param body - Raw request body
 * @returns Validation result with sanitized data
 */
export function sanitizeProjectInput(
  body: unknown
): ValidationResult<ProjectInput> {
  const errors: string[] = []

  if (!body || typeof body !== "object") {
    return { valid: false, errors: ["Invalid request body"] }
  }

  const input = body as Record<string, unknown>

  // Sanitize project name (required, max 200 chars)
  const projectName = sanitizeString(input.projectName as string, 200)
  if (!projectName) {
    errors.push("Project name is required")
  }

  // Sanitize description (optional, max 1000 chars)
  const description = sanitizeString(input.description as string, 1000)

  // Sanitize initial prompt (optional, max 5000 chars)
  const initialPrompt = sanitizeString(input.initialPrompt as string, 5000)

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return {
    valid: true,
    data: {
      projectName: projectName!,
      description,
      initialPrompt,
    },
  }
}

/**
 * Sanitizes and validates task input
 * @param body - Raw request body
 * @returns Validation result with sanitized data
 */
export function sanitizeTaskInput(body: unknown): ValidationResult<TaskInput> {
  const errors: string[] = []

  if (!body || typeof body !== "object") {
    return { valid: false, errors: ["Invalid request body"] }
  }

  const input = body as Record<string, unknown>

  // Sanitize title (required, max 200 chars)
  const title = sanitizeString(input.title as string, 200)
  if (!title) {
    errors.push("Task title is required")
  }

  // Sanitize description (optional, max 2000 chars)
  const description = sanitizeString(input.description as string, 2000)

  // Validate priority if provided
  const validPriorities = ["critical", "high", "medium", "low"]
  let priority: TaskInput["priority"] | undefined
  if (input.priority) {
    if (validPriorities.includes(input.priority as string)) {
      priority = input.priority as TaskInput["priority"]
    } else {
      errors.push("Invalid priority value")
    }
  }

  // Validate status if provided
  const validStatuses = ["backlog", "in_progress", "launched"]
  let status: TaskInput["status"] | undefined
  if (input.status) {
    if (validStatuses.includes(input.status as string)) {
      status = input.status as TaskInput["status"]
    } else {
      errors.push("Invalid status value")
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return {
    valid: true,
    data: {
      title: title!,
      description,
      priority,
      status,
    },
  }
}

/**
 * Sanitizes chat message content
 * @param message - Raw message content
 * @param maxLength - Maximum allowed length (default 10000)
 * @returns Sanitized message or null
 */
export function sanitizeChatMessage(
  message: string | undefined | null,
  maxLength = 10000
): string | null {
  if (!message) return null

  return message
    .trim()
    .slice(0, maxLength)
    // Remove control characters but preserve newlines
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
}

/**
 * Sanitizes share email input
 * @param email - Email to sanitize and validate
 * @returns Sanitized email or null if invalid
 */
export function sanitizeShareEmail(email: string | undefined | null): string | null {
  const sanitized = sanitizeString(email, 320)
  if (!sanitized || !isValidEmail(sanitized)) {
    return null
  }
  return sanitized.toLowerCase()
}
