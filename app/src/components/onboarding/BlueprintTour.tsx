"use client"

import { useState, useEffect, useCallback } from "react"

interface TourStep {
    id: string
    sectionId: string
    title: string
    description: string
    position: "top" | "bottom" | "left" | "right"
}

const tourSteps: TourStep[] = [
    {
        id: "vision",
        sectionId: "ubp-vision",
        title: "1. Product Vision",
        description: "Start here with your product's core purpose, goals, and target audience.",
        position: "bottom",
    },
    {
        id: "scope",
        sectionId: "ubp-scope",
        title: "2. Scope",
        description: "Define what's in scope and out of scope to keep development focused.",
        position: "bottom",
    },
    {
        id: "actors",
        sectionId: "ubp-actors",
        title: "3. Actors",
        description: "Identify all users and systems that interact with your product.",
        position: "bottom",
    },
    {
        id: "behaviors",
        sectionId: "ubp-behaviors",
        title: "4. Behaviors",
        description: "Define how your product behaves using Given-When-Then format.",
        position: "bottom",
    },
    {
        id: "constraints",
        sectionId: "ubp-constraints",
        title: "5. Constraints & Risks",
        description: "Document technical constraints and potential risks early.",
        position: "bottom",
    },
    {
        id: "tech",
        sectionId: "ubp-tech",
        title: "6. Technology Decisions",
        description: "Record your tech stack and architectural choices.",
        position: "bottom",
    },
    {
        id: "phases",
        sectionId: "ubp-phases",
        title: "7. Implementation Phases",
        description: "Break down your project into manageable phases.",
        position: "bottom",
    },
    {
        id: "integration",
        sectionId: "ubp-integration",
        title: "8. Integration Points",
        description: "Map out all external systems and APIs you'll integrate with.",
        position: "bottom",
    },
    {
        id: "changelog",
        sectionId: "ubp-changelog",
        title: "9. Change Log",
        description: "Track version history and changes to your blueprint.",
        position: "bottom",
    },
]

interface BlueprintTourProps {
    isOpen: boolean
    onComplete: () => void
    onSkip: () => void
}

export default function BlueprintTour({ isOpen, onComplete, onSkip }: BlueprintTourProps) {
    const [currentStep, setCurrentStep] = useState(0)
    const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 })

    const step = tourSteps[currentStep]
    const isLastStep = currentStep === tourSteps.length - 1

    const updateTooltipPosition = useCallback(() => {
        if (!step) return

        const element = document.getElementById(step.sectionId)
        if (!element) return

        const rect = element.getBoundingClientRect()
        const scrollY = window.scrollY

        // Scroll element into view if needed
        element.scrollIntoView({ behavior: "smooth", block: "center" })

        // Position tooltip below the section header
        setTooltipPosition({
            top: rect.top + scrollY + 60,
            left: Math.max(16, Math.min(rect.left + 16, window.innerWidth - 320)),
        })
    }, [step])

    useEffect(() => {
        if (!isOpen) return

        updateTooltipPosition()
        window.addEventListener("resize", updateTooltipPosition)
        window.addEventListener("scroll", updateTooltipPosition)

        return () => {
            window.removeEventListener("resize", updateTooltipPosition)
            window.removeEventListener("scroll", updateTooltipPosition)
        }
    }, [isOpen, currentStep, updateTooltipPosition])

    const handleNext = () => {
        if (isLastStep) {
            onComplete()
        } else {
            setCurrentStep((prev) => prev + 1)
        }
    }

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep((prev) => prev - 1)
        }
    }

    if (!isOpen || !step) return null

    return (
        <>
            {/* Overlay */}
            <div className="fixed inset-0 z-[70] bg-black/40 pointer-events-auto" onClick={onSkip} />

            {/* Highlight current section */}
            <style jsx global>{`
                #${step.sectionId} {
                    position: relative;
                    z-index: 75;
                    box-shadow: 0 0 0 4px rgba(19, 127, 236, 0.5), 0 0 40px rgba(19, 127, 236, 0.2);
                    border-radius: 12px;
                }
            `}</style>

            {/* Tooltip */}
            <div
                className="fixed z-[80] w-72 rounded-xl border border-[#137fec]/50 bg-[#18212b] shadow-2xl shadow-[#137fec]/20 p-4 animate-fade-in"
                style={{ top: tooltipPosition.top, left: tooltipPosition.left }}
            >
                {/* Arrow */}
                <div className="absolute -top-2 left-6 w-4 h-4 bg-[#18212b] border-l border-t border-[#137fec]/50 rotate-45" />

                {/* Progress */}
                <div className="flex items-center justify-between mb-3">
                    <span className="text-[#9dabb9] text-xs font-mono">
                        {currentStep + 1} of {tourSteps.length}
                    </span>
                    <div className="flex gap-1">
                        {tourSteps.map((_, i) => (
                            <div
                                key={i}
                                className={`h-1 w-4 rounded-full transition-colors ${
                                    i <= currentStep ? "bg-[#137fec]" : "bg-[#283039]"
                                }`}
                            />
                        ))}
                    </div>
                </div>

                {/* Content */}
                <h3 className="text-white font-bold text-sm mb-1">{step.title}</h3>
                <p className="text-[#9dabb9] text-xs mb-4 leading-relaxed">{step.description}</p>

                {/* Actions */}
                <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                        {currentStep > 0 && (
                            <button
                                onClick={handlePrev}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[#9dabb9] hover:text-white hover:bg-white/10 transition-colors text-xs"
                            >
                                <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                                Back
                            </button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={onSkip}
                            className="px-3 py-1.5 rounded-lg text-[#9dabb9] hover:text-white transition-colors text-xs"
                        >
                            Skip tour
                        </button>
                        <button
                            onClick={handleNext}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#137fec] text-white hover:bg-blue-600 transition-colors text-xs font-medium"
                        >
                            {isLastStep ? "Finish" : "Next"}
                            {!isLastStep && <span className="material-symbols-outlined text-[14px]">arrow_forward</span>}
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}
