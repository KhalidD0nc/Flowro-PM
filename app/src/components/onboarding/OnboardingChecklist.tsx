"use client"

import { useState } from "react"
import { onboardingChecklistItems, type OnboardingChecklistItem } from "@/lib/userProfile"

interface OnboardingChecklistProps {
    completedItems: string[]
    onItemClick?: (item: OnboardingChecklistItem) => void
    onDismiss: () => void
}

export default function OnboardingChecklist({ completedItems, onItemClick, onDismiss }: OnboardingChecklistProps) {
    const [isExpanded, setIsExpanded] = useState(true)
    const [isHovered, setIsHovered] = useState(false)

    const items: OnboardingChecklistItem[] = onboardingChecklistItems.map((item) => ({
        ...item,
        completed: completedItems.includes(item.id),
    }))

    const completedCount = items.filter((item) => item.completed).length
    const progress = (completedCount / items.length) * 100
    const allCompleted = completedCount === items.length

    if (allCompleted) return null

    return (
        <div
            className="fixed bottom-4 left-4 z-40 w-80 rounded-2xl border border-[#283039] bg-[#18212b]/95 backdrop-blur-sm shadow-2xl shadow-black/30 overflow-hidden transition-all duration-300"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Header */}
            <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    <div className="relative size-10 rounded-full bg-[#137fec]/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[#137fec]">checklist</span>
                        {/* Progress ring */}
                        <svg className="absolute inset-0 size-10 -rotate-90">
                            <circle
                                cx="20"
                                cy="20"
                                r="18"
                                fill="none"
                                stroke="#283039"
                                strokeWidth="2"
                            />
                            <circle
                                cx="20"
                                cy="20"
                                r="18"
                                fill="none"
                                stroke="#137fec"
                                strokeWidth="2"
                                strokeDasharray={`${progress * 1.13} 113`}
                                className="transition-all duration-500"
                            />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-white text-sm font-semibold">Getting Started</h3>
                        <p className="text-[#9dabb9] text-xs">{completedCount}/{items.length} completed</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isHovered && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                onDismiss()
                            }}
                            className="p-1 rounded hover:bg-white/10 text-[#9dabb9] hover:text-white transition-colors"
                            title="Dismiss"
                        >
                            <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                    )}
                    <span className={`material-symbols-outlined text-[#9dabb9] transition-transform ${isExpanded ? "rotate-180" : ""}`}>
                        expand_more
                    </span>
                </div>
            </div>

            {/* Checklist items */}
            {isExpanded && (
                <div className="px-4 pb-4 space-y-2">
                    {items.map((item, index) => (
                        <div
                            key={item.id}
                            onClick={() => onItemClick?.(item)}
                            className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                                item.completed
                                    ? "bg-green-500/5 border-green-500/20"
                                    : "bg-[#283039]/30 border-[#283039] hover:border-[#137fec]/30 cursor-pointer"
                            }`}
                        >
                            <div className={`flex-shrink-0 size-5 rounded-full flex items-center justify-center mt-0.5 ${
                                item.completed
                                    ? "bg-green-500"
                                    : "border-2 border-[#9dabb9]"
                            }`}>
                                {item.completed && (
                                    <span className="material-symbols-outlined text-white text-sm">check</span>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-[#9dabb9] text-xs font-mono">{index + 1}.</span>
                                    <h4 className={`text-sm font-medium truncate ${
                                        item.completed ? "text-green-400 line-through" : "text-white"
                                    }`}>
                                        {item.title}
                                    </h4>
                                </div>
                                <p className="text-[#9dabb9] text-xs mt-0.5">{item.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
