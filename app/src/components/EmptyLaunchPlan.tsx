"use client"


interface EmptyLaunchPlanProps {
    onGenerate: () => void
    isGenerating: boolean
}

export default function EmptyLaunchPlan({ onGenerate, isGenerating }: EmptyLaunchPlanProps) {
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center h-full min-h-[400px]">
            <div className="relative mb-6 group">
                {/* Background glow */}
                <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full opacity-50 group-hover:opacity-75 transition-opacity duration-700" />

                {/* Icon circle */}
                <div className="relative size-20 bg-[#101922] border border-[#283039] rounded-2xl flex items-center justify-center shadow-2xl">
                    <span className="material-symbols-outlined text-[#137fec] text-4xl group-hover:scale-110 transition-transform duration-300">
                        rocket_launch
                    </span>
                </div>
            </div>

            <h2 className="text-2xl font-bold text-white mb-3">
                Ready to Launch?
            </h2>

            <p className="text-[#9dabb9] max-w-md mb-8 text-base leading-relaxed">
                Turn your blueprint into an actionable launch plan. Flowro will analyze every phase, feature, and dependency to create your perfect roadmap.
            </p>

            <button
                onClick={onGenerate}
                disabled={isGenerating}
                className="group relative flex items-center gap-3 bg-[#137fec] hover:bg-blue-600 disabled:bg-[#137fec]/50 text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/25 active:scale-95 disabled:cursor-not-allowed"
            >
                {isGenerating ? (
                    <>
                        <span className="material-symbols-outlined animate-spin text-[20px]">
                            smart_toy
                        </span>
                        <span>Crafting Your Plan...</span>
                    </>
                ) : (
                    <>
                        <span className="material-symbols-outlined text-[20px]">
                            auto_awesome
                        </span>
                        <span>Make it with Flowro</span>
                        <span className="material-symbols-outlined text-[18px] opacity-70 group-hover:translate-x-1 transition-transform">
                            arrow_forward
                        </span>
                    </>
                )}

                {/* Shine effect */}
                {!isGenerating && (
                    <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shine" />
                    </div>
                )}
            </button>
        </div>
    )
}
