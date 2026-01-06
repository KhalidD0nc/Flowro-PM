"use client";

import { useState } from "react";
import Link from "next/link";

export default function PricingSection() {
    const [billingPeriod, setBillingPeriod] = useState<"Monthly" | "Yearly">("Monthly");

    const isYearly = billingPeriod === "Yearly";

    return (
        <section id="pricing" className="py-24 px-6 lg:px-20 bg-[#0d1117] border-t border-[#30363d] scroll-mt-20">
            <div className="layout-content-container max-w-[1024px] mx-auto flex flex-col gap-8">
                {/* Page Heading */}
                <div className="flex flex-col items-center text-center gap-4 py-8">
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#137fec]/30 bg-[#137fec]/10 px-3 py-1 w-fit">
                        <span className="material-symbols-outlined text-[14px] text-[#137fec]">payments</span>
                        <span className="text-xs font-bold text-[#137fec]">Pricing</span>
                    </div>
                    <h2 className="text-white text-4xl md:text-5xl font-black leading-tight tracking-[-0.033em]">
                        Simple, Transparent Pricing
                    </h2>
                    <p className="text-[#9dabb9] text-lg font-normal leading-normal max-w-2xl">
                        Transform product documents into Unified Blueprints (UBP). Choose the plan that fits your development workflow.
                    </p>
                </div>

                {/* Toggle Switch */}
                <div className="flex justify-center w-full">
                    <div className="flex h-12 items-center justify-center rounded-lg bg-[#161b22] border border-[#30363d] p-1">
                        <button
                            onClick={() => setBillingPeriod("Monthly")}
                            className={`group flex cursor-pointer h-full items-center justify-center overflow-hidden rounded-[4px] px-6 transition-all ${!isYearly ? "bg-[#0d1117] shadow-sm text-white" : "text-[#9dabb9] hover:text-white"
                                }`}
                        >
                            <span className="text-sm font-medium leading-normal">Monthly</span>
                        </button>
                        <button
                            onClick={() => setBillingPeriod("Yearly")}
                            className={`group flex cursor-pointer h-full items-center justify-center overflow-hidden rounded-[4px] px-6 transition-all ${isYearly ? "bg-[#0d1117] shadow-sm text-white" : "text-[#9dabb9] hover:text-white"
                                }`}
                        >
                            <span className="text-sm font-medium leading-normal">
                                Yearly <span className="text-[#137fec] text-xs ml-1">(Save 20%)</span>
                            </span>
                        </button>
                    </div>
                </div>

                {/* Pricing Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full pt-6">
                    {/* Free Plan */}
                    <div className="flex flex-1 flex-col gap-6 rounded-xl border border-solid border-[#30363d] bg-[#161b22] p-8 hover:border-gray-600 transition-colors">
                        <div className="flex flex-col gap-2">
                            <h3 className="text-white text-lg font-bold leading-tight">Free</h3>
                            <p className="text-[#9dabb9] text-sm">Perfect for hobbyists and trial projects.</p>
                            <div className="mt-4 flex items-baseline gap-1 text-white">
                                <span className="text-white text-5xl font-black leading-tight tracking-[-0.033em]">$0</span>
                                <span className="text-[#9dabb9] text-base font-medium leading-tight">/ month</span>
                            </div>
                        </div>
                        <Link
                            href="/auth"
                            className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-4 bg-[#30363d] hover:bg-[#2d455d] transition-colors text-white text-sm font-bold leading-normal tracking-[0.015em]"
                        >
                            <span className="truncate">Get Started for Free</span>
                        </Link>
                        <div className="flex flex-col gap-4 mt-2">
                            <p className="text-xs font-bold uppercase tracking-wider text-[#9dabb9]">What&apos;s included</p>
                            <div className="flex items-start gap-3 text-white">
                                <span className="material-symbols-outlined text-[#9dabb9] text-[20px]">check</span>
                                <span className="text-[15px] font-normal leading-tight">3 UBPs / month</span>
                            </div>
                            <div className="flex items-start gap-3 text-white">
                                <span className="material-symbols-outlined text-[#9dabb9] text-[20px]">check</span>
                                <span className="text-[15px] font-normal leading-tight">Basic Document Parsing</span>
                            </div>
                            <div className="flex items-start gap-3 text-white">
                                <span className="material-symbols-outlined text-[#9dabb9] text-[20px]">check</span>
                                <span className="text-[15px] font-normal leading-tight">Standard Export Options</span>
                            </div>
                            <div className="flex items-start gap-3 text-white">
                                <span className="material-symbols-outlined text-[#9dabb9] text-[20px]">check</span>
                                <span className="text-[15px] font-normal leading-tight">Community Support</span>
                            </div>
                        </div>
                    </div>

                    {/* Pro Plan */}
                    <div className="relative flex flex-1 flex-col gap-6 rounded-xl border-2 border-solid border-[#137fec] bg-[#161b22] p-8 shadow-[0_0_40px_rgba(19,127,236,0.1)]">
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#137fec] text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                            Most Popular
                        </div>
                        <div className="flex flex-col gap-2">
                            <h3 className="text-white text-lg font-bold leading-tight flex items-center justify-between">
                                Pro
                                <span className="material-symbols-outlined text-[#137fec] icon-filled">verified</span>
                            </h3>
                            <p className="text-[#9dabb9] text-sm">For developers shipping complex features.</p>
                            <div className="mt-4 flex items-baseline gap-1 text-white">
                                <span className="text-white text-5xl font-black leading-tight tracking-[-0.033em]">
                                    {isYearly ? "$24" : "$29"}
                                </span>
                                <span className="text-[#9dabb9] text-base font-medium leading-tight">/ month</span>
                            </div>
                            {isYearly && (
                                <p className="text-[#137fec] text-sm font-semibold">Billed $288 yearly</p>
                            )}
                        </div>
                        <Link
                            href="/auth"
                            className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-4 bg-[#137fec] hover:bg-blue-600 transition-colors text-white text-sm font-bold leading-normal tracking-[0.015em]"
                        >
                            <span className="truncate">Upgrade to Pro</span>
                        </Link>
                        <div className="flex flex-col gap-4 mt-2">
                            <p className="text-xs font-bold uppercase tracking-wider text-[#137fec]">Everything in Free, plus:</p>
                            <div className="flex items-start gap-3 text-white">
                                <span className="material-symbols-outlined text-[#137fec] text-[20px]">check_circle</span>
                                <span className="text-[15px] font-normal leading-tight">Unlimited UBPs</span>
                            </div>
                            <div className="flex items-start gap-3 text-white">
                                <span className="material-symbols-outlined text-[#137fec] text-[20px]">check_circle</span>
                                <span className="text-[15px] font-normal leading-tight">Advanced Logic Conversion</span>
                            </div>
                            <div className="flex items-start gap-3 text-white">
                                <span className="material-symbols-outlined text-[#137fec] text-[20px]">check_circle</span>
                                <span className="text-[15px] font-normal leading-tight">Priority Support</span>
                            </div>
                            <div className="flex items-start gap-3 text-white">
                                <span className="material-symbols-outlined text-[#137fec] text-[20px]">check_circle</span>
                                <span className="text-[15px] font-normal leading-tight">API Access</span>
                            </div>
                            <div className="flex items-start gap-3 text-white">
                                <span className="material-symbols-outlined text-[#137fec] text-[20px]">check_circle</span>
                                <span className="text-[15px] font-normal leading-tight">Team Collaboration Tools</span>
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
                            <h4 className="text-white font-semibold text-lg">What is a Unified Blueprint (UBP)?</h4>
                            <p className="text-[#9dabb9] text-sm leading-relaxed">
                                A UBP is a standardized technical specification generated from your product requirements documents (PRDs), specifically formatted for engineering handoff.
                            </p>
                        </div>
                        <div className="flex flex-col gap-2">
                            <h4 className="text-white font-semibold text-lg">Can I cancel anytime?</h4>
                            <p className="text-[#9dabb9] text-sm leading-relaxed">
                                Yes, you can cancel your subscription at any time. Your access will continue until the end of your current billing period.
                            </p>
                        </div>
                        <div className="flex flex-col gap-2">
                            <h4 className="text-white font-semibold text-lg">How does the &quot;Unlimited&quot; plan work?</h4>
                            <p className="text-[#9dabb9] text-sm leading-relaxed">
                                The Pro plan allows you to generate as many blueprints as you need without a hard cap, subject to our fair use policy for API calls.
                            </p>
                        </div>
                        <div className="flex flex-col gap-2">
                            <h4 className="text-white font-semibold text-lg">Do you offer enterprise plans?</h4>
                            <p className="text-[#9dabb9] text-sm leading-relaxed">
                                Yes! For organizations needing SSO, dedicated support, or custom integrations, please contact our sales team for a custom quote.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
