"use client"

import { useState, useRef, useEffect } from "react"


interface Workspace {
    id: string
    name: string
    icon?: string
}

interface WorkspaceSidebarProps {
    workspaces: Workspace[]
    selectedWorkspaceId: string
    onSelectWorkspace: (id: string) => void
    isMobileMenuOpen: boolean
    setIsMobileMenuOpen: (isOpen: boolean) => void
}

export default function WorkspaceSidebar({
    workspaces,
    selectedWorkspaceId,
    onSelectWorkspace,
    isMobileMenuOpen,
    setIsMobileMenuOpen
}: WorkspaceSidebarProps) {
    const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)


    const selectedWorkspace = workspaces.find(w => w.id === selectedWorkspaceId) || workspaces[0]

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsWorkspaceDropdownOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    return (
        <>
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
                ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:static
            `}>
                <div className="flex flex-col gap-6">
                    {/* Workspace Switcher (Top Left) */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setIsWorkspaceDropdownOpen(!isWorkspaceDropdownOpen)}
                            className="flex w-full items-center justify-between rounded-lg bg-[#18212b] p-2 hover:bg-[#283039] transition-colors border border-[#283039]"
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex size-8 items-center justify-center rounded-md bg-[#137fec] text-white font-bold">
                                    {selectedWorkspace?.name.substring(0, 1).toUpperCase() || "F"}
                                </div>
                                <div className="flex flex-col items-start">
                                    <span className="text-sm font-bold text-white truncate max-w-[140px]">
                                        {selectedWorkspace?.name || "Flowro AI"}
                                    </span>
                                    <span className="text-[10px] uppercase tracking-wider text-[#9dabb9]">Workspace</span>
                                </div>
                            </div>
                            <span className="material-symbols-outlined text-[#9dabb9] text-sm">unfold_more</span>
                        </button>

                        {/* Dropdown Menu */}
                        {isWorkspaceDropdownOpen && (
                            <div className="absolute left-0 top-full mt-2 w-full origin-top-right rounded-lg border border-[#283039] bg-[#18212b] shadow-xl z-50 overflow-hidden">
                                <div className="p-1">
                                    {workspaces.map((ws) => (
                                        <button
                                            key={ws.id}
                                            onClick={() => {
                                                onSelectWorkspace(ws.id)
                                                setIsWorkspaceDropdownOpen(false)
                                            }}
                                            className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${selectedWorkspaceId === ws.id
                                                ? "bg-[#137fec]/10 text-[#137fec]"
                                                : "text-[#9dabb9] hover:bg-white/5 hover:text-white"
                                                }`}
                                        >
                                            <div className="size-2 rounded-full bg-current" />
                                            {ws.name}
                                        </button>
                                    ))}
                                    <div className="my-1 h-px bg-[#283039]" />
                                    <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-[#9dabb9] hover:bg-white/5 hover:text-white">
                                        <span className="material-symbols-outlined text-[16px]">add</span>
                                        Create Workspace
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Navigation - Linear Style: Teams List */}
                    <div className="flex flex-col gap-1 px-1">
                        <p className="text-xs font-semibold uppercase tracking-wider text-[#57606a] mb-2 px-2">
                            Your Teams
                        </p>

                        {/* 
                           Simplification Note:
                           We removed the explicit "Teams" data layer for simplicity, but we can visualize
                           Project Groups or Departments here in the future.
                           For now, we list a default "General" team or just "Projects".
                        */}

                        <div className="flex flex-col gap-1">
                            {/* In Linear, this is the "Team" you click to filter projects. 
                                Since we flattened "Teams", we treat the Workspace as the only container.
                                So we just show "Projects" or "My Issues" styled links. 
                            */}

                            <a
                                className="flex items-center gap-3 rounded-md bg-[#137fec]/10 px-3 py-2 transition-colors"
                                href="#"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                <span className="material-symbols-outlined text-[#137fec] text-[20px]">folder_open</span>
                                <p className="text-sm font-medium leading-normal text-[#137fec]">Projects</p>
                            </a>

                            <a
                                className="flex items-center gap-3 rounded-md px-3 py-2 text-[#9dabb9] transition-colors hover:bg-white/5 hover:text-white group"
                                href="#"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                <span className="material-symbols-outlined text-[20px] transition-colors group-hover:text-white">check_circle</span>
                                <p className="text-sm font-medium leading-normal transition-colors group-hover:text-white">My Tasks</p>
                            </a>
                        </div>
                    </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex flex-col gap-2">
                    <a
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[#9dabb9] transition-colors hover:bg-white/5 group"
                        href="/settings"
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        <span className="material-symbols-outlined text-slate-400 text-[20px] transition-colors group-hover:text-white">settings</span>
                        <p className="text-sm font-medium leading-normal transition-colors group-hover:text-white">Settings</p>
                    </a>
                </div>
            </aside>
        </>
    )
}
