// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
//
// To enable Sentry, install the package: npm install @sentry/nextjs
// Then uncomment the code below.

/*
import * as Sentry from "@sentry/nextjs"

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

if (SENTRY_DSN) {
    Sentry.init({
        dsn: SENTRY_DSN,

        // Adjust this value in production, or use tracesSampler for greater control
        tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

        // Setting this option to true will print useful information to the console while you're setting up Sentry.
        debug: false,

        // Replay configuration
        replaysOnErrorSampleRate: 1.0,
        replaysSessionSampleRate: 0.1,

        integrations: [
            Sentry.replayIntegration({
                // Mask all text content and input values
                maskAllText: true,
                blockAllMedia: true,
            }),
        ],

        // Environment
        environment: process.env.NODE_ENV,

        // Filter out common non-actionable errors
        ignoreErrors: [
            // Network errors
            "Network request failed",
            "Failed to fetch",
            "Load failed",
            // Browser extensions
            "chrome-extension://",
            "moz-extension://",
            // User-cancelled operations
            "AbortError",
            "The user aborted a request",
            // Auth cancellations
            "popup-closed-by-user",
        ],

        // Before sending an event
        beforeSend(event) {
            // Filter out events from development
            if (process.env.NODE_ENV === "development") {
                console.log("Sentry event (dev mode):", event)
                return null
            }
            return event
        },
    })
}
*/

export {}
