// Lightweight error logging utility
// Can be replaced with Sentry SDK when ready

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

interface ErrorContext {
    tags?: Record<string, string>
    extra?: Record<string, unknown>
    user?: {
        id?: string
        email?: string
    }
}

// Capture and report errors
export function captureException(error: Error, context?: ErrorContext): void {
    // Log to console in development
    if (process.env.NODE_ENV === "development") {
        console.error("[Error Capture]", error, context)
    }

    // If Sentry is configured, send to Sentry
    if (SENTRY_DSN && typeof window !== "undefined") {
        // Using Sentry's browser SDK (if installed)
        // @ts-expect-error Sentry may not be defined
        if (window.Sentry) {
            // @ts-expect-error Sentry may not be defined
            window.Sentry.captureException(error, {
                tags: context?.tags,
                extra: context?.extra,
                user: context?.user,
            })
        } else {
            // Fallback: Send to a simple error endpoint
            fetch("/api/errors", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: error.message,
                    stack: error.stack,
                    ...context,
                    timestamp: new Date().toISOString(),
                }),
            }).catch(() => {
                // Silently fail if error reporting fails
            })
        }
    }
}

// Capture a message (not an error)
export function captureMessage(message: string, level: "info" | "warning" | "error" = "info", context?: ErrorContext): void {
    if (process.env.NODE_ENV === "development") {
        console.log(`[${level.toUpperCase()}]`, message, context)
    }

    if (SENTRY_DSN && typeof window !== "undefined") {
        // @ts-expect-error Sentry may not be defined
        if (window.Sentry) {
            // @ts-expect-error Sentry may not be defined
            window.Sentry.captureMessage(message, {
                level,
                tags: context?.tags,
                extra: context?.extra,
            })
        }
    }
}

// Set user context for all subsequent error reports
export function setUser(user: { id?: string; email?: string } | null): void {
    if (typeof window !== "undefined") {
        // @ts-expect-error Sentry may not be defined
        if (window.Sentry) {
            // @ts-expect-error Sentry may not be defined
            window.Sentry.setUser(user)
        }
    }
}
