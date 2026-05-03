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

/**
 * PII Detection - Detect sensitive information patterns in text
 * @param input - Text to check for PII
 * @returns Object with hasPII flag and detected types
 */
export function detectPII(input: string): { hasPII: boolean; types: string[] } {
  const patterns = {
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
    ssn: /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/g,
    creditCard: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    apiKey: /\b(sk-|pk-|api_)[A-Za-z0-9_]{20,}\b/g,
    secret: /\b(secret|password|token|api_key|private_key):\s*[^\s\n]{8,}/gi
  }

  const detected: string[] = []

  for (const [type, pattern] of Object.entries(patterns)) {
    if (pattern.test(input)) {
      detected.push(type)
    }
  }

  return {
    hasPII: detected.length > 0,
    types: detected
  }
}

/**
 * PII Redaction - Redact detected sensitive information
 * @param input - Text with potential PII
 * @returns Text with PII redacted
 */
export function redactPII(input: string): string {
  let redacted = input

  // Email addresses
  redacted = redacted.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, "[EMAIL]")

  // Phone numbers
  redacted = redacted.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, "[PHONE]")

  // API keys (sk-, pk-, api_*)
  redacted = redacted.replace(/\b(sk-|pk-|api_)[A-Za-z0-9_]{20,}\b/g, "[API_KEY]")

  // Secret tokens
  redacted = redacted.replace(/\b(secret|password|token|api_key|private_key):\s*[^\s\n]{8,}/gi, "$1: [REDACTED]")

  // Credit cards (basic pattern)
  redacted = redacted.replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, "[CREDIT_CARD]")

  return redacted
}

/**
 * Enhanced input sanitization for LLM prompts
 * Combines XSS protection with PII redaction
 * @param input - Raw user input
 * @param maxLength - Maximum length (default 10000)
 * @returns Sanitized input
 */
export function sanitizeInputForLLM(input: string, maxLength = 10000): string {
  if (!input) return ""

  // First, apply basic sanitization
  let sanitized = sanitizeString(input, maxLength) || ""

  // Remove script tags
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")

  // Remove dangerous HTML attributes
  sanitized = sanitized.replace(/on\w+="[^"]*"/gi, "")
  sanitized = sanitized.replace(/javascript:/gi, "")

  // Remove SQL injection patterns
  sanitized = sanitized.replace(/(--|;|\b(ALTER|CREATE|DELETE|DROP|EXEC(UTE){0,1}|INSERT( +INTO){0,1}|MERGE|SELECT|UPDATE|UNION( +ALL){0,1})\b)/gi, "")

  // Detect and redact PII
  const piiCheck = detectPII(sanitized)
  if (piiCheck.hasPII) {
    process.stderr.write(`[sanitize] PII detected in user input: ${piiCheck.types.join(', ')}\n`)
    sanitized = redactPII(sanitized)
  }

  return sanitized.trim()
}

