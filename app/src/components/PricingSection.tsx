"use client";

import Link from "next/link";

export default function PricingSection() {
    return (
        <section id="pricing" className="py-24 px-6 lg:px-20 bg-[#0d1117] border-t border-[#30363d] scroll-mt-20">
            <div className="layout-content-container max-w-[1024px] mx-auto flex flex-col gap-8">
                {/* Page Heading */}
                <div className="flex flex-col items-center text-center gap-4 py-8">
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#137fec]/30 bg-[#137fec]/10 px-3 py-1 w-fit">
                        <span className="material-symbols-outlined text-[14px] text-[#137fec]">payments</span>
                        <span className="text-xs font-bold text-[#137fec]">Beta Pricing</span>
                    </div>
                    <h2 className="text-white text-4xl md:text-5xl font-black leading-tight tracking-[-0.033em]">
                        Ship faster. Document less.
                    </h2>
                    <p className="text-[#9dabb9] text-lg font-normal leading-normal max-w-2xl">
                        Describe your idea. Get a structured spec in 60 seconds. Ready for Cursor, Claude, or your dev team.
                    </p>
                </div>

                {/* Pricing Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full pt-6">
                    {/* Free Plan */}
                    <div className="flex flex-1 flex-col gap-6 rounded-xl border border-solid border-[#30363d] bg-[#161b22] p-8 hover:border-gray-600 transition-colors">
                        <div className="flex flex-col gap-2">
                            <h3 className="text-white text-lg font-bold leading-tight">Free</h3>
                            <p className="text-[#9dabb9] text-sm">Try it out. No credit card needed.</p>
                            <div className="mt-4 flex items-baseline gap-1 text-white">
                                <span className="text-white text-5xl font-black leading-tight tracking-[-0.033em]">$0</span>
                            </div>
                        </div>
                        <Link
                            href="/auth"
                            className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-4 bg-[#30363d] hover:bg-[#2d455d] transition-colors text-white text-sm font-bold leading-normal tracking-[0.015em]"
                        >
                            <span className="truncate">Start Free</span>
                        </Link>
                        <div className="flex flex-col gap-4 mt-2">
                            <div className="flex items-start gap-3 text-white">
                                <span className="material-symbols-outlined text-[#9dabb9] text-[20px]">check</span>
                                <span className="text-[15px] font-normal leading-tight">1 project</span>
                            </div>
                            <div className="flex items-start gap-3 text-white">
                                <span className="material-symbols-outlined text-[#9dabb9] text-[20px]">check</span>
                                <span className="text-[15px] font-normal leading-tight">Basic UBP generation</span>
                            </div>
                            <div className="flex items-start gap-3 text-white">
                                <span className="material-symbols-outlined text-[#9dabb9] text-[20px]">check</span>
                                <span className="text-[15px] font-normal leading-tight">Copy to clipboard export</span>
                            </div>
                        </div>
                    </div>

                    {/* Pro Plan */}
                    <div className="relative flex flex-1 flex-col gap-6 rounded-xl border-2 border-solid border-[#137fec] bg-[#161b22] p-8 shadow-[0_0_40px_rgba(19,127,236,0.1)]">
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#137fec] text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                            BETA DEAL
                        </div>
                        <div className="flex flex-col gap-2">
                            <h3 className="text-white text-lg font-bold leading-tight flex items-center justify-between">
                                Pro
                                <span className="material-symbols-outlined text-[#137fec] icon-filled">verified</span>
                            </h3>
                            <p className="text-[#9dabb9] text-sm">For builders who ship fast.</p>
                            <div className="mt-4 flex flex-col gap-1">
                                <div className="flex items-baseline gap-1 text-white">
                                    <span className="text-white text-5xl font-black leading-tight tracking-[-0.033em]">$9</span>
                                    <span className="text-[#9dabb9] text-base font-medium leading-tight">/ month</span>
                                </div>
                                <p className="text-[#137fec] text-sm font-semibold">Lock in beta price forever</p>
                            </div>
                        </div>
                        <Link
                            href="/auth"
                            className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-4 bg-[#137fec] hover:bg-blue-600 transition-colors text-white text-sm font-bold leading-normal tracking-[0.015em]"
                        >
                            <span className="truncate">Get Pro Access</span>
                        </Link>
                        <div className="flex flex-col gap-4 mt-2">
                            <div className="flex items-start gap-3 text-white">
                                <span className="material-symbols-outlined text-[#137fec] text-[20px]">check_circle</span>
                                <span className="text-[15px] font-normal leading-tight">Unlimited projects</span>
                            </div>
                            <div className="flex items-start gap-3 text-white">
                                <span className="material-symbols-outlined text-[#137fec] text-[20px]">check_circle</span>
                                <span className="text-[15px] font-normal leading-tight">Full UBP with diagrams</span>
                            </div>
                            <div className="flex items-start gap-3 text-white">
                                <span className="material-symbols-outlined text-[#137fec] text-[20px]">check_circle</span>
                                <span className="text-[15px] font-normal leading-tight">Markdown & JSON export</span>
                            </div>
                            <div className="flex items-start gap-3 text-white">
                                <span className="material-symbols-outlined text-[#137fec] text-[20px]">check_circle</span>
                                <span className="text-[15px] font-normal leading-tight">Version history</span>
                            </div>
                            <div className="flex items-start gap-3 text-white">
                                <span className="material-symbols-outlined text-[#137fec] text-[20px]">check_circle</span>
                                <span className="text-[15px] font-normal leading-tight">Priority LLM (faster)</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* FAQ Section */}
                <div className="flex flex-col w-full max-w-[800px] mx-auto mt-12 gap-6">
                    <h2 className="text-white text-2xl font-bold leading-tight tracking-[-0.015em] pb-4 border-b border-[#30363d]">
                        Frequently Asked Questions
                    </h2>
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="flex flex-col gap-2">
                            <h4 className="text-white font-semibold text-lg">What is a Unified Blueprint?</h4>
                            <p className="text-[#9dabb9] text-sm leading-relaxed">
                                A UBP is a structured spec document that AI coding tools (like Cursor or Claude) can understand and execute. It turns your messy idea into clear requirements.
                            </p>
                        </div>
                        <div className="flex flex-col gap-2">
                            <h4 className="text-white font-semibold text-lg">How fast is generation?</h4>
                            <p className="text-[#9dabb9] text-sm leading-relaxed">
                                Most blueprints generate in under 60 seconds. Pro users get priority access to faster models.
                            </p>
                        </div>
                        <div className="flex flex-col gap-2">
                            <h4 className="text-white font-semibold text-lg">Can I cancel anytime?</h4>
                            <p className="text-[#9dabb9] text-sm leading-relaxed">
                                Yes. Cancel anytime, no questions asked. You keep access until the end of your billing period.
                            </p>
                        </div>
                        <div className="flex flex-col gap-2">
                            <h4 className="text-white font-semibold text-lg">What export formats work?</h4>
                            <p className="text-[#9dabb9] text-sm leading-relaxed">
                                Currently: Markdown and JSON. Both work great with Cursor, Claude, and other AI coding tools.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Bottom Note */}
                <div className="text-center text-[#9dabb9] text-sm mt-4">
                    Questions? <a href="mailto:support@flowro.app" className="text-[#137fec] hover:underline">support@flowro.app</a>
                </div>
            </div>
        </section>
    );
}
