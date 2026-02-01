import { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
    title: "Privacy Policy | Flowro AI",
    description: "Learn how Flowro AI collects, uses, and protects your personal information.",
}

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-[#101922] text-white">
            {/* Header */}
            <header className="border-b border-slate-700/50 bg-[#101922]/80 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-6 py-4">
                    <Link href="/" className="flex items-center gap-2 w-fit">
                        <span className="material-symbols-outlined text-[#137fec]" style={{ fontSize: '28px' }}>hourglass_top</span>
                        <span className="text-lg font-bold tracking-tight text-white">Flowro AI</span>
                    </Link>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-6 py-12">
                <h1 className="text-3xl md:text-4xl font-bold mb-2">Privacy Policy</h1>
                <p className="text-slate-400 mb-8">Effective Date: January 21, 2026</p>

                <div className="prose prose-invert prose-slate max-w-none">
                    <p className="text-slate-300 leading-relaxed mb-8">
                        At Flowro (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), we are committed to protecting your privacy.
                        This Privacy Policy explains how we collect, use, disclose, and safeguard your information
                        when you use our AI-powered project planning platform (the &quot;Service&quot;).
                    </p>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">1. Information We Collect</h2>

                        <h3 className="text-lg font-medium text-white mb-3">1.1 Information You Provide</h3>
                        <ul className="list-disc list-inside text-slate-300 space-y-2 mb-4">
                            <li><strong>Account Information:</strong> Name, email address, and profile information when you create an account</li>
                            <li><strong>Project Data:</strong> Project descriptions, blueprints, and other content you create using the Service</li>
                            <li><strong>Payment Information:</strong> Billing details processed securely through our payment provider (Stripe)</li>
                            <li><strong>Communications:</strong> Messages you send to us for support or feedback</li>
                        </ul>

                        <h3 className="text-lg font-medium text-white mb-3">1.2 Information Collected Automatically</h3>
                        <ul className="list-disc list-inside text-slate-300 space-y-2">
                            <li><strong>Usage Data:</strong> How you interact with the Service, features used, and time spent</li>
                            <li><strong>Device Information:</strong> Browser type, operating system, and device identifiers</li>
                            <li><strong>Log Data:</strong> IP address, access times, and pages viewed</li>
                            <li><strong>Cookies:</strong> Small files stored on your device to improve your experience</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">2. How We Use Your Information</h2>
                        <p className="text-slate-300 leading-relaxed mb-3">We use the collected information to:</p>
                        <ul className="list-disc list-inside text-slate-300 space-y-2">
                            <li>Provide, maintain, and improve the Service</li>
                            <li>Process your transactions and send related information</li>
                            <li>Send you technical notices, updates, and support messages</li>
                            <li>Respond to your comments, questions, and requests</li>
                            <li>Analyze usage patterns to enhance user experience</li>
                            <li>Detect, prevent, and address technical issues and fraud</li>
                            <li>Comply with legal obligations</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">3. AI and Your Data</h2>
                        <ul className="list-disc list-inside text-slate-300 space-y-2">
                            <li>Your project data is sent to AI services (Google Gemini) to generate blueprints</li>
                            <li>We do not use your project data to train AI models</li>
                            <li>AI-generated content belongs to you</li>
                            <li>You can delete your data at any time through your account settings</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">4. Information Sharing</h2>
                        <p className="text-slate-300 leading-relaxed mb-3">We may share your information with:</p>
                        <ul className="list-disc list-inside text-slate-300 space-y-2">
                            <li><strong>Service Providers:</strong> Third parties that help us operate the Service (hosting, payment processing, analytics)</li>
                            <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                            <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
                            <li><strong>With Your Consent:</strong> When you explicitly agree to share information</li>
                        </ul>
                        <p className="text-slate-300 leading-relaxed mt-3">
                            We do not sell your personal information to third parties.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">5. Data Security</h2>
                        <p className="text-slate-300 leading-relaxed mb-3">We implement appropriate security measures including:</p>
                        <ul className="list-disc list-inside text-slate-300 space-y-2">
                            <li>Encryption of data in transit (SSL/TLS) and at rest</li>
                            <li>Secure authentication through Firebase</li>
                            <li>Regular security audits and monitoring</li>
                            <li>Access controls and employee training</li>
                        </ul>
                        <p className="text-slate-300 leading-relaxed mt-3">
                            However, no method of transmission over the Internet is 100% secure.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">6. Data Retention</h2>
                        <p className="text-slate-300 leading-relaxed">
                            We retain your information for as long as your account is active or as needed to provide
                            the Service. You can request deletion of your data at any time. Some information may be
                            retained for legal or legitimate business purposes.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">7. Your Rights</h2>
                        <p className="text-slate-300 leading-relaxed mb-3">Depending on your location, you may have the right to:</p>
                        <ul className="list-disc list-inside text-slate-300 space-y-2">
                            <li>Access the personal information we hold about you</li>
                            <li>Correct inaccurate or incomplete information</li>
                            <li>Delete your personal information</li>
                            <li>Export your data in a portable format</li>
                            <li>Opt out of marketing communications</li>
                            <li>Withdraw consent where applicable</li>
                        </ul>
                        <p className="text-slate-300 leading-relaxed mt-3">
                            To exercise these rights, contact us at{" "}
                            <a href="mailto:privacy@flowro.app" className="text-[#137fec] hover:underline">
                                privacy@flowro.app
                            </a>
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">8. Cookies and Tracking</h2>
                        <p className="text-slate-300 leading-relaxed mb-3">We use cookies and similar technologies to:</p>
                        <ul className="list-disc list-inside text-slate-300 space-y-2">
                            <li>Keep you signed in</li>
                            <li>Remember your preferences</li>
                            <li>Understand how you use the Service</li>
                            <li>Improve our Service</li>
                        </ul>
                        <p className="text-slate-300 leading-relaxed mt-3">
                            You can control cookies through your browser settings.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">9. International Transfers</h2>
                        <p className="text-slate-300 leading-relaxed">
                            Your information may be transferred to and processed in countries other than your own.
                            We take appropriate safeguards to ensure your data remains protected in accordance with
                            this Privacy Policy.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">10. Children&apos;s Privacy</h2>
                        <p className="text-slate-300 leading-relaxed">
                            The Service is not directed to children under 13. We do not knowingly collect personal
                            information from children under 13. If you believe we have collected such information,
                            please contact us immediately.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">11. Changes to This Policy</h2>
                        <p className="text-slate-300 leading-relaxed">
                            We may update this Privacy Policy from time to time. We will notify you of any changes
                            by posting the new policy on this page and updating the &quot;Effective Date.&quot; Continued
                            use of the Service after changes constitutes acceptance of the updated policy.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">12. Contact Us</h2>
                        <p className="text-slate-300 leading-relaxed">
                            If you have questions about this Privacy Policy or our practices, contact us at:{" "}
                            <a href="mailto:privacy@flowro.app" className="text-[#137fec] hover:underline">
                                privacy@flowro.app
                            </a>
                        </p>
                    </section>
                </div>

                {/* Footer Links */}
                <div className="mt-12 pt-8 border-t border-slate-700/50 flex flex-wrap gap-4 text-sm text-slate-400">
                    <Link href="/terms" className="hover:text-[#137fec] transition-colors">Terms & Conditions</Link>
                    <span>•</span>
                    <Link href="/" className="hover:text-[#137fec] transition-colors">Back to Home</Link>
                </div>
            </main>
        </div>
    )
}
