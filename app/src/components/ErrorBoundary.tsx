"use client"

import React, { Component, ReactNode } from "react"
import { analytics } from "@/lib/analytics"

interface ErrorBoundaryProps {
    children: ReactNode
    fallback?: ReactNode
}

interface ErrorBoundaryState {
    hasError: boolean
    error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Log to analytics
        analytics.errorOccurred(
            "react_error",
            error.message,
            errorInfo.componentStack || undefined
        )

        // Log to console in development
        if (process.env.NODE_ENV === "development") {
            console.error("ErrorBoundary caught an error:", error, errorInfo)
        }
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null })
    }

    render() {
        if (this.state.hasError) {
            // Custom fallback if provided
            if (this.props.fallback) {
                return this.props.fallback
            }

            // Default fallback UI
            return (
                <div className="min-h-screen bg-[#101922] flex items-center justify-center p-6">
                    <div className="max-w-md w-full text-center">
                        <div className="size-16 mx-auto rounded-2xl bg-red-500/10 flex items-center justify-center mb-6">
                            <span className="material-symbols-outlined text-red-500 text-3xl">
                                error
                            </span>
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-3">
                            Something went wrong
                        </h1>
                        <p className="text-[#9dabb9] mb-6">
                            We encountered an unexpected error. Please try again or refresh the page.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={this.handleRetry}
                                className="px-5 py-2.5 bg-[#137fec] hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
                            >
                                Try Again
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                className="px-5 py-2.5 bg-[#283039] hover:bg-[#3d4a56] text-white font-medium rounded-lg transition-colors"
                            >
                                Refresh Page
                            </button>
                        </div>
                        {process.env.NODE_ENV === "development" && this.state.error && (
                            <details className="mt-6 text-left bg-[#0d141c] rounded-lg p-4 border border-[#283039]">
                                <summary className="text-[#9dabb9] text-sm cursor-pointer">
                                    Error Details
                                </summary>
                                <pre className="mt-3 text-xs text-red-400 overflow-auto">
                                    {this.state.error.message}
                                    {"\n\n"}
                                    {this.state.error.stack}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}

export default ErrorBoundary
