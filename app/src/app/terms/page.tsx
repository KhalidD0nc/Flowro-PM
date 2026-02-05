import { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
    title: "Terms & Conditions | Flowro AI",
    description: "Read the Terms and Conditions for using Flowro AI platform.",
}

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-[#101922] text-white">
            {/* Header */}
            <header className="border-b border-slate-700/50 bg-[#101922]/80 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-6 py-4">
                    <Link href="/" className="flex items-center gap-2 w-fit">
                        <img src="/logo.svg" alt="Flowro Logo" className="size-7" />
                        <span className="text-lg font-bold tracking-tight text-white">Flowro AI</span>
                    </Link>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-6 py-12">
                <h1 className="text-3xl md:text-4xl font-bold mb-2">Terms & Conditions</h1>
                <p className="text-slate-400 mb-8">Effective Date: January 21, 2026</p>

                <div className="prose prose-invert prose-slate max-w-none">
                    <p className="text-slate-300 leading-relaxed">
                        These Terms and Conditions (&quot;Terms&quot;) are an agreement between you (&quot;you&quot; or &quot;Customer&quot;)
                        and Flowro (&quot;we&quot;, &quot;us&quot;, or &quot;Flowro&quot;) regarding your use of the Flowro AI platform
                        and related services (the &quot;Service&quot;).
                    </p>
                    <p className="text-slate-300 leading-relaxed mb-8">
                        By using the Service, you agree to these Terms. If you do not agree, do not use the Service.
                    </p>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">1. The Service</h2>
                        <p className="text-slate-300 leading-relaxed">
                            Flowro provides an AI-powered SaaS platform that helps users generate project plans,
                            documentation, and related materials. The Service is provided on a subscription basis
                            and may change over time.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">2. Accounts</h2>
                        <p className="text-slate-300 leading-relaxed mb-3">You are responsible for:</p>
                        <ul className="list-disc list-inside text-slate-300 space-y-2">
                            <li>Keeping your login details secure</li>
                            <li>All activity that happens under your account</li>
                            <li>Providing accurate and up-to-date information</li>
                        </ul>
                        <p className="text-slate-300 leading-relaxed mt-3">
                            You must be legally able to use paid online services.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">3. Acceptable Use</h2>
                        <p className="text-slate-300 leading-relaxed mb-3">You agree not to:</p>
                        <ul className="list-disc list-inside text-slate-300 space-y-2">
                            <li>Use the Service for illegal activities</li>
                            <li>Attempt to break, hack, or bypass security</li>
                            <li>Abuse the system or rate limits</li>
                            <li>Share or resell your account</li>
                            <li>Use the Service in a way that harms other users or the Service</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">4. Subscriptions and Payments</h2>
                        <ul className="list-disc list-inside text-slate-300 space-y-2">
                            <li>Some features require a paid subscription</li>
                            <li>Prices and plans are shown on the website</li>
                            <li>Payments are billed in advance on a recurring basis</li>
                            <li>Subscriptions automatically renew unless cancelled</li>
                            <li>You are responsible for any applicable taxes (including VAT if required)</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">5. Cancellation and Refunds</h2>
                        <ul className="list-disc list-inside text-slate-300 space-y-2">
                            <li>You may cancel at any time</li>
                            <li>Your subscription remains active until the end of the current billing period</li>
                            <li>Payments are non-refundable, except where required by law</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">6. Service Availability</h2>
                        <ul className="list-disc list-inside text-slate-300 space-y-2">
                            <li>We try to keep the Service available, but do not guarantee uninterrupted access</li>
                            <li>The Service may be temporarily unavailable for maintenance or technical reasons</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">7. AI and Disclaimer</h2>
                        <ul className="list-disc list-inside text-slate-300 space-y-2">
                            <li>All generated content is provided <strong>&quot;as is&quot;</strong> and <strong>&quot;as available&quot;</strong></li>
                            <li>We make <strong>no guarantees</strong> regarding the accuracy, completeness, or reliability of any generated content</li>
                            <li>The Service does <strong>not</strong> provide legal, financial, medical, or professional advice</li>
                            <li>You are solely responsible for reviewing, verifying, and deciding how to use any generated content</li>
                            <li>You use the generated content <strong>at your own risk</strong></li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">8. Termination</h2>
                        <p className="text-slate-300 leading-relaxed mb-3">We may suspend or terminate your access if:</p>
                        <ul className="list-disc list-inside text-slate-300 space-y-2">
                            <li>You violate these Terms</li>
                            <li>Your use causes risk or harm to the Service</li>
                            <li>Required by law</li>
                        </ul>
                        <p className="text-slate-300 leading-relaxed mt-3">
                            You may stop using the Service at any time.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">9. Limitation of Liability</h2>
                        <p className="text-slate-300 leading-relaxed mb-3">To the maximum extent allowed by law:</p>
                        <ul className="list-disc list-inside text-slate-300 space-y-2">
                            <li>We are not responsible for indirect or consequential damages</li>
                            <li>Our total liability is limited to the amount you paid in the last 3 months, or $100 USD, whichever is greater</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">10. Changes to Terms</h2>
                        <p className="text-slate-300 leading-relaxed">
                            We may update these Terms from time to time. Continued use of the Service means
                            you accept the updated Terms.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">11. Contact</h2>
                        <p className="text-slate-300 leading-relaxed">
                            If you have questions, contact us at:{" "}
                            <a href="mailto:support@flowro.app" className="text-[#137fec] hover:underline">
                                support@flowro.app
                            </a>
                        </p>
                    </section>
                </div>

                {/* Footer Links */}
                <div className="mt-12 pt-8 border-t border-slate-700/50 flex flex-wrap gap-4 text-sm text-slate-400">
                    <Link href="/privacy" className="hover:text-[#137fec] transition-colors">Privacy Policy</Link>
                    <span>•</span>
                    <Link href="/" className="hover:text-[#137fec] transition-colors">Back to Home</Link>
                </div>
            </main>
        </div>
    )
}
