"use client"

import { useEffect, useRef } from "react"

interface AIFloatingMenuProps {
    position: { x: number; y: number } | null
    selectedText: string
    onClose: () => void
    onEnhance: () => void
}

export default function AIFloatingMenu({
    position,
    selectedText,
    onClose,
    onEnhance,
}: AIFloatingMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null)

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose()
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [onClose])

    if (!position) return null

    return (
        <div
            ref={menuRef}
            className="fixed z-[100] animate-in fade-in zoom-in duration-300"
            style={{
                left: position.x,
                top: position.y,
                transform: "translate(-50%, -100%)",
                marginTop: "-8px",
            }}
        >
            <button
                onClick={(e) => {
                    e.stopPropagation()
                    onEnhance()
                }}
                className="group flex items-center gap-2 bg-[#0d141c] hover:bg-[#137fec] text-white px-3 py-1.5 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-[#137fec]/30 hover:border-[#137fec] transition-all duration-300 hover:scale-105 active:scale-95"
            >
                <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-[#137fec] group-hover:text-white transition-colors"
                >
                    <path d="M12 3V4M12 20V21M4 12H3M21 12H20M18.364 5.636L17.6569 6.34315M6.34315 17.6569L5.63604 18.364M18.364 18.364L17.6569 17.6569M6.34315 6.34315L5.63604 5.636M12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-[11px] font-bold tracking-wide transition-colors">
                    Enhance
                </span>
            </button>

            {/* Minimal pointer */}
            <div className="absolute top-[calc(100%-2px)] left-1/2 -translate-x-1/2 w-2 h-2 bg-[#0d141c] border-b border-r border-[#137fec]/30 rotate-45 group-hover:bg-[#137fec] group-hover:border-[#137fec] transition-colors" />
        </div>
    )
}
