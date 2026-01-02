"use client"

import { useAuth } from "@/components/Providers"
import { useRouter } from "next/navigation"
import { useEffect, useState, useMemo } from "react"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import CreateProjectModal from "@/components/CreateProjectModal"

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

    // Redirect if not logged in
    useEffect(() => {
        if (!loading && !user) {
            router.push("/auth")
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

    // Calculate stats from real data
    const stats = useMemo(() => {
        const total = projects.length
        const processing = projects.filter(p => p.latestBlueprint?.status === "draft").length
        const completed = projects.filter(p => p.latestBlueprint?.status === "locked" || p.latestBlueprint?.status === "approved").length
        return { total, processing, completed }
    }, [projects])

    // Filter projects by search
    const filteredProjects = useMemo(() => {
        if (!searchQuery) return projects
        return projects.filter(p =>
            p.projectName.toLowerCase().includes(searchQuery.toLowerCase())
        )
    }, [projects, searchQuery])

    const handleSignOut = async () => {
        await signOut(auth)
        router.push("/auth")
    }

    const handleOpenCreateModal = () => {
        setShowCreateModal(true)
    }

    const handleCloseCreateModal = () => {
        setShowCreateModal(false)
    }

    const handleCreateProject = async (projectName: string, description?: string) => {
        if (!user) return

        const token = await user.getIdToken()
        const res = await fetch("/api/projects", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ projectName, description }),
        })

        if (!res.ok) {
            const errorData = await res.json()
            throw new Error(errorData.error || "Failed to create project")
        }

        const newProject = await res.json()
        router.push(`/chat/${newProject.id}`)
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
                    <span className="material-symbols-outlined text-[#137fec] animate-spin text-3xl">hourglass_empty</span>
                    {/* <span className="text-white">Loading...</span> */}
                </div>
            </div>
        )
    }

    if (!user) return null

    const displayName = user.displayName?.split(" ")[0] || "Builder"

    return (
        <div className="flex h-screen w-full flex-row bg-[#101922] text-white overflow-hidden">
            {/* Sidebar Navigation */}
            <aside className="flex w-72 flex-col justify-between border-r border-[#283039] bg-[#0d141c] p-4 shrink-0 overflow-y-auto">
                <div className="flex flex-col gap-8">
                    {/* Branding */}
                    <div className="flex items-center gap-3 px-2">
                        <div className="flex items-center justify-center rounded-lg bg-[#137fec]/10 p-2">
                            <div className="size-8 rounded bg-gradient-to-br from-blue-400 to-[#137fec] flex items-center justify-center">
                                <span className="material-symbols-outlined text-white text-[20px]">hourglass_top</span>
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-lg font-bold leading-tight tracking-tight text-white">Flowro AI</h1>
                            <p className="text-xs font-medium text-[#9dabb9]">Unified Blueprints</p>
                        </div>
                    </div>

                    {/* Navigation Links */}
                    <nav className="flex flex-col gap-2">
                        <a className="flex items-center gap-3 rounded-lg bg-[#137fec] px-3 py-2.5 transition-colors" href="#">
                            <span className="material-symbols-outlined text-white">dashboard</span>
                            <p className="text-sm font-medium leading-normal text-white">Dashboard</p>
                        </a>
                        <a className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[#9dabb9] transition-colors hover:bg-white/5 group" href="#">
                            <span className="material-symbols-outlined text-slate-400 transition-colors group-hover:text-white">folder_open</span>
                            <p className="text-sm font-medium leading-normal transition-colors group-hover:text-white">My UBPs</p>
                        </a>
                        <a className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[#9dabb9] transition-colors hover:bg-white/5 group" href="#">
                            <span className="material-symbols-outlined text-slate-400 transition-colors group-hover:text-white">settings</span>
                            <p className="text-sm font-medium leading-normal transition-colors group-hover:text-white">Settings</p>
                        </a>
                    </nav>
                </div>

                {/* Bottom Actions */}
                <div className="flex flex-col gap-2 border-t border-[#283039] pt-4">
                    <div className="flex items-center gap-3 px-3 py-2 text-[#9dabb9]">
                        <div className="size-8 rounded-full bg-gradient-to-br from-blue-400 to-[#137fec] flex items-center justify-center text-white text-sm font-bold">
                            {displayName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm truncate">{user.email}</span>
                    </div>
                    <button
                        onClick={handleSignOut}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[#9dabb9] transition-colors hover:bg-white/5 group"
                    >
                        <span className="material-symbols-outlined text-slate-400 transition-colors group-hover:text-red-400">logout</span>
                        <p className="text-sm font-medium leading-normal transition-colors group-hover:text-red-400">Logout</p>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex flex-1 flex-col overflow-y-auto bg-[#101922]">
                <div className="mx-auto flex w-full max-w-7xl flex-col p-6 lg:px-10">
                    {/* Page Heading & CTA */}
                    <header className="flex flex-wrap items-end justify-between gap-4 py-6">
                        <div className="flex flex-col gap-1">
                            <h1 className="text-3xl font-black leading-tight tracking-tight text-white lg:text-4xl">
                                Welcome back, {displayName}
                            </h1>
                            <p className="text-base text-[#9dabb9]">Let's build a unified blueprint today.</p>
                        </div>
                        <button
                            onClick={handleOpenCreateModal}
                            className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#137fec] px-6 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#101922]"
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
                                <p className="text-sm font-medium text-[#9dabb9]">Completed</p>
                                <span className="material-symbols-outlined text-green-500">check_circle</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <p className="text-3xl font-bold text-white">{stats.completed}</p>
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
                            <div className="flex items-center justify-center py-12">
                                <span className="material-symbols-outlined text-[#137fec] animate-spin text-3xl">hourglass_empty</span>
                                {/* <span className="ml-3 text-[#9dabb9]">Loading projects...</span> */}
                            </div>
                        ) : filteredProjects.length === 0 ? (
                            <div className="bg-[#18212b] border border-[#283039] rounded-xl p-12 text-center">
                                <span className="material-symbols-outlined text-[#9dabb9] text-5xl mb-4 block">folder_open</span>
                                <p className="text-[#9dabb9] mb-6">
                                    {searchQuery ? "No projects match your search" : "No projects yet"}
                                </p>
                                {!searchQuery && (
                                    <button
                                        onClick={handleOpenCreateModal}
                                        className="bg-[#137fec] hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-lg shadow-blue-500/20"
                                    >
                                        Create Your First Project
                                    </button>
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
                                                <button className="rounded p-1 text-slate-400 hover:bg-white/10">
                                                    <span className="material-symbols-outlined text-[20px]">more_vert</span>
                                                </button>
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
        </div>
    )
}
