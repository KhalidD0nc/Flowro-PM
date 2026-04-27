"use client"

import { useAuth } from "@/components/Providers"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"

export default function SettingsPage() {
    const { user, loading } = useAuth()
    const router = useRouter()
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [isSigningOut, setIsSigningOut] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deleteConfirmation, setDeleteConfirmation] = useState("")
    const [isDeleting, setIsDeleting] = useState(false)
    const [deleteError, setDeleteError] = useState<string | null>(null)

    // Redirect if not logged in
    useEffect(() => {
        if (!loading && !user && !isSigningOut) {
            router.push("/auth")
        }
    }, [user, loading, router, isSigningOut])

    const handleSignOut = async () => {
        try {
            setIsSigningOut(true)
            await signOut(auth)
            router.push("/")
        } catch (error) {
            console.error("Error signing out:", error)
            setIsSigningOut(false)
        }
    }

    const handleDeleteAccount = async () => {
        if (deleteConfirmation !== "DELETE") return

        setIsDeleting(true)
        setDeleteError(null)

        try {
            const token = await user?.getIdToken()
            const res = await fetch("/api/account", {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || "Failed to delete account")
            }

            // Sign out and redirect to home
            await signOut(auth)
            router.push("/")
        } catch (error) {
            console.error("Error deleting account:", error)
            setDeleteError(error instanceof Error ? error.message : "Failed to delete account")
            setIsDeleting(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#101922] flex items-center justify-center">
                <div className="flex items-center gap-3">
                    <img src="/logo.svg" alt="Loading" className="size-8 animate-spin" />
                </div>
            </div>
        )
    }

    if (!user) return null

    const displayName = user.displayName?.split(" ")[0] || "Builder"

    return (
        <div className="flex h-screen w-full flex-row bg-[#101922] text-white overflow-hidden">
            {/* Mobile Menu Backdrop */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar Navigation */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 flex w-72 flex-col justify-between border-r border-[#283039] bg-[#0d141c] p-4 transition-transform duration-300 ease-in-out
                ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
            `}>
                <div className="flex flex-col gap-8">
                    {/* Branding */}
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                            <img src="/logo.svg" alt="Flowro Logo" className="size-8" />
                            <div className="flex flex-col">
                                <h1 className="text-lg font-bold leading-tight tracking-tight text-white">Flowro AI</h1>
                                <p className="text-xs font-medium text-[#9dabb9]">Unified Blueprints</p>
                            </div>
                        </div>
                        {/* Close Button */}
                        <button
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="text-[#9dabb9] hover:text-white"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    {/* Navigation Links */}
                    <nav className="flex flex-col gap-2">
                        <Link
                            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[#9dabb9] transition-colors hover:bg-white/5 group"
                            href="/app"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            <span className="material-symbols-outlined text-slate-400 transition-colors group-hover:text-white">home</span>
                            <p className="text-sm font-medium leading-normal transition-colors group-hover:text-white">Command Center</p>
                        </Link>
                        <a
                            className="flex items-center gap-3 rounded-lg bg-[#137fec] px-3 py-2.5 transition-colors"
                            href="#"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            <span className="material-symbols-outlined text-white">settings</span>
                            <p className="text-sm font-medium leading-normal text-white">Settings</p>
                        </a>
                    </nav>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex flex-1 flex-col overflow-y-auto bg-[#101922]">
                <div className="mx-auto flex w-full max-w-4xl flex-col p-4 md:p-6 lg:px-10">
                    {/* Page Heading */}
                    <header className="flex flex-col gap-6 py-6">
                        <div className="flex items-center gap-4">
                            {/* Hamburger Menu */}
                            <button
                                onClick={() => setIsMobileMenuOpen(true)}
                                className="flex size-10 items-center justify-center rounded-lg border border-[#283039] bg-[#18212b] text-[#9dabb9] hover:text-white transition-colors"
                            >
                                <span className="material-symbols-outlined">menu</span>
                            </button>

                            {/* Logo */}
                            <img src="/logo.png" alt="Flowro" className="h-8 w-auto" />

                            <div className="flex flex-col gap-1">
                                <h1 className="text-2xl font-black leading-tight tracking-tight text-white lg:text-4xl">
                                    Settings
                                </h1>
                                <p className="text-sm lg:text-base text-[#9dabb9]">Manage your account and preferences</p>
                            </div>
                        </div>
                    </header>

                    {/* Settings Sections */}
                    <div className="flex flex-col gap-6">
                        {/* Account Section */}
                        <section className="rounded-xl border border-[#283039] bg-[#18212b] p-6">
                            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[#137fec]">person</span>
                                Account
                            </h2>

                            <div className="flex flex-col gap-6">
                                {/* Profile Info */}
                                <div className="flex items-center gap-4 pb-6 border-b border-[#283039]">
                                    <div className="size-16 rounded-full bg-gradient-to-br from-blue-400 to-[#137fec] flex items-center justify-center text-white text-2xl font-bold shrink-0">
                                        {displayName.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <p className="text-lg font-semibold text-white">{user.displayName || displayName}</p>
                                        <p className="text-sm text-[#9dabb9]">{user.email}</p>
                                    </div>
                                </div>

                                {/* Email Field */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-medium text-[#9dabb9]">Email Address</label>
                                    <div className="flex items-center gap-3 rounded-lg border border-[#283039] bg-[#11161d] px-4 py-3">
                                        <span className="material-symbols-outlined text-[#9dabb9]">mail</span>
                                        <span className="text-white">{user.email}</span>
                                    </div>
                                </div>

                                {/* Display Name Field */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-medium text-[#9dabb9]">Display Name</label>
                                    <div className="flex items-center gap-3 rounded-lg border border-[#283039] bg-[#11161d] px-4 py-3">
                                        <span className="material-symbols-outlined text-[#9dabb9]">badge</span>
                                        <span className="text-white">{user.displayName || "Not set"}</span>
                                    </div>
                                </div>

                                {/* Account Created */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-medium text-[#9dabb9]">Account Created</label>
                                    <div className="flex items-center gap-3 rounded-lg border border-[#283039] bg-[#11161d] px-4 py-3">
                                        <span className="material-symbols-outlined text-[#9dabb9]">calendar_today</span>
                                        <span className="text-white">
                                            {user.metadata.creationTime
                                                ? new Date(user.metadata.creationTime).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })
                                                : "Unknown"
                                            }
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Session Section */}
                        <section className="rounded-xl border border-[#283039] bg-[#18212b] p-6">
                            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[#9dabb9]">logout</span>
                                Session
                            </h2>

                            <p className="text-sm text-[#9dabb9] mb-6">
                                Sign out of your account on this device.
                            </p>

                            <button
                                onClick={handleSignOut}
                                className="flex items-center justify-center gap-2 rounded-lg border border-[#283039] bg-[#11161d] px-6 py-3 text-white font-medium transition-all hover:bg-[#1e2936]"
                            >
                                <span className="material-symbols-outlined">logout</span>
                                Sign Out
                            </button>
                        </section>

                        {/* Danger Zone */}
                        <section className="rounded-xl border border-red-500/30 bg-[#18212b] p-6">
                            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-red-400">warning</span>
                                Danger Zone
                            </h2>

                            <p className="text-sm text-[#9dabb9] mb-6">
                                Permanently delete your account and all associated data. This action cannot be undone.
                            </p>

                            <button
                                onClick={() => setShowDeleteModal(true)}
                                className="flex items-center justify-center gap-2 rounded-lg border border-red-500/50 bg-red-500/10 px-6 py-3 text-red-400 font-medium transition-all hover:bg-red-500/20 hover:border-red-500"
                            >
                                <span className="material-symbols-outlined">delete_forever</span>
                                Delete Account
                            </button>
                        </section>
                    </div>
                </div>
            </main>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-[#18212b] border border-[#283039] rounded-xl p-6 max-w-md w-full shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="size-12 rounded-full bg-red-500/20 flex items-center justify-center">
                                <span className="material-symbols-outlined text-red-400" style={{ fontSize: '24px' }}>warning</span>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">Delete Account</h3>
                                <p className="text-sm text-[#9dabb9]">This action is permanent</p>
                            </div>
                        </div>

                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
                            <p className="text-sm text-red-300">
                                All your projects, blueprints, and data will be permanently deleted.
                                This cannot be undone.
                            </p>
                        </div>

                        <div className="mb-6">
                            <label className="text-sm font-medium text-[#9dabb9] mb-2 block">
                                Type <span className="text-red-400 font-bold">DELETE</span> to confirm
                            </label>
                            <input
                                type="text"
                                value={deleteConfirmation}
                                onChange={(e) => setDeleteConfirmation(e.target.value)}
                                placeholder="DELETE"
                                className="w-full rounded-lg border border-[#283039] bg-[#11161d] px-4 py-3 text-white placeholder-[#9dabb9]/50 focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none"
                            />
                        </div>

                        {deleteError && (
                            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                                <p className="text-sm text-red-400">{deleteError}</p>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false)
                                    setDeleteConfirmation("")
                                    setDeleteError(null)
                                }}
                                disabled={isDeleting}
                                className="flex-1 rounded-lg border border-[#283039] bg-[#11161d] px-4 py-3 text-white font-medium transition-all hover:bg-[#1e2936] disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                disabled={deleteConfirmation !== "DELETE" || isDeleting}
                                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-3 text-white font-medium transition-all hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isDeleting ? (
                                    <>
                                        <span className="material-symbols-outlined animate-spin" style={{ fontSize: '20px' }}>sync</span>
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>delete_forever</span>
                                        Delete Forever
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
