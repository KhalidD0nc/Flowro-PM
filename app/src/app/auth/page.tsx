"use client"

import { useRouter } from "next/navigation"
import { useAuth } from "@/components/Providers"
import { useEffect } from "react"
import { signInWithGoogle } from "./actions"

export default function AuthPage() {
    const router = useRouter()
    const { user, loading } = useAuth()

    // Redirect if already logged in
    useEffect(() => {
        if (user && !loading) {
            router.push("/dashboard")
        }
    }, [user, loading, router])

    const handleGoogleSignIn = async () => {
        try {
            await signInWithGoogle()
            router.push("/dashboard")
        } catch (error) {
            console.error("Sign in error:", error)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#101922] flex items-center justify-center">
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#137fec] animate-spin text-3xl">hourglass_empty</span>
                    <span className="text-white">Loading...</span>
                </div>
            </div>
        )
    }

    return (
        <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-[#101922] bg-grid-pattern">
            {/* Abstract Background Graphic */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] rounded-full bg-[#137fec]/10 blur-[100px]"></div>
                <div className="absolute top-[40%] -left-[10%] w-[500px] h-[500px] rounded-full bg-[#137fec]/5 blur-[80px]"></div>
            </div>

            <div className="flex h-full grow flex-col z-10 justify-center items-center px-4 py-8">
                <div className="flex flex-col w-full max-w-[440px]">
                    {/* Logo & Header */}
                    <div className="flex flex-col items-center gap-4 mb-8">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#137fec]" style={{ fontSize: '32px' }}>hourglass_top</span>
                            <span className="text-xl font-bold tracking-tight text-white">Flowro AI</span>
                        </div>
                        <div className="text-center">
                            <h1 className="text-2xl font-bold leading-tight tracking-tight text-white">Welcome back</h1>
                            <p className="text-slate-400 text-sm font-normal leading-normal mt-2">Turn your docs into a Unified Blueprint.</p>
                        </div>
                    </div>

                    {/* Auth Card */}
                    <div className="flex flex-col gap-5 p-6 md:p-8 bg-[#1e293b]/50 backdrop-blur-sm rounded-xl border border-slate-700/50 shadow-xl">
                        {/* Google Button */}
                        <button
                            onClick={handleGoogleSignIn}
                            className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-5 bg-[#283039] hover:bg-[#343e49] text-white gap-3 text-base font-bold leading-normal transition-colors border border-slate-700"
                        >
                            <svg height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                                <g transform="matrix(1, 0, 0, 1, 27.009001, -39.23856)">
                                    <path d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" fill="#4285F4"></path>
                                    <path d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" fill="#34A853"></path>
                                    <path d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" fill="#FBBC05"></path>
                                    <path d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" fill="#EA4335"></path>
                                </g>
                            </svg>
                            <span className="truncate">Sign in with Google</span>
                        </button>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-center mt-8">
                        <p className="text-slate-400 text-sm">
                            By signing in, you agree to our Terms of Service
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
