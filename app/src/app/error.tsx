"use client"

import { useEffect } from "react"
import Link from "next/link"
import { analytics } from "@/lib/analytics"

interface ErrorProps {
    error: Error & { digest?: string }
    reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
    useEffect(() => {
        // Log to analytics/Sentry
        analytics.errorOccurred("runtime_error", error.message, "error_boundary")
        console.error("Application error:", error)
    }, [error])

    return (
        <div className="min-h-screen bg-[#101922] flex flex-col items-center justify-center px-4">
            {/* Background effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] rounded-full bg-red-500/5 blur-[100px]" />
                <div className="absolute top-[40%] -left-[10%] w-[500px] h-[500px] rounded-full bg-[#137fec]/5 blur-[80px]" />
            </div>

            <div className="relative z-10 flex flex-col items-center text-center max-w-md">
                {/* Error Icon */}
                <div className="size-24 rounded-2xl bg-red-500/10 flex items-center justify-center mb-8 border border-red-500/20">
                    <span className="material-symbols-outlined text-red-400 text-5xl">
                        error
                    </span>
                </div>

                {/* Message */}
                <h1 className="text-3xl font-bold text-white mb-3">Something went wrong</h1>
                <p className="text-[#9dabb9] text-lg mb-2">
                    We encountered an unexpected error. Our team has been notified.
                </p>

                {/* Error digest for support */}
                {error.digest && (
                    <p className="text-[#9dabb9]/60 text-sm mb-8 font-mono">
                        Error ID: {error.digest}
                    </p>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <button
                        onClick={reset}
                        className="flex items-center justify-center gap-2 h-12 px-6 rounded-lg bg-[#137fec] text-white font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-[#137fec]/20"
                    >
                        <span className="material-symbols-outlined text-[20px]">refresh</span>
                        Try Again
                    </button>
                    <Link
                        href="/app"
                        className="flex items-center justify-center gap-2 h-12 px-6 rounded-lg border border-[#283039] bg-[#18212b] text-white font-medium hover:bg-[#283039] transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px]">home</span>
                        Go to Command Center
                    </Link>
                </div>

                {/* Help text */}
                <p className="text-[#9dabb9] text-sm mt-8">
                    If this keeps happening, please{" "}
                    <a
                        href="mailto:support@flowro.ai"
                        className="text-[#137fec] hover:text-blue-400 transition-colors"
                    >
                        contact support
                    </a>
                </p>
            </div>
        </div>
    )
}
