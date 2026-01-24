"use client"

import { useEffect, useRef, useState } from "react"

interface AIFloatingMenuProps {
    position: { x: number; y: number } | null
    selectedText: string
    onClose: () => void
    onEnhance: () => void
    onAIEdit?: (instruction: string) => void
}

export default function AIFloatingMenu({
    position,
    selectedText,
    onClose,
    onEnhance,
    onAIEdit,
}: AIFloatingMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null)
    const [isInputOpen, setIsInputOpen] = useState(false)
    const [instruction, setInstruction] = useState("")

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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (instruction.trim() && onAIEdit) {
            onAIEdit(instruction)
            onClose()
        }
    }

    if (!position) return null

    return (
        <div
            ref={menuRef}
            className="fixed z-[100] animate-in fade-in zoom-in duration-300"
            style={{
                left: position.x,
                top: position.y,
                transform: "translate(-50%, -100%)",
                marginTop: "-12px",
            }}
        >
            <div className="flex items-center gap-1 bg-[#0d141c] p-1 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-[#283039]">
                {/* Enhance Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        onEnhance()
                    }}
                    className="group flex items-center gap-2 hover:bg-[#137fec] text-white px-3 py-1.5 rounded-lg transition-all duration-200"
                    title="Auto-enhance selected text"
                >
                    <span className="material-symbols-outlined text-[#137fec] text-[16px] group-hover:text-white transition-colors">
                        auto_fix_high
                    </span>
                    <span className="text-[12px] font-bold tracking-wide">
                        Enhance
                    </span>
                </button>

                {/* Vertical Divider */}
                <div className="w-px h-4 bg-[#283039] mx-1" />

                {/* Ask Flowro Button / Input */}
                {isInputOpen ? (
                    <form onSubmit={handleSubmit} className="flex items-center">
                        <input
                            autoFocus
                            type="text"
                            value={instruction}
                            onChange={(e) => setInstruction(e.target.value)}
                            placeholder="Ask Flowro to edit..."
                            className="bg-transparent text-white text-xs placeholder-[#9dabb9] outline-none px-2 w-48"
                            onKeyDown={(e) => {
                                if (e.key === "Escape") {
                                    setIsInputOpen(false)
                                    setInstruction("")
                                }
                                e.stopPropagation()
                            }}
                        />
                        <button
                            type="submit"
                            className="text-[#137fec] hover:text-white hover:bg-[#137fec] p-1 rounded-md transition-colors"
                        >
                            <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
                        </button>
                    </form>
                ) : (
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            setIsInputOpen(true)
                        }}
                        className="group flex items-center gap-2 hover:bg-[#137fec] text-white px-3 py-1.5 rounded-lg transition-all duration-200"
                    >
                        <span className="material-symbols-outlined text-[#137fec] text-[16px] group-hover:text-white transition-colors">
                            edit_note
                        </span>
                        <span className="text-[12px] font-bold tracking-wide">
                            Ask AI
                        </span>
                    </button>
                )}
            </div>

            {/* Pointer */}
            <div className="absolute top-[calc(100%-1px)] left-1/2 -translate-x-1/2 w-3 h-3 bg-[#0d141c] border-b border-r border-[#283039] rotate-45" />
        </div>
    )
}
