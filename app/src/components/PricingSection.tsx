"use client";

import Link from "next/link";

export default function PricingSection() {
    return (
        <section id="pricing" className="py-24 px-6 lg:px-20 bg-[#0d1117] border-t border-[#30363d] scroll-mt-20 overflow-hidden relative">
            {/* Background Decor */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#137fec]/10 blur-[130px] rounded-full pointer-events-none z-0"></div>

            <div className="layout-content-container max-w-[1024px] mx-auto flex flex-col gap-12 relative z-10">
                {/* Page Heading */}
                <div className="flex flex-col items-center text-center gap-6">
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#137fec]/30 bg-[#137fec]/10 px-4 py-1.5 w-fit shadow-[0_0_15px_rgba(19,127,236,0.3)] animate-subtle-pulse">
                        <span className="material-symbols-outlined text-[18px] text-[#137fec]">rocket_launch</span>
                        <span className="text-sm font-bold text-[#137fec] tracking-wide">LAUNCH SPECIAL</span>
                    </div>
                    <div className="flex flex-col gap-2">
                        <h2 className="text-white text-5xl md:text-6xl font-black leading-[1.1] tracking-[-0.033em]">
                            Go Ship <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#137fec] to-blue-300">Free.</span>
                        </h2>
                        <h3 className="text-[#9dabb9] text-xl font-medium">Limited Time Offer.</h3>
                    </div>
                    <p className="text-[#9dabb9] text-lg font-normal leading-relaxed max-w-2xl">
                        We&apos;re currently in open beta. That means <span className="text-white font-bold">everything</span> is unlocked for early adopters. Build your blueprints and ship your ideas without hitting a paywall.
                    </p>
                </div>

                {/* Single Hero Card */}
                <div className="relative group perspective-1000 mt-4">
                    {/* Floating Elements */}
                    <div className="hidden lg:block absolute -left-20 top-1/2 -translate-y-1/2 p-4 bg-[#1e2329] border border-[#30363d] rounded-2xl shadow-2xl rotate-[-12deg] z-0 animate-[float_6s_ease-in-out_infinite]">
                        <span className="material-symbols-outlined text-4xl text-[#137fec]">all_inclusive</span>
                    </div>
                    <div className="hidden lg:block absolute -right-20 top-1/2 -translate-y-1/2 p-4 bg-[#1e2329] border border-[#30363d] rounded-2xl shadow-2xl rotate-[12deg] z-0 animate-[float_6s_ease-in-out_infinite_2s]">
                        <span className="material-symbols-outlined text-4xl text-[#137fec]">unarchive</span>
                    </div>

                    {/* Main Card */}
                    <div className="relative z-10 bg-[#161b22]/60 backdrop-blur-xl border border-[#30363d] rounded-3xl p-8 md:p-12 shadow-2xl hover:border-[#137fec]/50 transition-all duration-500 hover:shadow-[0_0_50px_rgba(19,127,236,0.15)] flex flex-col md:flex-row gap-12 items-center">

                        {/* Left Side: Pricing & Value */}
                        <div className="flex-1 flex flex-col gap-6 text-center md:text-left items-center md:items-start">
                            <div className="flex flex-col gap-2">
                                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                                    Launch Edition
                                    <span className="px-2 py-0.5 rounded text-[10px] bg-[#137fec] text-white font-mono uppercase tracking-wider">Limited Time</span>
                                </h3>
                                <p className="text-[#9dabb9] text-base">The complete Flowro suite for builders.</p>
                            </div>

                            <div className="flex flex-col gap-1 items-center md:items-start">
                                <div className="flex items-baseline gap-3">
                                    <span className="text-6xl font-black text-white">$0</span>
                                    <span className="text-2xl font-bold text-[#637588] line-through decoration-2 decoration-red-500/50">$11.99</span>
                                </div>
                                <span className="text-[#137fec] text-sm font-semibold tracking-wide">FREE DURING BETA</span>
                            </div>

                            <Link
                                href="/auth"
                                className="w-full md:w-auto min-w-[200px] h-14 flex items-center justify-center gap-3 bg-[#137fec] hover:bg-[#137fec]/90 text-white text-lg font-bold rounded-xl transition-all shadow-[0_4px_20px_rgba(19,127,236,0.4)] hover:shadow-[0_6px_30px_rgba(19,127,236,0.5)] active:scale-95 group-hover:scale-105"
                            >
                                <span>Get Started</span>
                                <span className="material-symbols-outlined">arrow_forward</span>
                            </Link>
                            <p className="text-xs text-[#637588]">No credit card required. Cancel anytime.</p>
                        </div>

                        {/* Divider */}
                        <div className="w-full h-px md:w-px md:h-64 bg-gradient-to-r md:bg-gradient-to-b from-transparent via-[#30363d] to-transparent shrink-0"></div>

                        {/* Right Side: Features */}
                        <div className="flex-1 w-full">
                            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-6">
                                <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors">
                                    <div className="size-10 rounded-full bg-[#137fec]/10 flex items-center justify-center shrink-0 text-[#137fec]">
                                        <span className="material-symbols-outlined">dataset</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <h4 className="text-white font-bold text-sm">Unlimited Projects</h4>
                                        <p className="text-[#9dabb9] text-xs leading-relaxed">Create as many blueprints as you need.</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors">
                                    <div className="size-10 rounded-full bg-[#137fec]/10 flex items-center justify-center shrink-0 text-[#137fec]">
                                        <span className="material-symbols-outlined">auto_graph</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <h4 className="text-white font-bold text-sm">Visual Generators</h4>
                                        <p className="text-[#9dabb9] text-xs leading-relaxed">Auto-generate diagrams & flows.</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors">
                                    <div className="size-10 rounded-full bg-[#137fec]/10 flex items-center justify-center shrink-0 text-[#137fec]">
                                        <span className="material-symbols-outlined">code</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <h4 className="text-white font-bold text-sm">Code Exports</h4>
                                        <p className="text-[#9dabb9] text-xs leading-relaxed">Export to JSON/MD for LLMs.</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors">
                                    <div className="size-10 rounded-full bg-[#137fec]/10 flex items-center justify-center shrink-0 text-[#137fec]">
                                        <span className="material-symbols-outlined">bolt</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <h4 className="text-white font-bold text-sm">Priority Access</h4>
                                        <p className="text-[#9dabb9] text-xs leading-relaxed">Fastest generation speeds.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Trust/Social Proof */}
                <div className="flex flex-col items-center gap-4 mt-8 opacity-60">
                    <p className="text-xs font-mono uppercase tracking-widest text-[#637588]">Trusted by builders using</p>
                    <div className="flex gap-8 items-center grayscale hover:grayscale-0 transition-all duration-500">
                        <div className="group flex flex-col items-center gap-2">
                            <img src="/vscode.png" alt="VS Code" className="h-8 w-auto object-contain opacity-70 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="group flex flex-col items-center gap-2">
                            <img src="/CUBE_2D_DARK.png" alt="Cursor" className="h-8 w-auto object-contain opacity-70 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="group flex flex-col items-center gap-2">
                            <img src="/claude.svg" alt="Claude" className="h-8 w-auto object-contain opacity-70 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="group flex flex-col items-center gap-2">
                            <img src="/antigraviti-logo.png" alt="Antigravity" className="h-8 w-auto object-contain opacity-70 group-hover:opacity-100 transition-opacity" />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
