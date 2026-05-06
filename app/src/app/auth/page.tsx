"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/Providers"
import { signInWithGoogle, signIn, signUp, resetPassword, resendVerificationEmail } from "./actions"
import { analytics } from "@/lib/analytics"
import { LoadingSpinner } from "@/components/ui/LoadingSpinner"

type AuthMode = "signIn" | "signUp" | "resetPassword" | "verifyEmail"

export default function AuthPage() {
    const router = useRouter()
    const { user, loading } = useAuth()

    // Form state
    const [authMode, setAuthMode] = useState<AuthMode>("signIn")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [displayName, setDisplayName] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isGoogleLoading, setIsGoogleLoading] = useState(false)
    const [resendCooldown, setResendCooldown] = useState(0)
    const [pendingEmail, setPendingEmail] = useState<string | null>(null)

    // Redirect if already logged in and email is verified
    useEffect(() => {
        if (user && !loading) {
            if (user.emailVerified) {
                router.replace("/app")
            } else {
                // Show verification pending screen
                setAuthMode("verifyEmail")
                setPendingEmail(user.email)
            }
        }
    }, [user, loading, router])

    // Cooldown timer for resend button
    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
            return () => clearTimeout(timer)
        }
    }, [resendCooldown])

    const handleGoogleSignIn = async () => {
        try {
            setError(null)
            setSuccessMessage(null)
            setIsGoogleLoading(true)
            analytics.signupStarted("google")
            await signInWithGoogle()
            analytics.signupCompleted("google")
            router.push("/app")
        } catch {
            setError("Failed to sign in with Google. Please try again.")
        } finally {
            setIsGoogleLoading(false)
        }
    }

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setSuccessMessage(null)
        setIsSubmitting(true)

        try {
            if (authMode === "resetPassword") {
                await resetPassword(email)
                setSuccessMessage("Password reset email sent! Check your inbox.")
                setEmail("")
            } else if (authMode === "signUp") {
                analytics.signupStarted("email")
                await signUp(email, password, displayName || undefined)
                analytics.signupCompleted("email")
                // Switch to verification pending mode
                setPendingEmail(email)
                setAuthMode("verifyEmail")
                setResendCooldown(60) // 60 second cooldown before resend
            } else {
                analytics.signupStarted("email")
                await signIn(email, password)
                analytics.signupCompleted("email")
                router.push("/app")
            }
        } catch (error: unknown) {
            if (error instanceof Error) {
                // Handle specific Firebase auth errors
                if (error.message.includes("auth/invalid-email")) {
                    setError("Invalid email address.")
                } else if (error.message.includes("auth/user-not-found")) {
                    setError("No account found with this email.")
                } else if (error.message.includes("auth/wrong-password")) {
                    setError("Incorrect password.")
                } else if (error.message.includes("auth/invalid-credential")) {
                    setError("Invalid email or password.")
                } else if (error.message.includes("auth/email-already-in-use")) {
                    setError("An account with this email already exists.")
                } else if (error.message.includes("auth/weak-password")) {
                    setError("Password should be at least 6 characters.")
                } else if (error.message.includes("auth/too-many-requests")) {
                    setError("Too many failed attempts. Please try again later.")
                } else {
                    setError(authMode === "signUp" ? "Failed to create account." :
                        authMode === "resetPassword" ? "Failed to send reset email." :
                            "Failed to sign in.")
                }
            } else {
                setError("An unexpected error occurred.")
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    const switchMode = (newMode: AuthMode) => {
        setAuthMode(newMode)
        setError(null)
        setSuccessMessage(null)
    }

    const handleResendVerification = async () => {
        if (resendCooldown > 0) return
        setError(null)
        setSuccessMessage(null)
        setIsSubmitting(true)

        try {
            await resendVerificationEmail()
            setSuccessMessage("Verification email sent! Check your inbox.")
            setResendCooldown(60)
        } catch {
            setError("Failed to resend verification email. Please try again.")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleRefreshVerification = () => {
        // Reload the page to check if email is now verified
        window.location.reload()
    }

    const getHeading = () => {
        switch (authMode) {
            case "signUp": return "Create your account"
            case "resetPassword": return "Reset your password"
            case "verifyEmail": return "Verify your email"
            default: return "Welcome back"
        }
    }

    // Show loading state while checking auth
    if (loading) {
        return (
            <div className="min-h-screen bg-[#101922] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 animate-pulse">
                    <span className="material-symbols-outlined text-[#137fec] animate-spin text-4xl">hourglass_top</span>
                    <span className="text-slate-400 text-sm">Loading...</span>
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
                            <h1 className="text-2xl font-bold leading-tight tracking-tight text-white">
                                {getHeading()}
                            </h1>
                            <p className="text-slate-400 text-sm font-normal leading-normal mt-2">
                                {authMode === "resetPassword"
                                    ? "Enter your email and we'll send you a reset link."
                                    : authMode === "verifyEmail"
                                        ? "We've sent a verification link to your email."
                                        : "Turn your docs into a Unified Blueprint."}
                            </p>
                        </div>
                    </div>

                    {/* Auth Card */}
                    <div className="flex flex-col gap-5 p-6 md:p-8 bg-[#1e293b]/50 backdrop-blur-sm rounded-xl border border-slate-700/50 shadow-xl">
                        {/* Success Message */}
                        {successMessage && (
                            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
                                {successMessage}
                            </div>
                        )}

                        {/* Error Message */}
                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Google Button (hide on reset password and verifyEmail) */}
                        {authMode !== "resetPassword" && authMode !== "verifyEmail" && (
                            <>
                                <button
                                    onClick={handleGoogleSignIn}
                                    disabled={isSubmitting || isGoogleLoading}
                                    className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-5 bg-[#283039] hover:bg-[#343e49] text-white gap-3 text-base font-bold leading-normal transition-colors border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isGoogleLoading ? (
                                        <>
                                            <LoadingSpinner size="sm" color="#ffffff" />
                                            <span className="truncate">Signing in...</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                                                <g transform="matrix(1, 0, 0, 1, 27.009001, -39.23856)">
                                                    <path d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" fill="#4285F4"></path>
                                                    <path d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" fill="#34A853"></path>
                                                    <path d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" fill="#FBBC05"></path>
                                                    <path d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" fill="#EA4335"></path>
                                                </g>
                                            </svg>
                                            <span className="truncate">{authMode === "signUp" ? "Sign up with Google" : "Sign in with Google"}</span>
                                        </>
                                    )}
                                </button>

                                {/* Divider */}
                                <div className="relative flex py-1 items-center">
                                    <div className="flex-grow border-t border-slate-700"></div>
                                    <span className="flex-shrink-0 mx-4 text-slate-400 text-sm">Or continue with email</span>
                                    <div className="flex-grow border-t border-slate-700"></div>
                                </div>
                            </>
                        )}

                        {/* Email Verification Pending UI */}
                        {authMode === "verifyEmail" && (
                            <div className="flex flex-col items-center gap-6 py-4">
                                {/* Email Icon */}
                                <div className="w-16 h-16 rounded-full bg-[#137fec]/20 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[#137fec]" style={{ fontSize: '32px' }}>mark_email_unread</span>
                                </div>

                                {/* Email Display */}
                                <div className="text-center">
                                    <p className="text-white font-medium">{pendingEmail}</p>
                                    <p className="text-slate-400 text-sm mt-2">Click the link in the email to verify your account.</p>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col gap-3 w-full">
                                    <button
                                        onClick={handleRefreshVerification}
                                        className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-5 bg-[#137fec] hover:bg-[#137fec]/90 text-white gap-2 text-base font-bold leading-normal tracking-wide transition-all shadow-lg shadow-[#137fec]/20"
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>refresh</span>
                                        <span>I&apos;ve Verified My Email</span>
                                    </button>

                                    <button
                                        onClick={handleResendVerification}
                                        disabled={resendCooldown > 0 || isSubmitting}
                                        className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-5 bg-[#283039] hover:bg-[#343e49] text-white gap-2 text-base font-medium leading-normal transition-colors border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <LoadingSpinner size="sm" color="#ffffff" />
                                                <span>Sending...</span>
                                            </>
                                        ) : resendCooldown > 0 ? (
                                            <span>Resend in {resendCooldown}s</span>
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>send</span>
                                                <span>Resend Verification Email</span>
                                            </>
                                        )}
                                    </button>
                                </div>

                                {/* Tip */}
                                <p className="text-slate-500 text-xs text-center">
                                    Don&apos;t see the email? Check your spam folder.
                                </p>
                            </div>
                        )}

                        {/* Email/Password Form (hide on verifyEmail) */}
                        {authMode !== "verifyEmail" && (
                            <form onSubmit={handleEmailAuth} className="flex flex-col gap-4">
                                {/* Display Name Field (Sign Up only) */}
                                {authMode === "signUp" && (
                                    <div className="flex flex-col gap-2">
                                        <label className="text-white text-sm font-medium leading-normal">Name</label>
                                        <div className="relative flex w-full flex-1 items-stretch rounded-lg">
                                            <input
                                                type="text"
                                                value={displayName}
                                                onChange={(e) => setDisplayName(e.target.value)}
                                                className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-0 focus:ring-2 focus:ring-[#137fec]/50 focus:border-[#137fec] border border-slate-600 bg-[#101922] h-12 placeholder:text-slate-500 px-4 text-base font-normal leading-normal transition-all"
                                                placeholder="Your name"
                                                maxLength={100}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Email Field */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-white text-sm font-medium leading-normal">Email</label>
                                    <div className="relative flex w-full flex-1 items-stretch rounded-lg">
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-0 focus:ring-2 focus:ring-[#137fec]/50 focus:border-[#137fec] border border-slate-600 bg-[#101922] h-12 placeholder:text-slate-500 px-4 text-base font-normal leading-normal transition-all"
                                            placeholder="name@company.com"
                                            maxLength={320}
                                        />
                                    </div>
                                </div>

                                {/* Password Field (hide on reset) */}
                                {authMode !== "resetPassword" && (
                                    <div className="flex flex-col gap-2">
                                        <label className="text-white text-sm font-medium leading-normal">Password</label>
                                        <div className="relative flex w-full flex-1 items-stretch rounded-lg">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                                minLength={6}
                                                className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-0 focus:ring-2 focus:ring-[#137fec]/50 focus:border-[#137fec] border border-slate-600 bg-[#101922] h-12 placeholder:text-slate-500 px-4 pr-12 text-base font-normal leading-normal transition-all"
                                                placeholder="••••••••"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-0 top-0 h-full w-12 flex items-center justify-center text-slate-400 cursor-pointer hover:text-[#137fec] transition-colors"
                                            >
                                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                                                    {showPassword ? "visibility" : "visibility_off"}
                                                </span>
                                            </button>
                                        </div>
                                        {authMode === "signIn" && (
                                            <div className="flex justify-end mt-1">
                                                <button
                                                    type="button"
                                                    onClick={() => switchMode("resetPassword")}
                                                    className="text-sm font-medium text-[#137fec] hover:text-[#137fec]/80 transition-colors"
                                                >
                                                    Forgot password?
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-5 bg-[#137fec] hover:bg-[#137fec]/90 text-white gap-2 text-base font-bold leading-normal tracking-wide transition-all shadow-lg shadow-[#137fec]/20 disabled:opacity-50 disabled:cursor-not-allowed mt-1"
                                >
                                    <span className="truncate">
                                        {isSubmitting
                                            ? "Please wait..."
                                            : authMode === "signUp" ? "Create Account"
                                                : authMode === "resetPassword" ? "Send Reset Link"
                                                    : "Sign In"
                                        }
                                    </span>
                                </button>
                            </form>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex justify-center mt-8">
                        <p className="text-slate-400 text-sm">
                            {authMode === "signUp" ? (
                                <>
                                    Already have an account?
                                    <button
                                        onClick={() => switchMode("signIn")}
                                        className="font-medium text-[#137fec] hover:text-[#137fec]/80 ml-1 transition-colors"
                                    >
                                        Sign in
                                    </button>
                                </>
                            ) : authMode === "resetPassword" ? (
                                <>
                                    Remember your password?
                                    <button
                                        onClick={() => switchMode("signIn")}
                                        className="font-medium text-[#137fec] hover:text-[#137fec]/80 ml-1 transition-colors"
                                    >
                                        Sign in
                                    </button>
                                </>
                            ) : (
                                <>
                                    Don&apos;t have an account?
                                    <button
                                        onClick={() => switchMode("signUp")}
                                        className="font-medium text-[#137fec] hover:text-[#137fec]/80 ml-1 transition-colors"
                                    >
                                        Sign up
                                    </button>
                                </>
                            )}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
