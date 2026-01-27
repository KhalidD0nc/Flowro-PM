import { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
    title: "Demo",
    description: "Try Flowro AI with a sample project blueprint. No sign-up required.",
    robots: {
        index: true,
        follow: true,
    },
}

// Sample project ID for demo (hardcoded example)
const DEMO_PROJECT_ID = "demo-saas-startup"

export default function DemoLandingPage() {
    return (
        <div className="min-h-screen bg-[#101922] flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 flex items-center justify-between border-b border-[#30363d] bg-[#0D1117]/80 backdrop-blur-md px-6 py-3">
                <Link href="/" className="flex items-center gap-3 text-white cursor-pointer">
                    <span className="material-symbols-outlined text-[#137fec] text-3xl">hourglass_top</span>
                    <h2 className="text-lg font-bold leading-tight tracking-[-0.015em]">Flowro AI</h2>
                </Link>
                <Link
                    href="/auth"
                    className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 px-4 bg-[#137fec] text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-[#137fec]/90 transition-all"
                >
                    Sign Up Free
                </Link>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
                <div className="max-w-2xl mx-auto text-center">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#137fec]/30 bg-[#137fec]/10 px-4 py-1.5 mb-6">
                        <span className="material-symbols-outlined text-[14px] text-[#137fec]">science</span>
                        <span className="text-sm font-bold text-[#137fec]">Interactive Demo</span>
                    </div>

                    <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
                        See Flowro in Action
                    </h1>
                    <p className="text-[#9dabb9] text-lg mb-8 max-w-xl mx-auto">
                        Explore a sample Unified Blueprint without creating an account.
                        See how Flowro transforms ideas into structured, agent-ready specs.
                    </p>

                    {/* Demo Options */}
                    <div className="grid md:grid-cols-2 gap-4 mb-12">
                        <DemoCard
                            icon="rocket_launch"
                            title="SaaS Startup"
                            description="A complete blueprint for a subscription-based project management tool"
                            href={`/demo/${DEMO_PROJECT_ID}`}
                            featured
                        />
                        <DemoCard
                            icon="smartphone"
                            title="Mobile App"
                            description="Blueprint for a fitness tracking mobile application"
                            href="/demo/demo-mobile-app"
                        />
                    </div>

                    {/* Features highlight */}
                    <div className="bg-[#18212b]/50 border border-[#283039] rounded-xl p-6 mb-8">
                        <h3 className="text-white font-bold mb-4">What you&apos;ll see in the demo:</h3>
                        <div className="grid sm:grid-cols-3 gap-4 text-left">
                            <div className="flex items-start gap-3">
                                <span className="material-symbols-outlined text-[#137fec]">schema</span>
                                <div>
                                    <p className="text-white text-sm font-medium">9-Section UBP</p>
                                    <p className="text-[#9dabb9] text-xs">Full blueprint structure</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="material-symbols-outlined text-[#137fec]">download</span>
                                <div>
                                    <p className="text-white text-sm font-medium">Export Preview</p>
                                    <p className="text-[#9dabb9] text-xs">JSON & Markdown formats</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="material-symbols-outlined text-[#137fec]">auto_graph</span>
                                <div>
                                    <p className="text-white text-sm font-medium">Visual Diagrams</p>
                                    <p className="text-[#9dabb9] text-xs">Mermaid sequence diagrams</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CTA */}
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link
                            href="/auth"
                            className="flex items-center justify-center gap-2 h-12 px-8 rounded-lg bg-[#137fec] text-white font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-[#137fec]/20"
                        >
                            <span className="material-symbols-outlined text-[20px]">bolt</span>
                            Start Building for Free
                        </Link>
                    </div>
                    <p className="text-[#9dabb9] text-sm mt-4">
                        No credit card required. Create up to 1 project free.
                    </p>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-[#30363d] py-6 px-6 text-center">
                <p className="text-[#9dabb9] text-sm">
                    Want to create your own blueprints?{" "}
                    <Link href="/auth" className="text-[#137fec] hover:text-blue-400 transition-colors font-medium">
                        Sign up free
                    </Link>
                </p>
            </footer>
        </div>
    )
}

function DemoCard({
    icon,
    title,
    description,
    href,
    featured = false,
}: {
    icon: string
    title: string
    description: string
    href: string
    featured?: boolean
}) {
    return (
        <Link
            href={href}
            className={`group flex flex-col gap-4 p-6 rounded-xl border transition-all hover:-translate-y-1 ${
                featured
                    ? "bg-[#137fec]/10 border-[#137fec]/30 hover:border-[#137fec]/50"
                    : "bg-[#18212b] border-[#283039] hover:border-[#137fec]/30"
            }`}
        >
            <div className={`size-12 rounded-lg flex items-center justify-center ${
                featured ? "bg-[#137fec]/20 text-[#137fec]" : "bg-[#283039] text-[#9dabb9] group-hover:text-[#137fec]"
            } transition-colors`}>
                <span className="material-symbols-outlined text-2xl">{icon}</span>
            </div>
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-bold">{title}</h3>
                    {featured && (
                        <span className="text-[10px] font-bold text-[#137fec] bg-[#137fec]/20 px-2 py-0.5 rounded">
                            FEATURED
                        </span>
                    )}
                </div>
                <p className="text-[#9dabb9] text-sm">{description}</p>
            </div>
            <div className="flex items-center gap-1 text-[#137fec] text-sm font-medium group-hover:gap-2 transition-all">
                View Demo
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </div>
        </Link>
    )
}
