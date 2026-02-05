/**
 * Simple in-memory cache for latest blueprints
 * Reduces Firestore reads by caching blueprint data per project
 * 
 * Cache Strategy:
 * - Read-through: Cache miss = automatic fetch from Firestore
 * - Write-through: Updates immediately invalidate cache
 * - TTL: 5 minutes auto-expiration for safety
 */

interface CachedBlueprint {
  content: unknown
  version: string
  timestamp: number
}

// In-memory cache storage
const blueprintCache = new Map<string, CachedBlueprint>()

// Cache TTL: 5 minutes
const CACHE_TTL = 5 * 60 * 1000

/**
 * Get cached blueprint for a project
 * Returns null if cache miss or expired
 */
export function getCachedBlueprint(projectId: string): CachedBlueprint | null {
  const cached = blueprintCache.get(projectId)
  
  if (!cached) {
    return null
  }
  
  // Check if expired
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    blueprintCache.delete(projectId)
    return null
  }
  
  return cached
}

/**
 * Store blueprint in cache
 */
export function setCachedBlueprint(
  projectId: string,
  content: unknown,
  version: string
): void {
  blueprintCache.set(projectId, {
    content,
    version,
    timestamp: Date.now()
  })
}

/**
 * Invalidate cache for a project
 * Call this after blueprint updates
 */
export function invalidateCache(projectId: string): void {
  blueprintCache.delete(projectId)
}

/**
 * Get cache stats (for debugging/monitoring)
 */
export function getCacheStats() {
  return {
    size: blueprintCache.size,
    entries: Array.from(blueprintCache.keys())
  }
}
