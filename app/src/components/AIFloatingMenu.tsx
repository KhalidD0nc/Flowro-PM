"use client"

import { useState, useEffect, useRef } from "react"

interface AIFloatingMenuProps {
    position: { x: number; y: number } | null
    selectedText: string
    onClose: () => void
    onSubmit: (instruction: string) => Promise<void>
}

export default function AIFloatingMenu({
    position,
    selectedText,
    onClose,
    onSubmit,
}: AIFloatingMenuProps) {
    const [instruction, setInstruction] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (position && inputRef.current) {
            inputRef.current.focus()
        }
    }, [position])

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!instruction.trim() || isSubmitting) return

        setIsSubmitting(true)
        try {
            await onSubmit(instruction)
            setInstruction("")
            onClose()
        } catch (error) {
            console.error("Failed to submit AI instruction", error)
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!position) return null

    return (
        <div
            ref={menuRef}
            className="fixed z-50 flex flex-col gap-2 bg-[#1f2937] border border-[#374151] rounded-lg shadow-xl p-2 w-[320px] animate-in fade-in zoom-in duration-200"
            style={{
                left: position.x,
                top: position.y,
                transform: "translate(-50%, -100%) marginTop: -10px", // Position above selection
            }}
        >
            <div className="flex items-center gap-2 px-1 pb-2 border-b border-[#374151] mb-2">
                <span className="material-symbols-outlined text-[#137fec] text-sm">sparkles</span>
                <span className="text-xs font-medium text-[#d0d6dc] truncate max-w-[200px]">
                    Editing: "{selectedText.substring(0, 20)}{selectedText.length > 20 ? "..." : ""}"
                </span>
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                    ref={inputRef}
                    type="text"
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    placeholder="Ask AI to change this..."
                    className="flex-1 bg-[#111418] border border-[#374151] rounded px-3 py-1.5 text-sm text-white placeholder-[#6b7280] focus:outline-none focus:border-[#137fec]"
                />
                <button
                    type="submit"
                    disabled={isSubmitting || !instruction.trim()}
                    className="bg-[#137fec] hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded px-2 py-1.5 flex items-center justify-center transition-colors"
                >
                    {isSubmitting ? (
                        <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                    ) : (
                        <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                    )}
                </button>
            </form>
        </div>
    )
}
