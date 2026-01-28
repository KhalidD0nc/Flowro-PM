// Map technical errors to user-friendly messages

// Common error patterns and their user-friendly messages
const errorPatterns: Array<{ pattern: RegExp | string; message: string }> = [
    // Authentication errors
    { pattern: "auth/invalid-email", message: "Please enter a valid email address." },
    { pattern: "auth/user-not-found", message: "No account found with this email address." },
    { pattern: "auth/wrong-password", message: "Incorrect password. Please try again." },
    { pattern: "auth/invalid-credential", message: "Invalid email or password." },
    { pattern: "auth/email-already-in-use", message: "An account with this email already exists." },
    { pattern: "auth/weak-password", message: "Password should be at least 6 characters." },
    { pattern: "auth/too-many-requests", message: "Too many attempts. Please try again later." },
    { pattern: "auth/network-request-failed", message: "Network error. Please check your connection." },
    { pattern: "auth/popup-closed-by-user", message: "Sign-in was cancelled." },
    { pattern: "auth/user-disabled", message: "This account has been disabled." },

    // API/Network errors
    { pattern: /fetch failed/i, message: "Unable to connect. Please check your internet connection." },
    { pattern: /network error/i, message: "Network error. Please try again." },
    { pattern: /timeout/i, message: "Request timed out. Please try again." },
    { pattern: /429/i, message: "Too many requests. Please wait a moment and try again." },
    { pattern: /500|internal server/i, message: "Something went wrong on our end. Please try again." },
    { pattern: /503|service unavailable/i, message: "Service temporarily unavailable. Please try again." },
    { pattern: /unauthorized|401/i, message: "Please sign in to continue." },
    { pattern: /forbidden|403/i, message: "You don't have permission to do this." },
    { pattern: /not found|404/i, message: "The requested resource was not found." },

    // Project/Blueprint errors
    { pattern: /project.*not found/i, message: "Project not found. It may have been deleted." },
    { pattern: /blueprint.*not found/i, message: "Blueprint not found." },
    { pattern: /quota.*exceeded/i, message: "You've reached your plan limit. Consider upgrading." },
    { pattern: /rate.*limit/i, message: "Please slow down. Try again in a moment." },

    // Generic patterns
    { pattern: /invalid.*json/i, message: "Invalid data received. Please try again." },
    { pattern: /validation.*failed/i, message: "Please check your input and try again." },
]

/**
 * Convert a technical error to a user-friendly message
 */
export function getUserFriendlyError(error: unknown): string {
    const errorString = getErrorString(error)

    // Check against known patterns
    for (const { pattern, message } of errorPatterns) {
        if (typeof pattern === "string") {
            if (errorString.includes(pattern)) {
                return message
            }
        } else if (pattern.test(errorString)) {
            return message
        }
    }

    // Default message for unknown errors
    return "Something went wrong. Please try again."
}

/**
 * Extract error string from various error types
 */
function getErrorString(error: unknown): string {
    if (typeof error === "string") {
        return error
    }

    if (error instanceof Error) {
        return error.message
    }

    if (error && typeof error === "object") {
        // Check for common error object shapes
        const obj = error as Record<string, unknown>
        if (typeof obj.message === "string") return obj.message
        if (typeof obj.error === "string") return obj.error
        if (typeof obj.code === "string") return obj.code
    }

    return String(error)
}

/**
 * Get error code from error object if available
 */
export function getErrorCode(error: unknown): string | null {
    if (error && typeof error === "object") {
        const obj = error as Record<string, unknown>
        if (typeof obj.code === "string") return obj.code
    }
    return null
}

/**
 * Check if error is a network-related error
 */
export function isNetworkError(error: unknown): boolean {
    const errorString = getErrorString(error)
    return /network|fetch failed|timeout|offline/i.test(errorString)
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
    const errorString = getErrorString(error)
    return /auth\/|unauthorized|401/i.test(errorString)
}

/**
 * Check if error is a rate limit error
 */
export function isRateLimitError(error: unknown): boolean {
    const errorString = getErrorString(error)
    return /rate.*limit|429|too many/i.test(errorString)
}
