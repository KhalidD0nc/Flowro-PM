// Admin API route for viewing logs and usage statistics
// Protected endpoint - requires admin authentication

import { NextRequest, NextResponse } from "next/server"
import { verifyAuthToken, isAuthError, unauthorizedResponse } from "../../blueprints/auth"
import { getLogs, getLogStats } from "@/lib/logger"
import { getUsageStats, getCostConfig, updateCostConfig, CostConfig } from "@/lib/costTracking"

// List of admin user IDs (add your Firebase UID here)
const ADMIN_USERS = [
    // Add admin user IDs here
    process.env.ADMIN_USER_ID || ""
].filter(Boolean)

/**
 * Check if user is an admin
 */
function isAdmin(userId: string): boolean {
    // If no admins configured, allow any authenticated user (dev mode)
    if (ADMIN_USERS.length === 0) {
        return true
    }
    return ADMIN_USERS.includes(userId)
}

/**
 * GET /api/admin/logs
 * Query params:
 * - level: "info" | "warn" | "error" | "debug" (optional)
 * - limit: number (default: 100)
 * - stats: "true" to include statistics
 * - usage: "true" to include usage/cost statistics
 */
export async function GET(request: NextRequest) {
    // 1. Verify authentication
    const authResult = await verifyAuthToken(request)
    if (isAuthError(authResult)) {
        return unauthorizedResponse(authResult)
    }

    // 2. Check admin access
    if (!isAdmin(authResult.userId)) {
        return NextResponse.json(
            { error: "Admin access required" },
            { status: 403 }
        )
    }

    // 3. Parse query params
    const { searchParams } = new URL(request.url)
    const level = searchParams.get("level") as "info" | "warn" | "error" | "debug" | null
    const limit = parseInt(searchParams.get("limit") || "100", 10)
    const includeStats = searchParams.get("stats") === "true"
    const includeUsage = searchParams.get("usage") === "true"

    // 4. Build response
    const response: Record<string, unknown> = {
        logs: getLogs(level || undefined, limit)
    }

    if (includeStats) {
        response.stats = getLogStats()
    }

    if (includeUsage) {
        try {
            response.usage = await getUsageStats()
        } catch (error) {
            response.usageError = error instanceof Error ? error.message : "Failed to fetch usage stats"
        }
    }

    return NextResponse.json(response)
}

/**
 * PATCH /api/admin/logs
 * Update cost configuration
 * Body: Partial<CostConfig>
 */
export async function PATCH(request: NextRequest) {
    // 1. Verify authentication
    const authResult = await verifyAuthToken(request)
    if (isAuthError(authResult)) {
        return unauthorizedResponse(authResult)
    }

    // 2. Check admin access
    if (!isAdmin(authResult.userId)) {
        return NextResponse.json(
            { error: "Admin access required" },
            { status: 403 }
        )
    }

    // 3. Parse body
    const body = await request.json()
    const { monthlyBudget, perUserDailyLimit, enabled, alertThreshold } = body

    // 4. Validate and update
    const updates: Partial<CostConfig> = {}

    if (typeof monthlyBudget === "number" && monthlyBudget > 0) {
        updates.monthlyBudget = monthlyBudget
    }
    if (typeof perUserDailyLimit === "number" && perUserDailyLimit > 0) {
        updates.perUserDailyLimit = perUserDailyLimit
    }
    if (typeof enabled === "boolean") {
        updates.enabled = enabled
    }
    if (typeof alertThreshold === "number" && alertThreshold > 0 && alertThreshold <= 100) {
        updates.alertThreshold = alertThreshold
    }

    if (Object.keys(updates).length === 0) {
        return NextResponse.json(
            { error: "No valid updates provided" },
            { status: 400 }
        )
    }

    try {
        const newConfig = await updateCostConfig(updates)
        return NextResponse.json({
            success: true,
            config: newConfig
        })
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to update config" },
            { status: 500 }
        )
    }
}
