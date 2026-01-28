"use client"

import { useEffect, useRef } from "react"

interface TermsModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function TermsModal({ isOpen, onClose }: TermsModalProps) {
    const modalRef = useRef<HTMLDivElement>(null)

    // Handle ESC key to close modal
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                onClose()
            }
        }

        document.addEventListener("keydown", handleKeyDown)
        return () => document.removeEventListener("keydown", handleKeyDown)
    }, [isOpen, onClose])

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose()
        }
    }

    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md transition-all duration-300 px-4"
            onClick={handleBackdropClick}
        >
            <div
                ref={modalRef}
                className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl border border-[#283039] bg-[#0d1117] shadow-2xl flex flex-col animate-in fade-in zoom-in duration-300"
                role="dialog"
                aria-modal="true"
                aria-labelledby="terms-title"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#30363d] bg-[#161b22]/50">
                    <div className="flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-[#137fec]/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[#137fec] text-lg">description</span>
                        </div>
                        <h2 id="terms-title" className="text-xl font-bold text-white">
                            Terms and Conditions
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-2 text-[#9dabb9] transition-all hover:bg-white/10 hover:text-white"
                        aria-label="Close modal"
                    >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                    <div className="prose prose-invert max-w-none space-y-8">
                        <div>
                            <p className="text-[#9dabb9] font-medium text-sm mb-4">Effective Date: January 21, 2026</p>
                            <p className="text-[#d0d6dc] leading-relaxed">
                                These Terms and Conditions (&quot;Terms&quot;) are an agreement between you (&quot;you&quot; or &quot;Customer&quot;) and Flowro (&quot;we&quot;, &quot;us&quot;, or &quot;Flowro&quot;) regarding your use of the Flowro AI platform and related services (the &quot;Service&quot;).
                            </p>
                            <p className="text-[#d0d6dc] leading-relaxed mt-4 italic bg-[#137fec]/5 border-l-2 border-[#137fec] px-4 py-2">
                                By using the Service, you agree to these Terms. If you do not agree, do not use the Service.
                            </p>
                        </div>

                        <hr className="border-[#30363d]" />

                        <section className="space-y-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <span className="text-[#137fec] font-mono text-sm">01.</span> The Service
                            </h3>
                            <p className="text-[#9dabb9] text-sm leading-relaxed">
                                Flowro provides an AI-powered SaaS platform that helps users generate project plans, documentation, and related materials.
                                The Service is provided on a subscription basis and may change over time.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <span className="text-[#137fec] font-mono text-sm">02.</span> Accounts
                            </h3>
                            <div className="text-[#9dabb9] text-sm leading-relaxed space-y-2">
                                <p>You are responsible for:</p>
                                <ul className="list-disc pl-5 space-y-1 text-[#d0d6dc]">
                                    <li>Keeping your login details secure</li>
                                    <li>All activity that happens under your account</li>
                                    <li>Providing accurate and up-to-date information</li>
                                </ul>
                                <p className="mt-4">You must be legally able to use paid online services.</p>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <span className="text-[#137fec] font-mono text-sm">03.</span> Acceptable Use
                            </h3>
                            <div className="text-[#9dabb9] text-sm leading-relaxed space-y-2">
                                <p>You agree not to:</p>
                                <ul className="list-disc pl-5 space-y-1 text-[#d0d6dc]">
                                    <li>Use the Service for illegal activities</li>
                                    <li>Attempt to break, hack, or bypass security</li>
                                    <li>Abuse the system or rate limits</li>
                                    <li>Share or resell your account</li>
                                    <li>Use the Service in a way that harms other users or the Service</li>
                                </ul>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <span className="text-[#137fec] font-mono text-sm">04.</span> Subscriptions and Payments
                            </h3>
                            <ul className="list-disc pl-5 space-y-2 text-[#9dabb9] text-sm leading-relaxed">
                                <li>Some features require a paid subscription</li>
                                <li>Prices and plans are shown on the website</li>
                                <li>Payments are billed in advance on a recurring basis</li>
                                <li>Subscriptions automatically renew unless cancelled</li>
                                <li>You are responsible for any applicable taxes (including VAT if required)</li>
                            </ul>
                        </section>

                        <section className="space-y-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <span className="text-[#137fec] font-mono text-sm">05.</span> Cancellation and Refunds
                            </h3>
                            <ul className="list-disc pl-5 space-y-2 text-[#9dabb9] text-sm leading-relaxed">
                                <li>You may cancel at any time</li>
                                <li>Your subscription remains active until the end of the current billing period</li>
                                <li>Payments are non-refundable, except where required by law</li>
                            </ul>
                        </section>

                        <section className="space-y-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <span className="text-[#137fec] font-mono text-sm">06.</span> Service Availability
                            </h3>
                            <ul className="list-disc pl-5 space-y-2 text-[#9dabb9] text-sm leading-relaxed">
                                <li>We try to keep the Service available, but do not guarantee uninterrupted access</li>
                                <li>The Service may be temporarily unavailable for maintenance or technical reasons</li>
                            </ul>
                        </section>

                        <section className="space-y-4 bg-[#137fec]/5 p-4 rounded-lg border border-[#137fec]/20">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <span className="text-[#137fec] font-mono text-sm">07.</span> AI and Disclaimer
                            </h3>
                            <ul className="list-disc pl-5 space-y-2 text-[#9dabb9] text-sm leading-relaxed">
                                <li>All generated content is provided <strong className="text-white">&quot;as is&quot;</strong> and <strong className="text-white">&quot;as available&quot;</strong></li>
                                <li>We make <strong className="text-white">no guarantees</strong> regarding the accuracy, completeness, or reliability of any generated content</li>
                                <li>The Service does <strong className="text-white">not</strong> provide legal, financial, medical, or professional advice</li>
                                <li>You are solely responsible for reviewing, verifying, and deciding how to use any generated content</li>
                                <li>You use the generated content <strong className="text-white">at your own risk</strong></li>
                            </ul>
                        </section>

                        <section className="space-y-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <span className="text-[#137fec] font-mono text-sm">08.</span> Termination
                            </h3>
                            <div className="text-[#9dabb9] text-sm leading-relaxed space-y-2">
                                <p>We may suspend or terminate your access if:</p>
                                <ul className="list-disc pl-5 space-y-1 text-[#d0d6dc]">
                                    <li>You violate these Terms</li>
                                    <li>Your use causes risk or harm to the Service</li>
                                    <li>Required by law</li>
                                </ul>
                                <p className="mt-4">You may stop using the Service at any time.</p>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <span className="text-[#137fec] font-mono text-sm">09.</span> Limitation of Liability
                            </h3>
                            <p className="text-[#9dabb9] text-sm leading-relaxed">
                                To the maximum extent allowed by law:
                                <br />- We are not responsible for indirect or consequential damages
                                <br />- Our total liability is limited to the amount you paid in the last 3 months, or $100 USD, whichever is greater
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <span className="text-[#137fec] font-mono text-sm">10.</span> Changes to Terms
                            </h3>
                            <p className="text-[#9dabb9] text-sm leading-relaxed">
                                We may update these Terms from time to time.
                                <br />Continued use of the Service means you accept the updated Terms.
                            </p>
                        </section>

                        <section className="space-y-4 pb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <span className="text-[#137fec] font-mono text-sm">11.</span> Contact
                            </h3>
                            <p className="text-[#9dabb9] text-sm leading-relaxed">
                                If you have questions, contact us at:
                                <br /><a href="mailto:support@flowro.app" className="text-[#137fec] hover:underline">support@flowro.app</a>
                            </p>
                        </section>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-[#30363d] bg-[#161b22]/50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="bg-[#137fec] hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-bold transition-all shadow-lg shadow-blue-500/20"
                    >
                        Got it
                    </button>
                </div>
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #30363d;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #484f58;
                }
            `}</style>
        </div>
    )
}
