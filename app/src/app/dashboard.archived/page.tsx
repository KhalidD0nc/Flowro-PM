"use client"

import { useAuth } from "@/components/Providers"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useEffect, useState, useMemo } from "react"
import CreateProjectModal from "@/components/CreateProjectModal"
import RenameProjectModal from "@/components/RenameProjectModal"
import DeleteProjectModal from "@/components/DeleteProjectModal"
import { SkeletonCardGrid, SkeletonStat } from "@/components/ui/Skeleton"
import { analytics } from "@/lib/analytics"

interface Project {
    id: string
    projectName: string
    chatHistory: { role: string; content: string; timestamp: string }[]
    createdAt: string
    updatedAt: string
    latestBlueprint?: {
        id: string
        version: string
        status: string
    }
}

export default function DashboardPage() {
    const { user, loading } = useAuth()
    const router = useRouter()
    const [projects, setProjects] = useState<Project[]>([])
    const [loadingProjects, setLoadingProjects] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [totalSavedVersions, setTotalSavedVersions] = useState(0)

    // Project Actions State
    const [activeProject, setActiveProject] = useState<Project | null>(null)
    const [showRenameModal, setShowRenameModal] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [openMenuId, setOpenMenuId] = useState<string | null>(null)
    const [isRenaming, setIsRenaming] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)


    // Redirect if not logged in or email not verified
    useEffect(() => {
        if (!loading && !user) {
            router.push("/auth")
        } else if (!loading && user && !user.emailVerified) {
            // Redirect to auth page to verify email
            router.push("/auth?verify=true")
        }
    }, [user, loading, router])

    // Fetch projects
    useEffect(() => {
        async function fetchProjects() {
            if (!user) return

            try {
                const token = await user.getIdToken()
                const res = await fetch("/api/projects", {
                    headers: { Authorization: `Bearer ${token}` },
                })
                const data = await res.json()
                setProjects(data.projects || [])
                setTotalSavedVersions(data.totalSavedVersions || 0)
            } catch (error) {
                console.error("Error fetching projects:", error)
            } finally {
                setLoadingProjects(false)
            }
        }



        if (user) {
            fetchProjects()
        }
    }, [user])

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (openMenuId && !(e.target as Element).closest('.project-menu-trigger') && !(e.target as Element).closest('.project-menu-dropdown')) {
                setOpenMenuId(null)
            }
        }
        document.addEventListener('click', handleClickOutside)
        return () => document.removeEventListener('click', handleClickOutside)
    }, [openMenuId])

    // Calculate stats from real data
    const stats = useMemo(() => {
        const total = projects.length
        const processing = projects.filter(p => p.latestBlueprint?.status === "draft").length
        return { total, processing, savedVersions: totalSavedVersions }
    }, [projects, totalSavedVersions])

    // Filter projects by search
    const filteredProjects = useMemo(() => {
        if (!searchQuery) return projects
        return projects.filter(p =>
            p.projectName.toLowerCase().includes(searchQuery.toLowerCase())
        )
    }, [projects, searchQuery])

    const handleOpenCreateModal = () => {
        setShowCreateModal(true)
    }

    const handleCloseCreateModal = () => {
        setShowCreateModal(false)
    }

    const handleCreateProject = async (initialPrompt: string) => {
        if (!user) return

        const token = await user.getIdToken()
        const res = await fetch("/api/projects", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ initialPrompt }),
        })

        if (!res.ok) {
            const errorData = await res.json()
            throw new Error(errorData.error || "Failed to create project")
        }

        const newProject = await res.json()

        // Track project creation
        analytics.projectCreated(newProject.id)

        setShowCreateModal(false)
        router.push(`/chat/${newProject.id}`)
    }

    const handleRenameProject = async (newName: string) => {
        if (!activeProject || !user) return

        setIsRenaming(true)
        try {
            const token = await user.getIdToken()
            const res = await fetch(`/api/projects/${activeProject.id}`, {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ projectName: newName }),
            })

            if (!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || "Failed to rename project")
            }

            // Update local state
            setProjects(prev => prev.map(p =>
                p.id === activeProject.id ? { ...p, projectName: newName } : p
            ))

            setShowRenameModal(false)
            setActiveProject(null)
        } catch (error) {
            console.error("Error renaming project:", error)
            throw error
        } finally {
            setIsRenaming(false)
        }
    }

    const handleDeleteProject = async () => {
        if (!activeProject || !user) return

        setIsDeleting(true)
        try {
            const token = await user.getIdToken()
            const res = await fetch(`/api/projects/${activeProject.id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            })

            if (!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || "Failed to delete project")
            }

            // Update local state
            setProjects(prev => prev.filter(p => p.id !== activeProject.id))

            setShowDeleteModal(false)
            setActiveProject(null)
        } catch (error) {
            console.error("Error deleting project:", error)
            throw error // Let the modal handle the error display
        } finally {
            setIsDeleting(false)
        }
    }

    const toggleMenu = (e: React.MouseEvent, projectId: string) => {
        e.stopPropagation() // Prevent navigation
        setOpenMenuId(openMenuId === projectId ? null : projectId)
    }

    const openRenameModal = (e: React.MouseEvent, project: Project) => {
        e.stopPropagation()
        setOpenMenuId(null)
        setActiveProject(project)
        setShowRenameModal(true)
    }

    const openDeleteModal = (e: React.MouseEvent, project: Project) => {
        e.stopPropagation()
        setOpenMenuId(null)
        setActiveProject(project)
        setShowDeleteModal(true)
    }

    const getStatusColor = (status?: string) => {
        switch (status) {
            case "locked":
            case "approved":
                return { bg: "bg-green-500/10", dot: "bg-green-500", text: "text-green-400" }
            case "draft":
                return { bg: "bg-blue-500/10", dot: "bg-blue-500 animate-pulse", text: "text-blue-400" }
            default:
                return { bg: "bg-slate-700/50", dot: "bg-slate-500", text: "text-slate-300" }
        }
    }

    const getIconByIndex = (index: number) => {
        const icons = ["folder", "security", "api", "pie_chart", "shopping_cart", "code"]
        const colors = [
            "bg-purple-500/10 text-purple-400",
            "bg-blue-500/10 text-blue-400",
            "bg-orange-500/10 text-orange-400",
            "bg-pink-500/10 text-pink-400",
            "bg-green-500/10 text-green-400",
            "bg-cyan-500/10 text-cyan-400"
        ]
        return {
            icon: icons[index % icons.length],
            colorClass: colors[index % colors.length]
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
                        <a
                            className="flex items-center gap-3 rounded-lg bg-[#137fec] px-3 py-2.5 transition-colors"
                            href="#"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            <span className="material-symbols-outlined text-white">dashboard</span>
                            <p className="text-sm font-medium leading-normal text-white">Dashboard</p>
                        </a>
                        <a
                            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[#9dabb9] transition-colors hover:bg-white/5 group"
                            href="/settings"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            <span className="material-symbols-outlined text-slate-400 transition-colors group-hover:text-white">settings</span>
                            <p className="text-sm font-medium leading-normal transition-colors group-hover:text-white">Settings</p>
                        </a>
                    </nav>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex flex-1 flex-col overflow-y-auto bg-[#101922]">
                <div className="mx-auto flex w-full max-w-7xl flex-col p-4 md:p-6 lg:px-10">
                    {/* Page Heading & CTA */}
                    <header className="flex flex-col gap-6 py-6 lg:flex-row lg:items-end lg:justify-between">
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
                                    Welcome back, {displayName}
                                </h1>
                                <p className="text-sm lg:text-base text-[#9dabb9]">Let&apos;s build a unified blueprint today.</p>
                            </div>
                        </div>

                        <button
                            onClick={handleOpenCreateModal}
                            className="flex h-12 w-full lg:w-auto cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#137fec] px-6 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#101922]"
                        >
                            <span className="material-symbols-outlined text-[20px]">add</span>
                            <span>Create New Project</span>
                        </button>
                    </header>

                    {/* Search & Filters */}
                    <div className="mb-8 mt-2">
                        <label className="relative flex h-12 w-full max-w-2xl items-center rounded-lg border border-[#283039] bg-[#18212b] shadow-sm focus-within:border-[#137fec] focus-within:ring-1 focus-within:ring-[#137fec]">
                            <div className="flex items-center justify-center pl-4 text-[#9dabb9]">
                                <span className="material-symbols-outlined">search</span>
                            </div>
                            <input
                                className="h-full w-full border-none bg-transparent px-3 text-base font-normal text-white placeholder-[#9dabb9] focus:ring-0 focus:outline-none"
                                placeholder="Search blueprints by name, tag, or ID..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <div className="pr-2">
                                <button className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white">
                                    <span className="material-symbols-outlined text-[20px]">filter_list</span>
                                </button>
                            </div>
                        </label>
                    </div>

                    {/* Stats Row */}
                    <section className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div className="flex flex-col gap-2 rounded-xl border border-[#283039] bg-[#18212b] p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-[#9dabb9]">Total UBPs</p>
                                <span className="material-symbols-outlined text-[#137fec]">folder</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <p className="text-3xl font-bold text-white">{stats.total}</p>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 rounded-xl border border-[#283039] bg-[#18212b] p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-[#9dabb9]">Processing</p>
                                <span className="material-symbols-outlined text-blue-400 animate-spin">sync</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <p className="text-3xl font-bold text-white">{stats.processing}</p>
                                {stats.processing > 0 && (
                                    <span className="text-xs text-slate-500">Processing now</span>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 rounded-xl border border-[#283039] bg-[#18212b] p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-[#9dabb9]">Saved Versions</p>
                                <span className="material-symbols-outlined text-purple-400">save</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <p className="text-3xl font-bold text-white">{stats.savedVersions}</p>
                            </div>
                        </div>
                    </section>

                    {/* Recent Projects Section */}
                    <section className="flex flex-col gap-4">
                        <div className="flex items-center justify-between px-1">
                            <h2 className="text-xl font-bold text-white">Recent Projects</h2>
                            {projects.length > 0 && (
                                <a className="text-sm font-medium text-[#137fec] hover:text-blue-400" href="#">View All</a>
                            )}
                        </div>

                        {/* Projects Grid */}
                        {loadingProjects ? (
                            <SkeletonCardGrid count={6} />
                        ) : filteredProjects.length === 0 ? (
                            <div className="bg-gradient-to-br from-[#18212b] to-[#0d141c] border border-[#283039] rounded-2xl p-8 lg:p-12">
                                {searchQuery ? (
                                    <div className="text-center">
                                        <span className="material-symbols-outlined text-[#9dabb9] text-5xl mb-4 block">search_off</span>
                                        <p className="text-[#9dabb9] text-lg">No projects match your search</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col lg:flex-row items-center gap-8">
                                        {/* Left side - Illustration */}
                                        <div className="flex-shrink-0">
                                            <div className="relative">
                                                <div className="absolute inset-0 bg-[#137fec]/10 blur-3xl rounded-full" />
                                                <div className="relative size-32 lg:size-40 rounded-2xl bg-gradient-to-br from-[#137fec]/20 to-[#137fec]/5 border border-[#137fec]/20 flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-[#137fec] text-6xl lg:text-7xl">
                                                        architecture
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right side - Content */}
                                        <div className="flex-1 text-center lg:text-left">
                                            <h2 className="text-2xl lg:text-3xl font-bold text-white mb-3">
                                                Create your first blueprint
                                            </h2>
                                            <p className="text-[#9dabb9] text-lg mb-6 max-w-lg">
                                                Transform your product ideas into structured, agent-ready specifications.
                                                Start by describing what you want to build.
                                            </p>

                                            {/* Example prompts */}
                                            <div className="flex flex-wrap gap-2 mb-6 justify-center lg:justify-start">
                                                <span className="px-3 py-1.5 bg-[#283039]/50 border border-[#283039] rounded-full text-[#9dabb9] text-sm">
                                                    &quot;A SaaS for team collaboration&quot;
                                                </span>
                                                <span className="px-3 py-1.5 bg-[#283039]/50 border border-[#283039] rounded-full text-[#9dabb9] text-sm">
                                                    &quot;Mobile fitness app&quot;
                                                </span>
                                                <span className="px-3 py-1.5 bg-[#283039]/50 border border-[#283039] rounded-full text-[#9dabb9] text-sm">
                                                    &quot;E-commerce platform&quot;
                                                </span>
                                            </div>

                                            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                                                <button
                                                    onClick={handleOpenCreateModal}
                                                    className="flex items-center justify-center gap-2 bg-[#137fec] hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-lg shadow-blue-500/20"
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">add</span>
                                                    Create Your First Project
                                                </button>
                                                <Link
                                                    href="/demo"
                                                    className="flex items-center justify-center gap-2 bg-[#283039] hover:bg-[#3d4a56] text-white font-medium py-3 px-6 rounded-lg transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">science</span>
                                                    View Demo
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {filteredProjects.map((project, index) => {
                                    const status = project.latestBlueprint?.status || "draft"
                                    const statusColors = getStatusColor(status)
                                    const iconConfig = getIconByIndex(index)
                                    return (
                                        <div
                                            key={project.id}
                                            onClick={() => router.push(`/chat/${project.id}`)}
                                            className="group relative flex flex-col gap-4 rounded-xl border border-[#283039] bg-[#18212b] p-5 shadow-sm transition-all hover:border-[#137fec]/50 hover:shadow-md cursor-pointer"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`flex size-10 items-center justify-center rounded-lg ${iconConfig.colorClass}`}>
                                                        <span className="material-symbols-outlined">{iconConfig.icon}</span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <h3 className="text-base font-bold text-white">{project.projectName}</h3>
                                                        <p className="text-xs text-[#9dabb9]">v{project.latestBlueprint?.version || "0.1"}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Context Menu */}
                                            <div className="relative">
                                                <button
                                                    onClick={(e) => toggleMenu(e, project.id)}
                                                    className="project-menu-trigger rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">more_vert</span>
                                                </button>

                                                {/* Dropdown */}
                                                {openMenuId === project.id && (
                                                    <div className="project-menu-dropdown absolute right-0 top-8 z-10 w-48 rounded-lg border border-[#283039] bg-[#18212b] py-1 shadow-xl">
                                                        <button
                                                            onClick={(e) => openRenameModal(e, project)}
                                                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[#9dabb9] hover:bg-[#283039] hover:text-white text-left"
                                                        >
                                                            <span className="material-symbols-outlined text-[18px]">edit</span>
                                                            Rename
                                                        </button>
                                                        <button
                                                            onClick={(e) => openDeleteModal(e, project)}
                                                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-[#283039] hover:text-red-300 text-left"
                                                        >
                                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                                            Delete
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Project preview - show chat history count */}
                                            <div className="h-20 w-full rounded-lg bg-[#11161d] overflow-hidden relative">
                                                <div className="p-3">
                                                    <div className="text-xs text-slate-500 mb-2">{project.chatHistory?.length || 0} messages</div>
                                                    <div className="h-2 w-2/3 rounded-full bg-slate-700 mb-2"></div>
                                                    <div className="h-2 w-1/2 rounded-full bg-slate-700"></div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-2">
                                                <div className={`flex items-center gap-2 rounded-full ${statusColors.bg} px-2.5 py-1`}>
                                                    <div className={`size-1.5 rounded-full ${statusColors.dot}`}></div>
                                                    <span className={`text-xs font-semibold ${statusColors.text}`}>
                                                        {status.charAt(0).toUpperCase() + status.slice(1)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </section>
                </div>
            </main>

            {/* Create Project Modal */}
            <CreateProjectModal
                isOpen={showCreateModal}
                onClose={handleCloseCreateModal}
                onCreateProject={handleCreateProject}
            />

            {/* Rename Project Modal */}
            {activeProject && (
                <RenameProjectModal
                    isOpen={showRenameModal}
                    onClose={() => setShowRenameModal(false)}
                    onRename={handleRenameProject}
                    currentName={activeProject.projectName}
                    isRenaming={isRenaming}
                />
            )}

            {/* Delete Project Modal */}
            {activeProject && (
                <DeleteProjectModal
                    isOpen={showDeleteModal}
                    onClose={() => setShowDeleteModal(false)}
                    onDelete={handleDeleteProject}
                    projectName={activeProject.projectName}
                    isDeleting={isDeleting}
                />
            )}
        </div>
    )
}
