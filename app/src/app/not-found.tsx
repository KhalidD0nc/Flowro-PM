import Link from "next/link"
import { Metadata } from "next"

export const metadata: Metadata = {
    title: "Page Not Found",
    description: "The page you're looking for doesn't exist.",
}

export default function NotFound() {
    return (
        <div className="min-h-screen bg-[#101922] flex flex-col items-center justify-center px-4">
            {/* Background effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] rounded-full bg-[#137fec]/10 blur-[100px]" />
                <div className="absolute top-[40%] -left-[10%] w-[500px] h-[500px] rounded-full bg-[#137fec]/5 blur-[80px]" />
            </div>

            <div className="relative z-10 flex flex-col items-center text-center max-w-md">
                {/* 404 Icon */}
                <div className="size-24 rounded-2xl bg-[#137fec]/10 flex items-center justify-center mb-8 border border-[#137fec]/20">
                    <span className="material-symbols-outlined text-[#137fec] text-5xl">
                        explore_off
                    </span>
                </div>

                {/* Error code */}
                <h1 className="text-7xl font-black text-white mb-4">404</h1>

                {/* Message */}
                <h2 className="text-2xl font-bold text-white mb-3">Page not found</h2>
                <p className="text-[#9dabb9] text-lg mb-8">
                    The page you&apos;re looking for doesn&apos;t exist or has been moved.
                </p>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <Link
                        href="/dashboard"
                        className="flex items-center justify-center gap-2 h-12 px-6 rounded-lg bg-[#137fec] text-white font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-[#137fec]/20"
                    >
                        <span className="material-symbols-outlined text-[20px]">dashboard</span>
                        Go to Dashboard
                    </Link>
                    <Link
                        href="/"
                        className="flex items-center justify-center gap-2 h-12 px-6 rounded-lg border border-[#283039] bg-[#18212b] text-white font-medium hover:bg-[#283039] transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px]">home</span>
                        Back to Home
                    </Link>
                </div>
            </div>
        </div>
    )
}
