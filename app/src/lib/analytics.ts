// Type-safe analytics event tracking wrapper

declare global {
    interface Window {
        gtag?: (...args: unknown[]) => void
    }
}

// Event types
export type AnalyticsEvent =
    | { name: "signup_started"; params: { method: "google" | "email" } }
    | { name: "signup_completed"; params: { method: "google" | "email" } }
    | { name: "project_created"; params: { project_id?: string } }
    | { name: "blueprint_generated"; params: { project_id: string; version: string } }
    | { name: "blueprint_exported"; params: { project_id: string; format: "json" | "markdown" } }
    | { name: "share_link_created"; params: { project_id: string; type: "public" | "email" } }
    | { name: "upgrade_modal_viewed"; params: { source: string } }
    | { name: "error_occurred"; params: { error_type: string; error_message: string; location?: string } }
    | { name: "page_view"; params: { page_path: string; page_title?: string } }
    | { name: "feature_used"; params: { feature_name: string; details?: string } }
    // Conversion funnel events
    | { name: "trial_started"; params: { user_id?: string } }
    | { name: "subscription_started"; params: { plan: string; billing_cycle: "monthly" | "yearly" } }
    | { name: "subscription_completed"; params: { plan: string; billing_cycle: "monthly" | "yearly"; amount?: number } }

// Track an analytics event
export function trackEvent<T extends AnalyticsEvent>(event: T): void {
    // GA4 tracking
    if (typeof window !== "undefined" && window.gtag) {
        window.gtag("event", event.name, event.params)
    }

    // Log in development
    if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.log("[Analytics]", event.name, event.params)
    }
}

// Convenience functions for common events
export const analytics = {
    signupStarted: (method: "google" | "email") => {
        trackEvent({ name: "signup_started", params: { method } })
    },

    signupCompleted: (method: "google" | "email") => {
        trackEvent({ name: "signup_completed", params: { method } })
    },

    projectCreated: (projectId?: string) => {
        trackEvent({ name: "project_created", params: { project_id: projectId } })
    },

    blueprintGenerated: (projectId: string, version: string) => {
        trackEvent({ name: "blueprint_generated", params: { project_id: projectId, version } })
    },

    blueprintExported: (projectId: string, format: "json" | "markdown") => {
        trackEvent({ name: "blueprint_exported", params: { project_id: projectId, format } })
    },

    shareLinkCreated: (projectId: string, type: "public" | "email") => {
        trackEvent({ name: "share_link_created", params: { project_id: projectId, type } })
    },

    upgradeModalViewed: (source: string) => {
        trackEvent({ name: "upgrade_modal_viewed", params: { source } })
    },

    errorOccurred: (errorType: string, errorMessage: string, location?: string) => {
        trackEvent({ name: "error_occurred", params: { error_type: errorType, error_message: errorMessage, location } })
    },

    pageView: (pagePath: string, pageTitle?: string) => {
        trackEvent({ name: "page_view", params: { page_path: pagePath, page_title: pageTitle } })
    },

    featureUsed: (featureName: string, details?: string) => {
        trackEvent({ name: "feature_used", params: { feature_name: featureName, details } })
    },

    // Conversion funnel events
    trialStarted: (userId?: string) => {
        trackEvent({ name: "trial_started", params: { user_id: userId } })
    },

    subscriptionStarted: (plan: string, billingCycle: "monthly" | "yearly") => {
        trackEvent({ name: "subscription_started", params: { plan, billing_cycle: billingCycle } })
    },

    subscriptionCompleted: (plan: string, billingCycle: "monthly" | "yearly", amount?: number) => {
        trackEvent({ name: "subscription_completed", params: { plan, billing_cycle: billingCycle, amount } })
    },
}

