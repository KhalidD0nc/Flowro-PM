"use client"

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/Providers";
import PricingSection from "@/components/PricingSection";

// JSON-LD structured data for SEO
const jsonLdSoftware = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Flowro AI",
    applicationCategory: "ProductivityApplication",
    operatingSystem: "Web",
    description:
        "Transform messy ideas into structured, agent-ready project blueprints. AI-powered product management for builders using Cursor, Claude, and Windsurf.",
    url: "https://flowro.ai",
    offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        description: "Free tier available with 1 project",
    },
    creator: {
        "@type": "Organization",
        name: "Flowro AI",
        url: "https://flowro.ai",
    },
    featureList: [
        "AI-powered blueprint generation",
        "Unified Blueprint (UBP) framework",
        "Export to JSON, Markdown",
        "Share blueprints with stakeholders",
        "Kanban task board",
        "Version control for specifications",
    ],
};

// Organization JSON-LD for brand recognition
const jsonLdOrganization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Flowro AI",
    url: "https://flowro.ai",
    logo: "https://flowro.ai/logo.png",
    description: "AI-powered product management and blueprint generation platform for modern builders.",
    sameAs: [
        "https://twitter.com/flowroai",
        "https://linkedin.com/company/flowroai",
    ],
    contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "support@flowro.ai",
    },
};

export default function Home() {
    const router = useRouter()
    const { user, loading } = useAuth()

    // Redirect authenticated users to dashboard - use replace to prevent back navigation
    useEffect(() => {
        if (user && !loading) {
            router.replace("/dashboard")
        }
    }, [user, loading, router])

    // Show smooth loading state while checking auth or redirecting
    if (loading || user) {
        return (
            <div className="min-h-screen bg-[#0D1117] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <span className="material-symbols-outlined text-[#137fec] animate-spin text-5xl">hourglass_top</span>
                    {user && <span className="text-[#9dabb9] text-sm animate-pulse">Taking you to your dashboard...</span>}
                </div>
            </div>
        )
    }

    return (
        <div className="bg-[#0D1117] text-white overflow-x-hidden w-full">
            {/* JSON-LD Structured Data */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSoftware) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrganization) }}
            />
            <div className="relative flex min-h-screen w-full flex-col group/design-root">
                {/* Header */}
                <header className="sticky top-0 z-50 flex items-center justify-between whitespace-nowrap border-b border-solid border-[#30363d] bg-[#0D1117]/80 backdrop-blur-md px-10 py-3">
                    <div className="flex items-center gap-3 text-white cursor-pointer">
                        <div className="size-8 text-[#137fec]">
                            <span className="material-symbols-outlined text-[32px]">hourglass_top</span>
                        </div>
                        <h2 className="text-lg font-bold leading-tight tracking-[-0.015em]">Flowro AI</h2>
                    </div>
                    <div className="flex items-center gap-8">
                        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#9dabb9]">
                            <a className="hover:text-[#137fec] transition-colors" href="#how-it-works">How it Works</a>
                            <a className="hover:text-[#137fec] transition-colors" href="#features">Features</a>
                            <a className="hover:text-[#137fec] transition-colors" href="#pricing">Pricing</a>
                        </nav>
                        <Link
                            href="/auth"
                            className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 px-4 bg-[#137fec] text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-[#137fec]/90 transition-all"
                        >
                            <span className="truncate">Get Started</span>
                        </Link>
                    </div>
                </header>

                <div className="layout-container flex h-full grow flex-col">
                    {/* Hero Section */}
                    <section className="relative flex flex-col pt-16 pb-20 px-6 lg:px-20 overflow-hidden" style={{
                        backgroundImage: 'linear-gradient(to right, rgba(48, 54, 61, 0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(48, 54, 61, 0.2) 1px, transparent 1px)',
                        backgroundSize: '40px 40px'
                    }}>
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[#137fec]/10 blur-[120px] rounded-full pointer-events-none z-0"></div>

                        <div className="layout-content-container flex flex-col lg:flex-row items-center justify-between gap-12 max-w-[1400px] mx-auto z-10 w-full">
                            {/* Left side - Text content */}
                            <div className="flex flex-col gap-8 flex-1 max-w-[640px]">
                                <div className="inline-flex items-center gap-2 rounded-full border border-[#30363d] bg-[#161b22]/50 backdrop-blur-sm px-3 py-1 w-fit">
                                    <span className="flex size-2 rounded-full bg-green-500 animate-pulse"></span>
                                    <span className="text-xs font-medium text-[#9dabb9]">v2.0 Beta is Live</span>
                                </div>
                                <div className="flex flex-col gap-6">
                                    <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black leading-[1.1] tracking-[-0.033em]">
                                        Still <span className="text-red-400 line-through decoration-red-400/50">prompting blind</span>? <br />
                                        <span className="text-[#137fec] bg-clip-text text-transparent bg-gradient-to-r from-[#137fec] to-blue-300">Ship with clarity.</span>
                                    </h1>
                                    <h2 className="text-[#9dabb9] text-lg sm:text-xl font-normal leading-relaxed max-w-[580px]">
                                        Stop burning tokens on vague prompts. Feed your AI agents specs that actually work.
                                    </h2>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                    <Link
                                        href="/auth"
                                        className="flex min-w-[160px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg h-12 px-8 bg-white text-[#0D1117] text-base font-bold leading-normal tracking-[0.015em] hover:bg-gray-100 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">bolt</span>
                                        <span className="truncate">Build Your Blueprint</span>
                                    </Link>
                                    <a href="#ubp-standard" className="flex min-w-[160px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg h-12 px-6 bg-transparent border border-[#30363d] text-white text-base font-medium leading-normal tracking-[0.015em] hover:bg-white/5 transition-all">
                                        <span className="truncate">See the Framework</span>
                                        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                                    </a>
                                </div>

                            </div>

                            {/* Right side - Terminal/Engine visualization */}
                            <div className="flex-1 w-full max-w-[750px] relative">
                                <div className="rounded-xl border border-[#30363d] bg-[#0d1117] shadow-2xl overflow-hidden relative group">
                                    {/* Terminal header */}
                                    <div className="flex items-center justify-between border-b border-[#30363d] bg-[#161b22] px-4 py-3 z-30 relative">
                                        <div className="flex gap-2">
                                            <div className="size-3 rounded-full bg-[#ff5f56]"></div>
                                            <div className="size-3 rounded-full bg-[#ffbd2e]"></div>
                                            <div className="size-3 rounded-full bg-[#27c93f]"></div>
                                        </div>
                                        <div className="text-xs font-mono text-[#7d8590] uppercase tracking-wider flex items-center gap-2">
                                            <span className="material-symbols-outlined text-sm text-[#137fec]">hourglass_top</span>
                                            Flowro Ingestion Engine
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="px-2 py-0.5 rounded text-[10px] font-mono bg-green-500/20 text-green-500 border border-green-500/20">Active</div>
                                        </div>
                                    </div>

                                    {/* Terminal content */}
                                    <div className="relative h-auto min-h-[500px] md:h-[460px] bg-[#0d1117] overflow-hidden p-6 flex items-center justify-center">
                                        <div className="absolute inset-0" style={{
                                            backgroundImage: 'radial-gradient(#30363d 1px, transparent 1px)',
                                            backgroundSize: '20px 20px',
                                            opacity: 0.3
                                        }}></div>

                                        <div className="relative w-full max-w-[600px] h-full flex flex-col md:flex-row items-center justify-between z-10 gap-8 md:gap-0">
                                            {/* Messy Input side */}
                                            <div className="relative w-36 h-36 md:w-32 md:h-full flex flex-col justify-center items-center shrink-0">
                                                <div className="absolute inset-0 border border-dashed border-white/10 rounded-xl bg-white/5"></div>
                                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#0d1117] px-2 text-[10px] text-gray-500 font-mono uppercase tracking-widest whitespace-nowrap">Messy Input</div>

                                                {/* Top row - 2 icons */}
                                                <div className="absolute top-4 md:top-8 left-1/2 -translate-x-1/2 flex gap-3 md:gap-4">
                                                    <div className="p-3 bg-[#1e2329] border border-[#30363d] rounded-lg shadow-lg rotate-[-8deg] hover:scale-110 transition-transform cursor-default animate-[float_4s_ease-in-out_infinite]">
                                                        <span className="material-symbols-outlined text-blue-400 text-[20px] md:text-[24px]">description</span>
                                                    </div>
                                                    <div className="p-3 bg-[#1e2329] border border-[#30363d] rounded-lg shadow-lg rotate-[8deg] hover:scale-110 transition-transform cursor-default animate-[float_5s_ease-in-out_infinite_0.5s]">
                                                        <span className="material-symbols-outlined text-yellow-500 text-[20px] md:text-[24px]">sticky_note_2</span>
                                                    </div>
                                                </div>

                                                {/* Bottom row - 1 icon centered */}
                                                <div className="absolute bottom-4 md:bottom-8 left-1/2 -translate-x-1/2">
                                                    <div className="p-3 bg-[#1e2329] border border-[#30363d] rounded-lg shadow-lg rotate-[3deg] hover:scale-110 transition-transform cursor-default animate-[float_4s_ease-in-out_infinite_1s]">
                                                        <span className="material-symbols-outlined text-green-400 text-[20px] md:text-[24px]">chat</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Middle - flow animation area */}
                                            <div className="flex-1 w-full md:w-auto md:h-full relative flex items-center justify-center px-4 py-8 md:py-0">
                                                {/* Connecting track (Horizontal for Desktop) */}
                                                <div className="hidden md:flex absolute inset-0 items-center px-8">
                                                    <div className="w-full h-[2px] bg-[#30363d] relative overflow-visible">
                                                        {/* Moving data packets */}
                                                        <div className="absolute top-1/2 -translate-y-1/2 left-0 size-2 bg-[#137fec] rounded-full shadow-[0_0_10px_#137fec] animate-[moveRight_3s_linear_infinite]"></div>
                                                        <div className="absolute top-1/2 -translate-y-1/2 left-0 size-1.5 bg-white/80 rounded-full shadow-[0_0_8px_white] animate-[moveRight_3s_linear_infinite_1s]"></div>
                                                        <div className="absolute top-1/2 -translate-y-1/2 left-0 size-2 bg-[#137fec] rounded-full shadow-[0_0_10px_#137fec] animate-[moveRight_3s_linear_infinite_2s]"></div>

                                                        {/* Static arrow head at the end */}
                                                        <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 text-[#30363d]">
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="rotate-0">
                                                                <path d="M8 5v14l11-7z" />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Connecting track (Vertical for Mobile) */}
                                                <div className="flex md:hidden absolute inset-0 justify-center py-8">
                                                    <div className="h-full w-[2px] bg-[#30363d] relative overflow-visible">
                                                        {/* Moving data packets (Downwards) */}
                                                        <div className="absolute left-1/2 -translate-x-1/2 top-0 size-2 bg-[#137fec] rounded-full shadow-[0_0_10px_#137fec] animate-[moveDown_3s_linear_infinite]"></div>
                                                        <div className="absolute left-1/2 -translate-x-1/2 top-0 size-1.5 bg-white/80 rounded-full shadow-[0_0_8px_white] animate-[moveDown_3s_linear_infinite_1s]"></div>
                                                        <div className="absolute left-1/2 -translate-x-1/2 top-0 size-2 bg-[#137fec] rounded-full shadow-[0_0_10px_#137fec] animate-[moveDown_3s_linear_infinite_2s]"></div>

                                                        {/* Static arrow head at the end */}
                                                        <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 text-[#30363d]">
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="rotate-90">
                                                                <path d="M8 5v14l11-7z" />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Central Processing Node */}
                                                <div className="relative z-10 size-20 flex items-center justify-center shrink-0">
                                                    <div className="absolute inset-0 bg-[#0d1117] rounded-full border-2 border-[#30363d] z-10"></div>

                                                    {/* Animated rings */}
                                                    <div className="absolute inset-[-4px] border border-[#137fec]/30 rounded-full animate-[spin_4s_linear_infinite]"></div>
                                                    <div className="absolute inset-[-8px] border border-[#137fec]/10 rounded-full animate-[spin_8s_linear_infinite_reverse]"></div>

                                                    {/* Icon */}
                                                    <div className="relative z-20 flex flex-col items-center gap-1">
                                                        <span className="material-symbols-outlined text-[#137fec] text-2xl">settings_suggest</span>
                                                        <span className="text-[9px] font-mono text-[#137fec] font-bold tracking-wider">PROCESS</span>
                                                    </div>

                                                    {/* Pulse effect */}
                                                    <div className="absolute inset-0 bg-[#137fec]/20 rounded-full blur-xl animate-pulse z-0"></div>
                                                </div>
                                            </div>

                                            {/* Unified Blueprint side */}
                                            <div className="relative w-36 h-full flex flex-col justify-center items-center">
                                                <div className="absolute inset-0 border border-dashed border-white/10 rounded-xl bg-white/5"></div>
                                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#0d1117] px-2 text-[10px] text-gray-500 font-mono uppercase tracking-widest whitespace-nowrap">Unified Blueprint</div>

                                                <div className="relative z-10 w-28 h-40 bg-[#161b22] border border-[#137fec]/50 rounded-lg shadow-[0_0_30px_rgba(19,127,236,0.15)] flex flex-col p-4 group-hover:scale-105 transition-transform duration-500 overflow-hidden">
                                                    <div className="flex items-center gap-2 mb-3 border-b border-white/10 pb-2">
                                                        <span className="material-symbols-outlined text-[#137fec] text-[14px]">article</span>
                                                        <div className="h-1.5 w-10 bg-white/20 rounded-full"></div>
                                                    </div>
                                                    <div className="space-y-2 flex-1">
                                                        <div className="flex gap-1.5">
                                                            <div className="h-1 w-2 bg-[#137fec]/40 rounded-full"></div>
                                                            <div className="h-1 w-16 bg-white/10 rounded-full"></div>
                                                        </div>
                                                        <div className="flex gap-1.5">
                                                            <div className="h-1 w-2 bg-[#137fec]/40 rounded-full"></div>
                                                            <div className="h-1 w-12 bg-white/10 rounded-full"></div>
                                                        </div>
                                                        <div className="flex gap-1.5">
                                                            <div className="h-1 w-2 bg-[#137fec]/40 rounded-full"></div>
                                                            <div className="h-1 w-14 bg-white/10 rounded-full"></div>
                                                        </div>
                                                        <div className="mt-2 p-1.5 bg-[#137fec]/5 rounded border border-[#137fec]/10">
                                                            <div className="h-1 w-full bg-[#137fec]/20 rounded-full mb-1"></div>
                                                            <div className="h-1 w-2/3 bg-[#137fec]/20 rounded-full"></div>
                                                        </div>
                                                    </div>
                                                    <div className="absolute -top-2 -right-2 bg-green-500 text-black rounded-full p-0.5 shadow-lg scale-0 group-hover:scale-100 transition-transform delay-300 duration-300">
                                                        <span className="material-symbols-outlined text-[14px] font-bold">check</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Terminal footer */}
                                    <div className="flex items-center justify-between border-t border-[#30363d] bg-[#0d1117] px-4 py-3">
                                        <div className="flex gap-4">
                                            <div className="flex items-center gap-1.5 opacity-50 animate-[pulse_2s_ease-in-out_infinite]">
                                                <span className="material-symbols-outlined text-[14px] text-green-500">terminal</span>
                                                <span className="text-[10px] font-mono text-[#7d8590]">Merging disjointed contexts...</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="h-1.5 w-24 bg-[#161b22] rounded-full overflow-hidden">
                                                <div className="h-full bg-[#137fec] animate-[widthGrow_4s_ease-out_forwards] w-0"></div>
                                            </div>
                                            <span className="text-[10px] font-mono text-[#7d8590]">100%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="absolute -right-20 -bottom-20 w-[400px] h-[400px] bg-[#137fec]/20 blur-[100px] rounded-full pointer-events-none z-0"></div>
            </div>

            {/* IDE Integration Section */}
            <section className="py-12 px-6 lg:px-20 bg-[#0d1117] border-b border-[#30363d]">
                <div className="max-w-[1200px] mx-auto">
                    <div className="flex flex-col items-center gap-8">
                        <p className="text-[#637588] text-sm font-medium uppercase tracking-widest">Works seamlessly with your favorite IDE</p>
                        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
                            {/* VS Code */}
                            <div
                                className="group flex flex-col items-center gap-3 p-4 rounded-xl transition-all"
                            >
                                <div className="relative">
                                    <img
                                        src="/vscode.png"
                                        alt="VS Code"
                                        className="h-12 w-auto object-contain opacity-70 group-hover:opacity-100 transition-opacity"
                                    />
                                    <div className="absolute inset-0 bg-blue-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity rounded-full"></div>
                                </div>
                                <span className="text-[#9dabb9] text-xs font-medium group-hover:text-white transition-colors">VS Code</span>
                            </div>

                            {/* Cursor */}
                            <div
                                className="group flex flex-col items-center gap-3 p-4 rounded-xl transition-all"
                            >
                                <div className="relative">
                                    <img
                                        src="/CUBE_2D_DARK.png"
                                        alt="Cursor"
                                        className="h-12 w-auto object-contain opacity-70 group-hover:opacity-100 transition-opacity"
                                    />
                                    <div className="absolute inset-0 bg-purple-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity rounded-full"></div>
                                </div>
                                <span className="text-[#9dabb9] text-xs font-medium group-hover:text-white transition-colors">Cursor</span>
                            </div>

                            {/* Antigravity */}
                            <div
                                className="group flex flex-col items-center gap-3 p-4 rounded-xl transition-all"
                            >
                                <div className="relative">
                                    <img
                                        src="/antigraviti-logo.png"
                                        alt="Antigravity"
                                        className="h-12 w-auto object-contain opacity-70 group-hover:opacity-100 transition-opacity"
                                    />
                                    <div className="absolute inset-0 bg-orange-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity rounded-full"></div>
                                </div>
                                <span className="text-[#9dabb9] text-xs font-medium group-hover:text-white transition-colors">Antigravity</span>
                            </div>
                        </div>
                        <p className="text-[#637588] text-xs">Export your blueprints directly to your IDE workflow</p>
                    </div>
                </div>
            </section>

            {/* Social Proof Stats Section */}
            <section className="py-16 px-6 lg:px-20 bg-[#0d1117]">
                <div className="max-w-[1000px] mx-auto">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                        <div className="flex flex-col gap-2">
                            <span className="text-3xl md:text-4xl font-black text-white">500+</span>
                            <span className="text-sm text-[#9dabb9]">Blueprints Created</span>
                        </div>
                        <div className="flex flex-col gap-2">
                            <span className="text-3xl md:text-4xl font-black text-[#137fec]">10x</span>
                            <span className="text-sm text-[#9dabb9]">Faster Planning</span>
                        </div>
                        <div className="flex flex-col gap-2">
                            <span className="text-3xl md:text-4xl font-black text-white">98%</span>
                            <span className="text-sm text-[#9dabb9]">Less Rework</span>
                        </div>
                        <div className="flex flex-col gap-2">
                            <span className="text-3xl md:text-4xl font-black text-white">AI-First</span>
                            <span className="text-sm text-[#9dabb9]">Built for Builders</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* UBP Visualizer Section */}
            <section className="py-24 px-6 lg:px-20 bg-[#0d1117] border-y border-[#30363d] overflow-hidden relative">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#137fec]/5 blur-[120px] rounded-full pointer-events-none"></div>
                <div className="layout-content-container max-w-[1200px] mx-auto flex flex-col gap-16 relative z-10">
                    <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                        <div className="flex flex-col gap-4 max-w-[600px]">
                            <div className="inline-flex items-center gap-2 rounded-full border border-[#137fec]/30 bg-[#137fec]/10 px-3 py-1 w-fit">
                                <span className="material-symbols-outlined text-[14px] text-[#137fec]">auto_graph</span>
                                <span className="text-xs font-bold text-[#137fec]">UBP Visualizer</span>
                            </div>
                            <h2 className="text-3xl md:text-5xl font-bold leading-tight tracking-tight text-white">
                                Visuals <span className="italic text-[#137fec]">derived</span> from <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">your Unified Blueprint.</span>
                            </h2>
                            <p className="text-[#9dabb9] text-lg">
                                The UBP isn&apos;t just a static document—it&apos;s a structured engine. Flowro parses your Blueprint to generate professional sequence diagrams and flowcharts automatically.
                            </p>
                        </div>
                    </div>

                    {/* Visualizer Demo */}
                    <div className="max-w-[1000px] mx-auto bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl overflow-hidden relative group w-full flex flex-col md:flex-row">
                        {/* Left - Code view */}
                        <div className="w-full md:w-[40%] border-r border-[#30363d] bg-[#0d1117] flex flex-col">
                            <div className="px-4 py-3 border-b border-[#30363d] flex items-center justify-between bg-[#161b22]">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[14px] text-blue-400">description</span>
                                    <span className="font-mono text-xs text-[#7d8590]">unified_blueprint.ubp</span>
                                </div>
                            </div>
                            <div className="p-6 font-mono text-xs leading-relaxed text-gray-400 overflow-hidden relative">
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0d1117] z-10"></div>
                                <div className="text-purple-400 mb-2">## Authentication Flow</div>
                                <div className="pl-4 border-l border-[#30363d] mb-4">
                                    <span className="text-blue-400">Participant:</span> User<br />
                                    <span className="text-blue-400">Participant:</span> Client App<br />
                                    <span className="text-blue-400">Participant:</span> API Gateway<br />
                                    <span className="text-blue-400">Participant:</span> Auth Svc
                                </div>
                                <div className="text-yellow-400 mb-2"># Logic Steps</div>
                                <div className="pl-4 border-l border-[#30363d]">
                                    1. User clicks login<br />
                                    2. Client POST /auth/login<br />
                                    3. Gateway validates token<br />
                                    4. <span className="text-green-400">If valid:</span> Create session<br />
                                    5. Return 200 OK
                                </div>
                                <div className="mt-8 text-gray-600 italic">{"// This structured text generates the visual on the right automatically."}</div>
                            </div>
                        </div>

                        {/* Right - Diagram view */}
                        <div className="w-full md:w-[60%] bg-[#161b22] relative flex flex-col">
                            <div className="px-4 py-3 border-b border-[#30363d] flex items-center justify-between bg-[#161b22]">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[14px] text-green-400">preview</span>
                                    <span className="font-mono text-xs text-[#7d8590]">Preview: Sequence Diagram</span>
                                </div>
                                <div className="flex gap-2">
                                    <div className="size-2 rounded-full bg-red-500/20"></div>
                                    <div className="size-2 rounded-full bg-yellow-500/20"></div>
                                    <div className="size-2 rounded-full bg-green-500/20"></div>
                                </div>
                            </div>
                            <div className="p-8 relative min-h-[400px] bg-[#1e2329]">
                                <div className="absolute inset-0 opacity-20" style={{
                                    backgroundImage: 'radial-gradient(#30363d 1px, transparent 1px)',
                                    backgroundSize: '24px 24px'
                                }}></div>
                                <div className="relative z-10 w-full h-full flex justify-between">
                                    {/* Diagram participants */}
                                    <div className="flex flex-col items-center h-full relative group/col w-1/4">
                                        <div className="p-2 bg-[#0d1117] border border-[#30363d] rounded mb-4 z-20 shadow-lg">
                                            <span className="material-symbols-outlined text-white text-[18px]">person</span>
                                        </div>
                                        <div className="text-[10px] font-mono text-[#7d8590] mb-4">User</div>
                                        <div className="w-px bg-[#30363d] h-[300px] border-l border-dashed border-[#30363d] relative"></div>
                                    </div>
                                    <div className="flex flex-col items-center h-full relative group/col w-1/4">
                                        <div className="p-2 bg-[#0d1117] border border-[#30363d] rounded mb-4 z-20 shadow-lg">
                                            <span className="material-symbols-outlined text-blue-400 text-[18px]">smartphone</span>
                                        </div>
                                        <div className="text-[10px] font-mono text-[#7d8590] mb-4">App</div>
                                        <div className="w-px bg-[#30363d] h-[300px] border-l border-dashed border-[#30363d] relative">
                                            <div className="absolute top-[40px] left-1/2 -translate-x-1/2 w-2 h-[60px] bg-blue-500/20 border border-blue-500/50 rounded-sm"></div>
                                            <div className="absolute top-[180px] left-1/2 -translate-x-1/2 w-2 h-[40px] bg-blue-500/20 border border-blue-500/50 rounded-sm"></div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center h-full relative group/col w-1/4">
                                        <div className="p-2 bg-[#0d1117] border border-[#30363d] rounded mb-4 z-20 shadow-lg">
                                            <span className="material-symbols-outlined text-purple-400 text-[18px]">dns</span>
                                        </div>
                                        <div className="text-[10px] font-mono text-[#7d8590] mb-4">API</div>
                                        <div className="w-px bg-[#30363d] h-[300px] border-l border-dashed border-[#30363d] relative">
                                            <div className="absolute top-[80px] left-1/2 -translate-x-1/2 w-2 h-[120px] bg-purple-500/20 border border-purple-500/50 rounded-sm"></div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center h-full relative group/col w-1/4">
                                        <div className="p-2 bg-[#0d1117] border border-[#30363d] rounded mb-4 z-20 shadow-lg">
                                            <span className="material-symbols-outlined text-orange-400 text-[18px]">shield</span>
                                        </div>
                                        <div className="text-[10px] font-mono text-[#7d8590] mb-4">Auth</div>
                                        <div className="w-px bg-[#30363d] h-[300px] border-l border-dashed border-[#30363d] relative">
                                            <div className="absolute top-[110px] left-1/2 -translate-x-1/2 w-2 h-[60px] bg-orange-500/20 border border-orange-500/50 rounded-sm"></div>
                                        </div>
                                    </div>
                                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-30 overflow-visible">
                                        <defs>
                                            <marker id="arrow" markerHeight="10" markerUnits="strokeWidth" markerWidth="10" orient="auto" refX="9" refY="3">
                                                <path d="M0,0 L0,6 L9,3 z" fill="#6b7280"></path>
                                            </marker>
                                            <marker id="arrow-blue" markerHeight="10" markerUnits="strokeWidth" markerWidth="10" orient="auto" refX="9" refY="3">
                                                <path d="M0,0 L0,6 L9,3 z" fill="#3b82f6"></path>
                                            </marker>
                                        </defs>
                                        <line markerEnd="url(#arrow)" stroke="#6b7280" strokeWidth="1.5" x1="12%" x2="37%" y1="120" y2="120"></line>
                                        <line markerEnd="url(#arrow-blue)" stroke="#3b82f6" strokeWidth="1.5" x1="37%" x2="62%" y1="150" y2="150"></line>
                                        <line markerEnd="url(#arrow)" stroke="#6b7280" strokeWidth="1.5" x1="62%" x2="87%" y1="180" y2="180"></line>
                                        <line markerEnd="url(#arrow)" stroke="#6b7280" strokeDasharray="4 2" strokeWidth="1.5" x1="87%" x2="62%" y1="210" y2="210"></line>
                                        <line markerEnd="url(#arrow-blue)" stroke="#3b82f6" strokeDasharray="4 2" strokeWidth="1.5" x1="62%" x2="37%" y1="240" y2="240"></line>
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>


            {/* How it Works Section */}
            <section id="how-it-works" className="py-24 px-6 lg:px-40 scroll-mt-20">
                <div className="layout-content-container max-w-[960px] mx-auto flex flex-col gap-16">
                    <div className="flex flex-col items-center text-center gap-4">
                        <h2 className="text-3xl font-bold leading-tight tracking-[-0.015em] text-white">How it Works</h2>
                        <p className="text-[#9dabb9] text-lg max-w-[600px]">
                            Turn your scattered ideas into a production-ready blueprint in 5 automated steps.
                        </p>
                    </div>
                    <div className="flex flex-col pl-4 sm:pl-20 max-w-[800px] mx-auto w-full">
                        {/* Step 1 */}
                        <div className="flex gap-6 group">
                            <div className="flex flex-col items-center">
                                <div className="size-14 rounded-full border border-[#30363d] bg-[#161b22] flex items-center justify-center z-10 group-hover:border-[#137fec] transition-colors shadow-sm">
                                    <span className="material-symbols-outlined text-white text-[28px]">playlist_add</span>
                                </div>
                                <div className="w-[2px] h-full bg-[#30363d] -my-2 group-hover:bg-[#137fec]/50 transition-colors"></div>
                            </div>
                            <div className="pb-16 pt-3">
                                <h3 className="text-xl font-bold text-white mb-2">Builder Dumps &quot;Chaos&quot; Idea</h3>
                                <p className="text-[#9dabb9] leading-relaxed text-base">Paste raw notes, Loom transcripts, or messy docs. Flowro handles the chaos.</p>
                            </div>
                        </div>
                        {/* Step 2 */}
                        <div className="flex gap-6 group">
                            <div className="flex flex-col items-center">
                                <div className="size-14 rounded-full border border-[#30363d] bg-[#161b22] flex items-center justify-center z-10 group-hover:border-[#137fec] transition-colors shadow-sm">
                                    <span className="material-symbols-outlined text-white text-[28px]">psychology</span>
                                </div>
                                <div className="w-[2px] h-full bg-[#30363d] -my-2 group-hover:bg-[#137fec]/50 transition-colors"></div>
                            </div>
                            <div className="pb-16 pt-3">
                                <h3 className="text-xl font-bold text-white mb-2">Agent Studies Needs &amp; Infers Gaps</h3>
                                <p className="text-[#9dabb9] leading-relaxed text-base">AI analyzes context, flags contradictions, and intelligently infers missing logic.</p>
                            </div>
                        </div>
                        {/* Step 3 */}
                        <div className="flex gap-6 group">
                            <div className="flex flex-col items-center">
                                <div className="size-14 rounded-full border border-[#30363d] bg-[#161b22] flex items-center justify-center z-10 group-hover:border-[#137fec] transition-colors shadow-sm">
                                    <span className="material-symbols-outlined text-white text-[28px]">architecture</span>
                                </div>
                                <div className="w-[2px] h-full bg-[#30363d] -my-2 group-hover:bg-[#137fec]/50 transition-colors"></div>
                            </div>
                            <div className="pb-16 pt-3">
                                <h3 className="text-xl font-bold text-white mb-2">Agent Generates Full UBP Draft</h3>
                                <p className="text-[#9dabb9] leading-relaxed text-base">Receive a structured Unified Blueprint (UBP) draft instantly, ready for code generation.</p>
                            </div>
                        </div>
                        {/* Step 4 */}
                        <div className="flex gap-6 group">
                            <div className="flex flex-col items-center">
                                <div className="size-14 rounded-full border border-[#30363d] bg-[#161b22] flex items-center justify-center z-10 group-hover:border-[#137fec] transition-colors shadow-sm">
                                    <span className="material-symbols-outlined text-white text-[28px]">rate_review</span>
                                </div>
                                <div className="w-[2px] h-full bg-[#30363d] -my-2 group-hover:bg-[#137fec]/50 transition-colors"></div>
                            </div>
                            <div className="pb-16 pt-3">
                                <h3 className="text-xl font-bold text-white mb-2">Builder Reviews &amp; Refines</h3>
                                <p className="text-[#9dabb9] leading-relaxed text-base">Collaborate with the AI to refine specs. It learns from your feedback.</p>
                            </div>
                        </div>
                        {/* Step 5 - Final */}
                        <div className="flex gap-6 group">
                            <div className="flex flex-col items-center">
                                <div className="size-14 rounded-full border border-[#137fec] bg-[#137fec] flex items-center justify-center z-10 shadow-[0_0_20px_rgba(19,127,236,0.4)]">
                                    <span className="material-symbols-outlined text-white text-[28px]">lock</span>
                                </div>
                            </div>
                            <div className="pt-3">
                                <h3 className="text-xl font-bold text-[#137fec] mb-2">Agent Locks Version &amp; Exports</h3>
                                <p className="text-[#9dabb9] leading-relaxed text-base">Version locked. Export your UBP directly to your development pipeline.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section - Bento Grid Style */}
            <section id="features" className="py-32 px-6 lg:px-40 bg-[#0d1117] relative overflow-hidden scroll-mt-20">
                {/* Background Glows */}
                <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-[#137fec]/5 blur-[120px] rounded-full pointer-events-none -translate-y-1/2"></div>
                <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-500/5 blur-[120px] rounded-full pointer-events-none translate-y-1/3"></div>

                <div className="layout-content-container max-w-[1240px] mx-auto flex flex-col gap-16 relative z-10">
                    <div className="flex flex-col gap-6 text-center items-center max-w-[800px] mx-auto">
                        <div className="inline-flex items-center gap-2 rounded-full border border-[#137fec]/40 bg-[#137fec]/10 px-4 py-1.5 shadow-[0_0_15px_rgba(19,127,236,0.2)]">
                            <span className="material-symbols-outlined text-[16px] text-[#137fec] animate-pulse">auto_awesome</span>
                            <span className="text-sm font-bold text-[#137fec] tracking-wide">Flowro Powers</span>
                        </div>
                        <h2 className="text-4xl md:text-6xl font-black leading-[1.1] tracking-tight text-white">
                            Everything you <span className="text-[#9dabb9] line-through decoration-red-500/50 decoration-4">hate</span> doing, <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#137fec] via-blue-400 to-purple-400">automated.</span>
                        </h2>
                    </div>

                    {/* Bento Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[320px]">

                        {/* Card 1: Chaos Ingestion (Large, spans 2 cols) */}
                        <div className="group md:col-span-2 relative overflow-hidden rounded-3xl border border-[#30363d] bg-[#161b22]/60 backdrop-blur-xl transition-all duration-500 hover:border-[#137fec]/50 hover:shadow-[0_0_30px_rgba(19,127,236,0.15)]">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                            <div className="absolute top-8 left-8 z-20 max-w-[340px]">
                                <div className="size-12 rounded-2xl bg-gradient-to-br from-[#137fec] to-[#0b4ba0] flex items-center justify-center text-white shadow-lg mb-4 group-hover:scale-110 transition-transform duration-300">
                                    <span className="material-symbols-outlined text-[28px]">input</span>
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2">Zero-Friction Ingestion</h3>
                                <p className="text-[#9dabb9] leading-relaxed">Throw anything at it. Messy notes, Loom transcripts, PDF specs. Flowro turns noise into signal instantly.</p>
                            </div>

                            {/* Visual: Floating Documents to Structured Stack */}
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1/2 h-full hidden md:block">
                                {/* Simulated messy docs */}
                                <div className="absolute top-[20%] right-[30%] w-24 h-32 bg-[#283039] rounded-lg border border-white/5 rotate-[-12deg] opacity-60 group-hover:translate-x-4 group-hover:rotate-0 group-hover:opacity-0 transition-all duration-700"></div>
                                <div className="absolute top-[30%] right-[15%] w-24 h-32 bg-[#283039] rounded-lg border border-white/5 rotate-[8deg] opacity-70 group-hover:-translate-x-4 group-hover:rotate-0 group-hover:opacity-0 transition-all duration-700"></div>

                                {/* The "Result" Stack that appears */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-40 bg-[#0d1117] rounded-xl border border-[#137fec] shadow-[0_0_20px_rgba(19,127,236,0.2)] scale-50 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-500 delay-100 flex flex-col items-center justify-center gap-2">
                                    <span className="material-symbols-outlined text-[#137fec] text-4xl">article</span>
                                    <div className="h-1.5 w-16 bg-[#137fec]/20 rounded-full"></div>
                                    <div className="h-1.5 w-12 bg-[#137fec]/20 rounded-full"></div>
                                    <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1 shadow-lg animate-bounce">
                                        <span className="material-symbols-outlined text-black text-xs font-bold">check</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Card 2: AI Logic Check (Tall, spans 1 col) */}
                        <div className="group relative overflow-hidden rounded-3xl border border-[#30363d] bg-[#161b22]/60 backdrop-blur-xl transition-all duration-500 hover:border-purple-500/50 hover:shadow-[0_0_30px_rgba(168,85,247,0.15)] flex flex-col justify-between">
                            <div className="absolute inset-0 bg-gradient-to-bl from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                            <div className="p-8 z-10">
                                <div className="size-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg mb-4 group-hover:rotate-12 transition-transform duration-300">
                                    <span className="material-symbols-outlined text-[28px]">psychology_alt</span>
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2">Self-Healing Specs</h3>
                                <p className="text-[#9dabb9] text-sm">It detects logic gaps before you build.</p>
                            </div>

                            {/* Visual: Radar Scan */}
                            <div className="relative h-32 w-full mt-auto overflow-hidden">
                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[120%] h-[120%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-500/10 via-transparent to-transparent opacity-50 animate-pulse"></div>
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-4">
                                    <span className="px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium group-hover:bg-green-500/10 group-hover:border-green-500/20 group-hover:text-green-400 transition-all duration-500">
                                        <span className="group-hover:hidden">Gap Found</span>
                                        <span className="hidden group-hover:inline">Resolved</span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Card 3: Code Export (Span 1 col) */}
                        <div className="group relative overflow-hidden rounded-3xl border border-[#30363d] bg-[#161b22]/60 backdrop-blur-xl transition-all duration-500 hover:border-green-500/50 hover:shadow-[0_0_30px_rgba(34,197,94,0.15)]">
                            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                            <div className="p-8 z-10">
                                <div className="size-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white shadow-lg mb-4 group-hover:scale-110 transition-transform duration-300">
                                    <span className="material-symbols-outlined text-[28px]">terminal</span>
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2">Dev-Ready Export</h3>
                                <p className="text-[#9dabb9] text-sm">JSON, Markdown, or Cursor Rules. Done.</p>
                            </div>

                            {/* Visual: Code Lines */}
                            <div className="absolute bottom-6 right-6 flex flex-col gap-2 items-end opacity-30 group-hover:opacity-80 transition-opacity duration-500">
                                <div className="h-2 w-24 bg-green-500/40 rounded-full"></div>
                                <div className="h-2 w-16 bg-green-500/40 rounded-full"></div>
                                <div className="h-2 w-20 bg-green-500/40 rounded-full"></div>
                            </div>
                        </div>

                        {/* Card 4: Speed (Span 2 cols) */}
                        <div className="group md:col-span-2 relative overflow-hidden rounded-3xl border border-[#30363d] bg-[#161b22]/60 backdrop-blur-xl transition-all duration-500 hover:border-orange-500/50 hover:shadow-[0_0_30px_rgba(249,115,22,0.15)] flex items-center justify-between p-8">
                            <div className="max-w-[340px] z-10">
                                <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                                    <span className="material-symbols-outlined text-orange-500 text-3xl animate-[spin_3s_linear_infinite]">hourglass_empty</span>
                                    10x Faster Planning
                                </h3>
                                <p className="text-[#9dabb9]">Skip the &quot;blank page&quot; paralysis. Go from idea to implementation plan in minutes, not days.</p>
                            </div>

                            {/* Visual: Speed Lines / Graph */}
                            <div className="hidden md:flex h-full items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                                <div className="w-2 h-8 bg-orange-500/20 rounded-full group-hover:h-12 transition-all duration-300"></div>
                                <div className="w-2 h-12 bg-orange-500/30 rounded-full group-hover:h-20 transition-all duration-300 delay-75"></div>
                                <div className="w-2 h-6 bg-orange-500/20 rounded-full group-hover:h-16 transition-all duration-300 delay-100"></div>
                                <div className="w-2 h-16 bg-orange-500/50 rounded-full group-hover:h-24 transition-all duration-300 delay-150"></div>
                                <div className="w-2 h-24 bg-orange-500 rounded-full shadow-[0_0_10px_#f97316] group-hover:h-32 transition-all duration-500"></div>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* UBP Standard Section - Clean & Direct */}
            <section id="ubp-standard" className="py-20 px-6 lg:px-20 bg-[#0d1117] border-t border-[#30363d] relative overflow-hidden scroll-mt-20">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#137fec]/5 blur-[100px] rounded-full pointer-events-none"></div>

                <div className="max-w-[1100px] mx-auto relative z-10">
                    {/* Header - Minimal */}
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
                            One Blueprint. <span className="text-[#137fec]">Zero Ambiguity.</span>
                        </h2>
                        <p className="text-[#9dabb9] text-base max-w-[500px] mx-auto">
                            The UBP standard your AI agents actually understand.
                        </p>
                    </div>

                    {/* Core Value Props - 3 Columns, Super Clean */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                        <div className="text-center p-6 rounded-xl border border-[#30363d] bg-[#161b22]/50 hover:border-[#137fec]/30 transition-colors">
                            <span className="material-symbols-outlined text-[#137fec] text-3xl mb-3">center_focus_strong</span>
                            <h3 className="text-white font-semibold mb-1">Single Source</h3>
                            <p className="text-[#9dabb9] text-sm">One file. All context.</p>
                        </div>
                        <div className="text-center p-6 rounded-xl border border-[#30363d] bg-[#161b22]/50 hover:border-[#137fec]/30 transition-colors">
                            <span className="material-symbols-outlined text-[#137fec] text-3xl mb-3">smart_toy</span>
                            <h3 className="text-white font-semibold mb-1">Agent-Ready</h3>
                            <p className="text-[#9dabb9] text-sm">Optimized for AI.</p>
                        </div>
                        <div className="text-center p-6 rounded-xl border border-[#30363d] bg-[#161b22]/50 hover:border-[#137fec]/30 transition-colors">
                            <span className="material-symbols-outlined text-[#137fec] text-3xl mb-3">do_not_disturb_on</span>
                            <h3 className="text-white font-semibold mb-1">No Fluff</h3>
                            <p className="text-[#9dabb9] text-sm">Pure specs only.</p>
                        </div>
                    </div>

                    {/* 9-Section Anatomy - Compact Horizontal List */}
                    <div className="rounded-xl border border-[#30363d] bg-[#161b22]/30 p-6 md:p-8">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold text-white">9-Section Structure</h3>
                            <div className="flex items-center gap-2 text-xs text-green-500">
                                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                <span>Standardized</span>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {[
                                "Vision", "Scope", "Actors", "Behaviors", "Constraints",
                                "Tech Stack", "Phases", "Integrations", "Changelog"
                            ].map((step, i) => (
                                <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0d1117] border border-[#30363d] text-sm text-[#9dabb9] hover:border-[#137fec]/50 hover:text-white transition-colors cursor-default">
                                    <span className="text-[#137fec] font-mono text-[10px]">{String(i + 1).padStart(2, '0')}</span>
                                    <span>{step}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <PricingSection />

            {/* CTA Section */}
            <section className="py-24 px-6 lg:px-40 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#137fec]/5 pointer-events-none"></div>
                <div className="layout-content-container max-w-[720px] mx-auto flex flex-col items-center text-center gap-8 relative z-10">
                    <span className="material-symbols-outlined text-[#137fec] text-[40px] scale-180">
                        hourglass_bottom
                    </span>

                    <h2 className="text-4xl md:text-5xl font-black leading-tight tracking-[-0.033em] underline decoration-[#137fec]">
                        Ready to find your flow?
                    </h2>

                    <div className="flex flex-col sm:flex-row gap-3 w-full max-w-[480px] items-center justify-center">
                        <Link
                            href="/auth"
                            className="h-12 px-6 rounded-lg bg-[#137fec] text-white font-bold hover:bg-[#137fec]/90 transition-all whitespace-nowrap flex items-center justify-center"
                        >
                            Get Started
                        </Link>
                    </div>

                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-[#30363d] bg-[#0D1117] py-12 px-6 lg:px-40">
                <div className="layout-content-container max-w-[960px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#137fec]">hourglass_top</span>
                        <span className="text-white font-bold text-lg">Flowro AI</span>
                    </div>
                    <div className="flex gap-8 text-sm text-[#9dabb9]">
                        <a className="hover:text-white transition-colors" href="/terms">Terms</a>
                        <a className="hover:text-white transition-colors" href="/privacy">Privacy</a>
                        <a className="hover:text-white transition-colors" href="#">X</a>
                        <a className="hover:text-white transition-colors" href="#">LinkedIn</a>
                        <a className="hover:text-white transition-colors" href="#">Discord</a>
                    </div>
                    <p className="text-xs text-[#637588]">© 2026 Flowro AI Inc. All rights reserved.</p>
                </div>
            </footer>

            <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes fadeIn {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
        @keyframes widthGrow {
          0% { width: 0; }
          100% { width: 100%; }
        }
        @keyframes moveRight {
          0% { left: 0; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { left: 100%; opacity: 0; }
        }
        @keyframes moveDown {
          0% { top: 0; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
        </div>
    );
}