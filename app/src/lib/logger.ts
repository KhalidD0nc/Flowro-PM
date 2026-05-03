// Structured logging system for production observability
// Replaces console.log with structured, queryable logs

type LogLevel = "info" | "warn" | "error" | "debug"

interface LogEntry {
  timestamp: string
  level: LogLevel
  userId?: string
  projectId?: string
  action: string
  details: Record<string, unknown>
}

// In-memory log storage with rotation
const logs: LogEntry[] = []
const MAX_LOGS = 1000

/**
 * Structured logging function
 * Usage: logInfo("generate_request", { userId, messageLength })
 */
export function log(options: {
  level: LogLevel
  action: string
  userId?: string
  projectId?: string
  details?: Record<string, unknown>
}) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: options.level,
    userId: options.userId,
    projectId: options.projectId,
    action: options.action,
    details: options.details || {}
  }

  // Add to memory store
  logs.push(entry)

  // Auto-rotate when limit reached
  if (logs.length > MAX_LOGS) {
    logs.splice(0, logs.length - MAX_LOGS)
  }

  // Console output for development
  const emoji = options.level === "error" ? "❌"
    : options.level === "warn" ? "⚠️"
    : options.level === "info" ? "ℹ️"
    : "🔍"

  // eslint-disable-next-line no-console
  console.log(`${emoji} [${options.level.toUpperCase()}]`, JSON.stringify(entry))
}

/**
 * Get logs with optional filtering
 * Usage: getLogs("error", 50) // Last 50 error logs
 */
export function getLogs(level?: LogLevel, limit = 100): LogEntry[] {
  let filtered = logs

  // Filter by level if specified
  if (level) {
    filtered = logs.filter(l => l.level === level)
  }

  // Return last N entries
  return filtered.slice(-limit)
}

/**
 * Clear all logs (useful for testing)
 */
export function clearLogs() {
  logs.length = 0
}

// Convenience methods
export const logInfo = (action: string, details?: Record<string, unknown>) =>
  log({ level: "info", action, details })

export const logWarn = (action: string, details?: Record<string, unknown>) =>
  log({ level: "warn", action, details })

export const logError = (action: string, details?: Record<string, unknown>) =>
  log({ level: "error", action, details })

export const logDebug = (action: string, details?: Record<string, unknown>) =>
  log({ level: "debug", action, details })

/**
 * Get log statistics
 */
export function getLogStats(): {
  total: number
  byLevel: Record<LogLevel, number>
  recentErrors: LogEntry[]
} {
  const byLevel: Record<LogLevel, number> = {
    info: 0,
    warn: 0,
    error: 0,
    debug: 0
  }

  for (const entry of logs) {
    byLevel[entry.level]++
  }

  const recentErrors = logs
    .filter(l => l.level === "error")
    .slice(-10) // Last 10 errors

  return {
    total: logs.length,
    byLevel,
    recentErrors
  }
}
