"use client"

import { ReactNode } from "react"

interface SkeletonProps {
    className?: string
}

// Base skeleton with shimmer animation
export function Skeleton({ className = "" }: SkeletonProps) {
    return (
        <div
            className={`animate-pulse bg-[#283039] rounded ${className}`}
            aria-hidden="true"
        />
    )
}

// Text line skeleton
export function SkeletonText({ lines = 1, className = "" }: { lines?: number; className?: string }) {
    return (
        <div className={`space-y-2 ${className}`}>
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton
                    key={i}
                    className={`h-4 ${i === lines - 1 && lines > 1 ? "w-3/4" : "w-full"}`}
                />
            ))}
        </div>
    )
}

// Card skeleton for project cards
export function SkeletonCard({ className = "" }: SkeletonProps) {
    return (
        <div className={`rounded-xl border border-[#283039] bg-[#18212b] p-5 ${className}`}>
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <Skeleton className="size-10 rounded-lg" />
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-16" />
                    </div>
                </div>
                <Skeleton className="size-6 rounded" />
            </div>
            <Skeleton className="h-20 w-full rounded-lg mb-4" />
            <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-20 rounded-full" />
            </div>
        </div>
    )
}

// List of skeleton items
export function SkeletonList({ count = 3, className = "" }: { count?: number; className?: string }) {
    return (
        <div className={`space-y-3 ${className}`}>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-[#283039] bg-[#18212b]">
                    <Skeleton className="size-8 rounded-full" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-3 w-1/3" />
                    </div>
                </div>
            ))}
        </div>
    )
}

// UBP Section skeleton
export function SkeletonUBPSection({ className = "" }: SkeletonProps) {
    return (
        <div className={`bg-[#1f2937] border border-[#283039] rounded-xl overflow-hidden ${className}`}>
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-[#283039] bg-[#111418]/50">
                <Skeleton className="size-6 rounded" />
                <Skeleton className="h-5 w-40" />
            </div>
            {/* Content */}
            <div className="p-6 space-y-4">
                <SkeletonText lines={3} />
                <div className="grid grid-cols-2 gap-4 mt-4">
                    <Skeleton className="h-24 rounded-lg" />
                    <Skeleton className="h-24 rounded-lg" />
                </div>
            </div>
        </div>
    )
}

// Stats card skeleton
export function SkeletonStat({ className = "" }: SkeletonProps) {
    return (
        <div className={`flex flex-col gap-2 rounded-xl border border-[#283039] bg-[#18212b] p-6 ${className}`}>
            <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="size-6 rounded" />
            </div>
            <Skeleton className="h-9 w-12 mt-2" />
        </div>
    )
}

// Wrapper that conditionally shows skeleton or content
interface SkeletonWrapperProps {
    loading: boolean
    skeleton: ReactNode
    children: ReactNode
}

export function SkeletonWrapper({ loading, skeleton, children }: SkeletonWrapperProps) {
    return loading ? <>{skeleton}</> : <>{children}</>
}

// Grid of skeleton cards
export function SkeletonCardGrid({ count = 6, className = "" }: { count?: number; className?: string }) {
    return (
        <div className={`grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 ${className}`}>
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonCard key={i} />
            ))}
        </div>
    )
}
