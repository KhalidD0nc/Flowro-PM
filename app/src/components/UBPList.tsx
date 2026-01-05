"use client"

import { Blueprint } from "@/app/api/blueprints/service"

interface UBPListProps {
    blueprints: Blueprint[]
    onSelect: (blueprint: Blueprint) => void
    selectedId?: string
}

export default function UBPList({ blueprints, onSelect, selectedId }: UBPListProps) {
    if (blueprints.length === 0) {
        return (
            <div className="p-4 text-center">
                <p className="text-[#9dabb9] text-sm">No blueprints yet</p>
            </div>
        )
    }

    const statusColors = {
        draft: "bg-yellow-500/10 border-yellow-500/20 text-yellow-400",
        locked: "bg-blue-500/10 border-blue-500/20 text-blue-400",
        approved: "bg-green-500/10 border-green-500/20 text-green-400",
    }

    const statusLabels = {
        draft: "Draft",
        locked: "Locked",
        approved: "Ready",
    }

    return (
        <div className="flex flex-col gap-2">
            {blueprints.map((blueprint) => (
                <button
                    key={blueprint.id}
                    onClick={() => onSelect(blueprint)}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors text-left ${selectedId === blueprint.id
                            ? "bg-[#137fec]/10 border-[#137fec]/30"
                            : "bg-[#1f2937] border-[#283039] hover:bg-[#283039]"
                        }`}
                >
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <span className="text-white font-medium text-sm">v{blueprint.version}</span>
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${statusColors[blueprint.status]}`}>
                                {statusLabels[blueprint.status]}
                            </span>
                        </div>
                        <span className="text-[#9dabb9] text-xs">
                            {new Date(blueprint.createdAt).toLocaleDateString()}
                        </span>
                    </div>
                    <span className="material-symbols-outlined text-[#9dabb9] text-[18px]">
                        chevron_right
                    </span>
                </button>
            ))}
        </div>
    )
}
