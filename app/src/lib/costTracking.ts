// Firebase-based cost tracking for LLM usage
// Tracks costs per user and per system with configurable monthly limits
// Collection: system_config/cost_tracking

import { getAdminDb } from "./firebase-admin"
import { estimateTokens, estimateCost } from "./tokenCounter"
import { logInfo, logWarn, logError } from "./logger"

// Firestore collection and document paths
const COST_TRACKING_COLLECTION = "cost_tracking"
const SYSTEM_CONFIG_DOC = "system_config"
const USER_USAGE_COLLECTION = "user_usage"

// Default monthly budget ($20/month for entire system)
const DEFAULT_MONTHLY_BUDGET = 20.00

// Types
export interface CostConfig {
    monthlyBudget: number        // Total monthly budget in USD (default: $20)
    perUserDailyLimit: number    // Optional per-user daily limit (default: $5)
    enabled: boolean             // Whether cost tracking is enabled
    alertThreshold: number       // Percentage to trigger warning (default: 80%)
    lastUpdated: string
}

export interface UserUsage {
    userId: string
    month: string                // Format: "2026-01"
    totalCost: number
    tokenCount: number
    requestCount: number
    lastRequest: string
}

export interface SystemUsage {
    month: string
    totalCost: number
    totalTokens: number
    totalRequests: number
    userCount: number
    lastUpdated: string
}

/**
 * Get or create cost configuration from Firebase
 */
export async function getCostConfig(): Promise<CostConfig> {
    try {
        const db = getAdminDb()
        const configDoc = await db.collection(COST_TRACKING_COLLECTION).doc(SYSTEM_CONFIG_DOC).get()

        if (configDoc.exists) {
            return configDoc.data() as CostConfig
        }

        // Create default config if not exists
        const defaultConfig: CostConfig = {
            monthlyBudget: DEFAULT_MONTHLY_BUDGET,
            perUserDailyLimit: 5.00,
            enabled: true,
            alertThreshold: 80,
            lastUpdated: new Date().toISOString()
        }

        await db.collection(COST_TRACKING_COLLECTION).doc(SYSTEM_CONFIG_DOC).set(defaultConfig)
        logInfo("cost_config_created", { config: defaultConfig })

        return defaultConfig
    } catch (error) {
        logError("cost_config_error", { error: error instanceof Error ? error.message : "Unknown" })
        // Return safe defaults on error
        return {
            monthlyBudget: DEFAULT_MONTHLY_BUDGET,
            perUserDailyLimit: 5.00,
            enabled: true,
            alertThreshold: 80,
            lastUpdated: new Date().toISOString()
        }
    }
}

/**
 * Get current month string for tracking
 */
function getCurrentMonth(): string {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Get system usage for current month
 */
export async function getSystemUsage(): Promise<SystemUsage> {
    const db = getAdminDb()
    const month = getCurrentMonth()
    const usageDoc = await db.collection(COST_TRACKING_COLLECTION).doc(`usage_${month}`).get()

    if (usageDoc.exists) {
        return usageDoc.data() as SystemUsage
    }

    return {
        month,
        totalCost: 0,
        totalTokens: 0,
        totalRequests: 0,
        userCount: 0,
        lastUpdated: new Date().toISOString()
    }
}

/**
 * Get user usage for current month
 */
export async function getUserUsage(userId: string): Promise<UserUsage> {
    const db = getAdminDb()
    const month = getCurrentMonth()
    const userDoc = await db
        .collection(COST_TRACKING_COLLECTION)
        .doc(USER_USAGE_COLLECTION)
        .collection(month)
        .doc(userId)
        .get()

    if (userDoc.exists) {
        return userDoc.data() as UserUsage
    }

    return {
        userId,
        month,
        totalCost: 0,
        tokenCount: 0,
        requestCount: 0,
        lastRequest: ""
    }
}

/**
 * Check if request is within budget limits
 * Returns { allowed: boolean, reason?: string }
 */
export async function checkBudgetLimit(
    userId: string,
    estimatedTokens: number
): Promise<{ allowed: boolean; reason?: string; remainingBudget?: number }> {
    try {
        const config = await getCostConfig()

        if (!config.enabled) {
            return { allowed: true }
        }

        const model = process.env.OPENROUTER_MODEL || "deepseek/deepseek-v3.2"
        const costEstimate = estimateCost(estimatedTokens, model)
        const systemUsage = await getSystemUsage()

        // Check system-wide monthly limit
        const projectedSystemCost = systemUsage.totalCost + costEstimate.total
        if (projectedSystemCost > config.monthlyBudget) {
            logWarn("budget_limit_exceeded", {
                userId,
                currentCost: systemUsage.totalCost,
                projected: projectedSystemCost,
                limit: config.monthlyBudget
            })
            return {
                allowed: false,
                reason: `Monthly budget limit reached ($${config.monthlyBudget}). Please try again next month or contact support.`,
                remainingBudget: Math.max(0, config.monthlyBudget - systemUsage.totalCost)
            }
        }

        // Check if approaching limit (warning threshold)
        const usagePercentage = (projectedSystemCost / config.monthlyBudget) * 100
        if (usagePercentage >= config.alertThreshold) {
            logWarn("budget_warning", {
                userId,
                usagePercentage: usagePercentage.toFixed(1),
                threshold: config.alertThreshold
            })
        }

        return {
            allowed: true,
            remainingBudget: config.monthlyBudget - projectedSystemCost
        }
    } catch (error) {
        logError("budget_check_error", {
            userId,
            error: error instanceof Error ? error.message : "Unknown"
        })
        // Allow request on error (fail open for UX)
        return { allowed: true }
    }
}

/**
 * Record LLM usage after successful request
 */
export async function recordUsage(
    userId: string,
    inputTokens: number,
    outputTokens: number,
    model: string
): Promise<void> {
    try {
        const db = getAdminDb()
        const month = getCurrentMonth()
        const totalTokens = inputTokens + outputTokens
        const costEstimate = estimateCost(totalTokens, model)
        const now = new Date().toISOString()

        // Update system usage
        const systemRef = db.collection(COST_TRACKING_COLLECTION).doc(`usage_${month}`)
        const systemDoc = await systemRef.get()

        if (systemDoc.exists) {
            await systemRef.update({
                totalCost: (systemDoc.data()?.totalCost || 0) + costEstimate.total,
                totalTokens: (systemDoc.data()?.totalTokens || 0) + totalTokens,
                totalRequests: (systemDoc.data()?.totalRequests || 0) + 1,
                lastUpdated: now
            })
        } else {
            await systemRef.set({
                month,
                totalCost: costEstimate.total,
                totalTokens: totalTokens,
                totalRequests: 1,
                userCount: 1,
                lastUpdated: now
            })
        }

        // Update user usage
        const userRef = db
            .collection(COST_TRACKING_COLLECTION)
            .doc(USER_USAGE_COLLECTION)
            .collection(month)
            .doc(userId)
        const userDoc = await userRef.get()

        if (userDoc.exists) {
            await userRef.update({
                totalCost: (userDoc.data()?.totalCost || 0) + costEstimate.total,
                tokenCount: (userDoc.data()?.tokenCount || 0) + totalTokens,
                requestCount: (userDoc.data()?.requestCount || 0) + 1,
                lastRequest: now
            })
        } else {
            await userRef.set({
                userId,
                month,
                totalCost: costEstimate.total,
                tokenCount: totalTokens,
                requestCount: 1,
                lastRequest: now
            })

            // Increment user count in system doc
            await systemRef.update({
                userCount: (systemDoc.exists ? (systemDoc.data()?.userCount || 0) : 0) + 1
            })
        }

        logInfo("usage_recorded", {
            userId,
            tokens: totalTokens,
            cost: costEstimate.total.toFixed(4),
            model
        })
    } catch (error) {
        logError("usage_record_error", {
            userId,
            error: error instanceof Error ? error.message : "Unknown"
        })
        // Don't throw - recording failure shouldn't block the user
    }
}

/**
 * Get usage statistics for admin dashboard
 */
export async function getUsageStats(): Promise<{
    config: CostConfig
    systemUsage: SystemUsage
    budgetRemaining: number
    budgetPercentUsed: number
}> {
    const config = await getCostConfig()
    const systemUsage = await getSystemUsage()
    const budgetRemaining = Math.max(0, config.monthlyBudget - systemUsage.totalCost)
    const budgetPercentUsed = (systemUsage.totalCost / config.monthlyBudget) * 100

    return {
        config,
        systemUsage,
        budgetRemaining,
        budgetPercentUsed
    }
}

/**
 * Update cost configuration (admin only)
 */
export async function updateCostConfig(updates: Partial<CostConfig>): Promise<CostConfig> {
    const db = getAdminDb()
    const configRef = db.collection(COST_TRACKING_COLLECTION).doc(SYSTEM_CONFIG_DOC)

    const currentConfig = await getCostConfig()
    const newConfig: CostConfig = {
        ...currentConfig,
        ...updates,
        lastUpdated: new Date().toISOString()
    }

    await configRef.set(newConfig)
    logInfo("cost_config_updated", { updates })

    return newConfig
}
