/**
 * Centralized rate limiting module for API routes
 *
 * Note: This uses in-memory storage which resets on server restart.
 * For production scale, consider using Redis or Upstash.
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

/**
 * Rate limit configurations by route type
 */
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // AI generation - strictest limit due to cost
  generate: { maxRequests: 20, windowMs: 60 * 1000 },
  // Mutations (POST/PATCH/DELETE) - moderate limit
  mutation: { maxRequests: 60, windowMs: 60 * 1000 },
  // Read operations (GET) - highest limit
  read: { maxRequests: 100, windowMs: 60 * 1000 },
  // Auth operations - strict to prevent brute force
  auth: { maxRequests: 10, windowMs: 60 * 1000 },
}

// In-memory stores per route type
const stores = new Map<string, Map<string, RateLimitEntry>>()

// Initialize stores for each route type
for (const routeType of Object.keys(RATE_LIMITS)) {
  stores.set(routeType, new Map<string, RateLimitEntry>())
}

/**
 * Cleans up expired entries from a store
 */
function cleanupStore(store: Map<string, RateLimitEntry>, now: number): void {
  if (store.size > 1000) {
    for (const [key, value] of store.entries()) {
      if (value.resetTime < now) {
        store.delete(key)
      }
    }
  }
}

/**
 * Checks and updates rate limit for a user
 * @param identifier - User ID or IP address
 * @param routeType - Type of route (generate, mutation, read, auth)
 * @returns Object with allowed status and optional retryAfter seconds
 */
export function checkRateLimit(
  identifier: string,
  routeType: keyof typeof RATE_LIMITS
): { allowed: boolean; retryAfter?: number } {
  const config = RATE_LIMITS[routeType]
  if (!config) {
    // Unknown route type, allow by default
    return { allowed: true }
  }

  const store = stores.get(routeType)
  if (!store) {
    return { allowed: true }
  }

  const now = Date.now()

  // Clean up expired entries periodically
  cleanupStore(store, now)

  const entry = store.get(identifier)

  if (!entry || entry.resetTime < now) {
    // New window - reset the counter
    store.set(identifier, {
      count: 1,
      resetTime: now + config.windowMs,
    })
    return { allowed: true }
  }

  if (entry.count >= config.maxRequests) {
    // Rate limited
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000)
    return { allowed: false, retryAfter }
  }

  // Increment count and allow
  entry.count++
  return { allowed: true }
}

/**
 * Gets rate limit headers for a response
 * @param identifier - User ID or IP address
 * @param routeType - Type of route
 * @returns Headers object with rate limit information
 */
export function getRateLimitHeaders(
  identifier: string,
  routeType: keyof typeof RATE_LIMITS
): Record<string, string> {
  const config = RATE_LIMITS[routeType]
  const store = stores.get(routeType)

  if (!config || !store) {
    return {}
  }

  const entry = store.get(identifier)
  const now = Date.now()

  if (!entry || entry.resetTime < now) {
    return {
      "X-RateLimit-Limit": String(config.maxRequests),
      "X-RateLimit-Remaining": String(config.maxRequests),
      "X-RateLimit-Reset": String(Math.ceil((now + config.windowMs) / 1000)),
    }
  }

  return {
    "X-RateLimit-Limit": String(config.maxRequests),
    "X-RateLimit-Remaining": String(Math.max(0, config.maxRequests - entry.count)),
    "X-RateLimit-Reset": String(Math.ceil(entry.resetTime / 1000)),
  }
}

/**
 * Determines the rate limit type based on the request path and method
 * @param pathname - Request URL pathname
 * @param method - HTTP method
 * @returns Rate limit type key
 */
export function getRouteType(
  pathname: string,
  method: string
): keyof typeof RATE_LIMITS {
  // AI generation endpoint - strictest
  if (pathname.startsWith("/api/generate")) {
    return "generate"
  }

  // Auth-related endpoints
  if (pathname.startsWith("/api/auth")) {
    return "auth"
  }

  // Mutations (POST, PATCH, DELETE, PUT)
  if (["POST", "PATCH", "DELETE", "PUT"].includes(method.toUpperCase())) {
    return "mutation"
  }

  // Default to read
  return "read"
}
