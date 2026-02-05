"use client"

import { useState } from "react"

interface WelcomeModalProps {
    isOpen: boolean
    userName?: string
    onGetStarted: () => void
    onSkip: () => void
}

export default function WelcomeModal({ isOpen, userName, onGetStarted, onSkip }: WelcomeModalProps) {
    const [isAnimating, setIsAnimating] = useState(false)

    if (!isOpen) return null

    const handleGetStarted = () => {
        setIsAnimating(true)
        setTimeout(onGetStarted, 200)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div
                className={`relative w-full max-w-lg mx-4 rounded-2xl border border-[#283039] bg-[#18212b]/95 p-8 shadow-2xl shadow-black/40 transform transition-all duration-300 ${isAnimating ? "scale-95 opacity-0" : "scale-100 opacity-100"
                    }`}
            >
                {/* Logo and celebration */}
                <div className="flex flex-col items-center text-center">
                    <div className="relative mb-6">
                        {/* Glow effect */}
                        <div className="absolute inset-0 bg-[#137fec]/20 rounded-full blur-xl" />
                        <div className="relative size-20 rounded-full bg-gradient-to-br from-[#137fec] to-blue-600 flex items-center justify-center shadow-lg shadow-[#137fec]/30">
                            <img src="/logo.svg" alt="Flowro Logo" className="size-12 brightness-0 invert" />
                        </div>
                    </div>

                    {/* Welcome text */}
                    <h1 className="text-2xl font-bold text-white mb-2">
                        Welcome to Flowro{userName ? `, ${userName}` : ""}!
                    </h1>
                    <p className="text-[#9dabb9] text-base mb-6 max-w-sm">
                        You&apos;re about to transform your ideas into structured, agent-ready blueprints.
                    </p>

                    {/* Features preview */}
                    <div className="w-full space-y-3 mb-8">
                        <FeatureItem
                            icon="auto_awesome"
                            title="AI-Powered Generation"
                            description="Chat naturally to create comprehensive specs"
                        />
                        <FeatureItem
                            icon="schema"
                            title="Unified Blueprint Format"
                            description="9-section structure optimized for AI agents"
                        />
                        <FeatureItem
                            icon="share"
                            title="Export & Share"
                            description="Download or share with your team instantly"
                        />
                    </div>

                    {/* CTA Buttons */}
                    <div className="flex flex-col gap-3 w-full">
                        <button
                            onClick={handleGetStarted}
                            className="flex items-center justify-center gap-2 h-12 px-6 rounded-lg bg-[#137fec] text-white font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-[#137fec]/20"
                        >
                            <span>Get Started</span>
                            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                        </button>
                        <button
                            onClick={onSkip}
                            className="text-[#9dabb9] text-sm hover:text-white transition-colors py-2"
                        >
                            Skip for now
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

function FeatureItem({ icon, title, description }: { icon: string; title: string; description: string }) {
    return (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-[#283039]/30 border border-[#283039] text-left">
            <div className="flex-shrink-0 size-8 rounded-lg bg-[#137fec]/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#137fec] text-lg">{icon}</span>
            </div>
            <div>
                <h3 className="text-white text-sm font-medium">{title}</h3>
                <p className="text-[#9dabb9] text-xs">{description}</p>
            </div>
        </div>
    )
}
