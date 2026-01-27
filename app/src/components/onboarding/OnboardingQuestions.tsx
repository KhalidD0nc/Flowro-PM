"use client"

import { useState } from "react"
import type { UserProfile } from "@/lib/userProfile"

interface OnboardingQuestionsProps {
    isOpen: boolean
    onComplete: (role: UserProfile["role"], projectType: UserProfile["projectType"]) => void
    onSkip: () => void
}

const roles: { id: UserProfile["role"]; label: string; icon: string; description: string }[] = [
    { id: "founder", label: "Founder / CEO", icon: "rocket_launch", description: "Building my own product" },
    { id: "pm", label: "Product Manager", icon: "assignment", description: "Managing product development" },
    { id: "developer", label: "Developer", icon: "code", description: "Writing code and building features" },
    { id: "designer", label: "Designer", icon: "palette", description: "Designing user experiences" },
    { id: "other", label: "Other", icon: "person", description: "Something else entirely" },
]

const projectTypes: { id: UserProfile["projectType"]; label: string; icon: string; description: string }[] = [
    { id: "saas", label: "SaaS Product", icon: "cloud", description: "Web-based software service" },
    { id: "mobile", label: "Mobile App", icon: "smartphone", description: "iOS or Android application" },
    { id: "ecommerce", label: "E-commerce", icon: "shopping_cart", description: "Online store or marketplace" },
    { id: "internal", label: "Internal Tool", icon: "business", description: "Company internal software" },
    { id: "other", label: "Other", icon: "category", description: "Something different" },
]

export default function OnboardingQuestions({ isOpen, onComplete, onSkip }: OnboardingQuestionsProps) {
    const [step, setStep] = useState<1 | 2>(1)
    const [selectedRole, setSelectedRole] = useState<UserProfile["role"]>()
    const [selectedProjectType, setSelectedProjectType] = useState<UserProfile["projectType"]>()
    const [isAnimating, setIsAnimating] = useState(false)

    if (!isOpen) return null

    const handleRoleSelect = (role: UserProfile["role"]) => {
        setSelectedRole(role)
        setIsAnimating(true)
        setTimeout(() => {
            setStep(2)
            setIsAnimating(false)
        }, 200)
    }

    const handleProjectTypeSelect = (projectType: UserProfile["projectType"]) => {
        setSelectedProjectType(projectType)
        setTimeout(() => {
            onComplete(selectedRole, projectType)
        }, 200)
    }

    const handleBack = () => {
        setIsAnimating(true)
        setTimeout(() => {
            setStep(1)
            setIsAnimating(false)
        }, 200)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="relative w-full max-w-lg mx-4 rounded-2xl border border-[#283039] bg-[#18212b]/95 p-6 shadow-2xl shadow-black/40">
                {/* Progress indicator */}
                <div className="flex items-center justify-center gap-2 mb-6">
                    <div className={`h-1.5 w-12 rounded-full transition-colors ${step >= 1 ? "bg-[#137fec]" : "bg-[#283039]"}`} />
                    <div className={`h-1.5 w-12 rounded-full transition-colors ${step >= 2 ? "bg-[#137fec]" : "bg-[#283039]"}`} />
                </div>

                <div className={`transition-opacity duration-200 ${isAnimating ? "opacity-0" : "opacity-100"}`}>
                    {step === 1 ? (
                        <>
                            {/* Step 1: Role Selection */}
                            <div className="text-center mb-6">
                                <h2 className="text-xl font-bold text-white mb-2">What best describes your role?</h2>
                                <p className="text-[#9dabb9] text-sm">This helps us personalize your experience</p>
                            </div>

                            <div className="space-y-2">
                                {roles.map((role) => (
                                    <button
                                        key={role.id}
                                        onClick={() => handleRoleSelect(role.id)}
                                        className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                                            selectedRole === role.id
                                                ? "bg-[#137fec]/10 border-[#137fec]/50"
                                                : "bg-[#283039]/30 border-[#283039] hover:border-[#137fec]/30 hover:bg-[#283039]/50"
                                        }`}
                                    >
                                        <div className={`size-10 rounded-lg flex items-center justify-center ${
                                            selectedRole === role.id ? "bg-[#137fec]/20" : "bg-[#283039]"
                                        }`}>
                                            <span className={`material-symbols-outlined ${
                                                selectedRole === role.id ? "text-[#137fec]" : "text-[#9dabb9]"
                                            }`}>
                                                {role.icon}
                                            </span>
                                        </div>
                                        <div className="text-left">
                                            <h3 className="text-white font-medium">{role.label}</h3>
                                            <p className="text-[#9dabb9] text-xs">{role.description}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Step 2: Project Type Selection */}
                            <div className="text-center mb-6">
                                <h2 className="text-xl font-bold text-white mb-2">What are you building?</h2>
                                <p className="text-[#9dabb9] text-sm">We&apos;ll tailor templates and suggestions</p>
                            </div>

                            <div className="space-y-2">
                                {projectTypes.map((type) => (
                                    <button
                                        key={type.id}
                                        onClick={() => handleProjectTypeSelect(type.id)}
                                        className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                                            selectedProjectType === type.id
                                                ? "bg-[#137fec]/10 border-[#137fec]/50"
                                                : "bg-[#283039]/30 border-[#283039] hover:border-[#137fec]/30 hover:bg-[#283039]/50"
                                        }`}
                                    >
                                        <div className={`size-10 rounded-lg flex items-center justify-center ${
                                            selectedProjectType === type.id ? "bg-[#137fec]/20" : "bg-[#283039]"
                                        }`}>
                                            <span className={`material-symbols-outlined ${
                                                selectedProjectType === type.id ? "text-[#137fec]" : "text-[#9dabb9]"
                                            }`}>
                                                {type.icon}
                                            </span>
                                        </div>
                                        <div className="text-left">
                                            <h3 className="text-white font-medium">{type.label}</h3>
                                            <p className="text-[#9dabb9] text-xs">{type.description}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {/* Back button */}
                            <button
                                onClick={handleBack}
                                className="flex items-center gap-1 text-[#9dabb9] text-sm hover:text-white transition-colors mt-4"
                            >
                                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                                Back
                            </button>
                        </>
                    )}
                </div>

                {/* Skip button */}
                <div className="text-center mt-6 pt-4 border-t border-[#283039]">
                    <button
                        onClick={onSkip}
                        className="text-[#9dabb9] text-sm hover:text-white transition-colors"
                    >
                        Skip this step
                    </button>
                </div>
            </div>
        </div>
    )
}
