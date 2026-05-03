"use client"

import { Suspense, useEffect, useState, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { applyActionCode, getAuth } from "firebase/auth"
import app from "@/lib/firebase"

type VerificationStatus = "verifying" | "success" | "error"

function AuthActionContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const [status, setStatus] = useState<VerificationStatus>("verifying")
    const [errorMessage, setErrorMessage] = useState("")

    const handleVerifyEmail = useCallback(async (oobCode: string) => {
        try {
            const auth = getAuth(app)
            await applyActionCode(auth, oobCode)
            setStatus("success")

            // Auto-redirect to app after 2 seconds
            setTimeout(() => {
                router.push("/app")
            }, 2000)
        } catch (error: unknown) {
            setStatus("error")
            if (error instanceof Error) {
                if (error.message.includes("invalid-action-code")) {
                    setErrorMessage("This verification link has expired or already been used.")
                } else {
                    setErrorMessage("Failed to verify email. Please try again.")
                }
            } else {
                setErrorMessage("An unexpected error occurred.")
            }
        }
    }, [router])

    useEffect(() => {
        const mode = searchParams.get("mode")
        const oobCode = searchParams.get("oobCode")

        if (mode === "verifyEmail" && oobCode) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            handleVerifyEmail(oobCode)
        } else if (mode === "resetPassword") {
            // Redirect to password reset page with the code
            router.push(`/auth?mode=resetPassword&oobCode=${oobCode}`)
        } else {
            setStatus("error")
            setErrorMessage("Invalid action link")
        }
    }, [searchParams, router, handleVerifyEmail])

    return (
        <>
            {status === "verifying" && (
                <div className="flex flex-col items-center gap-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-[#137fec]/20 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[#137fec] animate-spin" style={{ fontSize: '32px' }}>sync</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white mb-2">Verifying your email...</h1>
                        <p className="text-slate-400">Please wait a moment.</p>
                    </div>
                </div>
            )}

            {status === "success" && (
                <div className="flex flex-col items-center gap-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                        <span className="material-symbols-outlined text-green-400" style={{ fontSize: '32px' }}>check_circle</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white mb-2">Email Verified!</h1>
                        <p className="text-slate-400 mb-4">Your account is now active.</p>
                        <p className="text-sm text-slate-500">Redirecting to dashboard...</p>
                    </div>
                    <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-[#137fec]" style={{ animation: 'progress 2s ease-in-out forwards' }}></div>
                    </div>
                </div>
            )}

            {status === "error" && (
                <div className="flex flex-col items-center gap-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                        <span className="material-symbols-outlined text-red-400" style={{ fontSize: '32px' }}>error</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white mb-2">Verification Failed</h1>
                        <p className="text-slate-400 mb-4">{errorMessage}</p>
                    </div>
                    <button
                        onClick={() => router.push("/auth")}
                        className="flex items-center justify-center gap-2 bg-[#137fec] hover:bg-[#137fec]/90 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>arrow_back</span>
                        Back to Sign In
                    </button>
                </div>
            )}
        </>
    )
}

function LoadingState() {
    return (
        <div className="flex flex-col items-center gap-6 text-center">
            <div className="w-16 h-16 rounded-full bg-[#137fec]/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#137fec] animate-spin" style={{ fontSize: '32px' }}>sync</span>
            </div>
            <div>
                <h1 className="text-2xl font-bold text-white mb-2">Loading...</h1>
                <p className="text-slate-400">Please wait a moment.</p>
            </div>
        </div>
    )
}

export default function AuthActionPage() {
    return (
        <div className="min-h-screen bg-[#101922] flex items-center justify-center px-4">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] rounded-full bg-[#137fec]/10 blur-[100px]"></div>
                <div className="absolute top-[40%] -left-[10%] w-[500px] h-[500px] rounded-full bg-[#137fec]/5 blur-[80px]"></div>
            </div>

            <div className="relative z-10 max-w-md w-full">
                {/* Logo */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    <span className="material-symbols-outlined text-[#137fec]" style={{ fontSize: '32px' }}>hourglass_top</span>
                    <span className="text-xl font-bold tracking-tight text-white">Flowro AI</span>
                </div>

                {/* Card */}
                <div className="bg-[#1e293b]/50 backdrop-blur-sm rounded-xl border border-slate-700/50 shadow-xl p-8">
                    <Suspense fallback={<LoadingState />}>
                        <AuthActionContent />
                    </Suspense>
                </div>
            </div>

            {/* Progress bar animation */}
            <style jsx>{`
                @keyframes progress {
                    from { width: 0%; }
                    to { width: 100%; }
                }
            `}</style>
        </div>
    )
}
