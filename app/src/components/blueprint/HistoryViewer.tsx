/**
 * HistoryViewer Component
 * 
 * Displays blueprint version history with ability to:
 * - View past versions with timestamps
 * - Compare current and previous versions
 * - Restore a previous version
 * 
 * @see /Docs/Architecture-Simplification-Plan.md Phase 4.7
 */

"use client"

import { useState } from "react"
import type { BlueprintSnapshot } from "./types"

// Re-export types for external consumers
export type { BlueprintSnapshot } from "./types"

export interface HistoryViewerProps {
  isOpen: boolean
  onClose: () => void
  history: BlueprintSnapshot[]
  isLoading: boolean
  currentVersion: string
  onRestore?: (snapshot: BlueprintSnapshot) => void
}

// =============================================================================
// Main Component
// =============================================================================

export default function HistoryViewer({
  isOpen,
  onClose,
  history,
  isLoading,
  currentVersion,
  onRestore,
}: HistoryViewerProps) {
  const [selectedSnapshot, setSelectedSnapshot] = useState<BlueprintSnapshot | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)

  if (!isOpen) return null

  const handleRestore = async () => {
    if (!selectedSnapshot || !onRestore) return

    setIsRestoring(true)
    try {
      await onRestore(selectedSnapshot)
      setSelectedSnapshot(null)
    } finally {
      setIsRestoring(false)
    }
  }

  const formatDate = (timestamp: string): string => {
    try {
      const date = new Date(timestamp)
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return timestamp
    }
  }

  const getRelativeTime = (timestamp: string): string => {
    try {
      const date = new Date(timestamp)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)

      if (diffMins < 1) return "Just now"
      if (diffMins < 60) return `${diffMins}m ago`
      if (diffHours < 24) return `${diffHours}h ago`
      if (diffDays < 7) return `${diffDays}d ago`
      return formatDate(timestamp)
    } catch {
      return timestamp
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-[#101922] border-l border-[#283039] z-[56] flex flex-col overflow-hidden animate-slide-in-right">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#283039] bg-[#0d141c]/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-[#137fec]/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-[#137fec]">history</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Version History</h2>
              <p className="text-xs text-[#9dabb9]">
                Current: v{currentVersion} • {history.length} version{history.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#9dabb9] hover:text-white hover:bg-white/5 p-2 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <span className="material-symbols-outlined text-[#137fec] text-3xl animate-spin mb-4">
                progress_activity
              </span>
              <p className="text-[#9dabb9] text-sm">Loading history...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <div className="size-16 rounded-2xl bg-[#283039]/50 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-[#9dabb9] text-3xl">folder_open</span>
              </div>
              <h3 className="text-white font-semibold mb-2">No Version History</h3>
              <p className="text-[#9dabb9] text-sm max-w-xs">
                Version snapshots are automatically created when changes are made to the blueprint.
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {history.map((snapshot, index) => (
                <HistoryItem
                  key={snapshot.id}
                  snapshot={snapshot}
                  isSelected={selectedSnapshot?.id === snapshot.id}
                  isCurrent={index === 0}
                  relativeTime={getRelativeTime(snapshot.timestamp)}
                  formattedDate={formatDate(snapshot.timestamp)}
                  onClick={() => setSelectedSnapshot(snapshot)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Selected Version Preview */}
        {selectedSnapshot && (
          <div className="border-t border-[#283039] bg-[#0d141c] p-4 shrink-0">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded font-bold">
                    v{selectedSnapshot.version}
                  </span>
                  <span className="text-[#9dabb9] text-xs">
                    {formatDate(selectedSnapshot.timestamp)}
                  </span>
                </div>
                {selectedSnapshot.changeDescription && (
                  <p className="text-white text-sm truncate">
                    {selectedSnapshot.changeDescription}
                  </p>
                )}
              </div>
            </div>

            {/* Quick Preview of Changes */}
            <div className="bg-[#111418] rounded-lg p-3 mb-4 max-h-32 overflow-y-auto custom-scrollbar">
              <p className="text-[#9dabb9] text-xs font-medium uppercase tracking-wider mb-2">
                Snapshot Preview
              </p>
              <div className="space-y-1 text-xs">
                {selectedSnapshot.contentSnapshot.productVision?.description && (
                  <div className="flex items-start gap-2">
                    <span className="text-[#137fec] font-medium shrink-0">Vision:</span>
                    <span className="text-[#d0d6dc] truncate">
                      {selectedSnapshot.contentSnapshot.productVision.description.slice(0, 100)}
                      {selectedSnapshot.contentSnapshot.productVision.description.length > 100 && "..."}
                    </span>
                  </div>
                )}
                {selectedSnapshot.contentSnapshot.behaviors && selectedSnapshot.contentSnapshot.behaviors.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[#137fec] font-medium">Behaviors:</span>
                    <span className="text-[#d0d6dc]">{selectedSnapshot.contentSnapshot.behaviors.length} defined</span>
                  </div>
                )}
                {selectedSnapshot.contentSnapshot.phases && selectedSnapshot.contentSnapshot.phases.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[#137fec] font-medium">Phases:</span>
                    <span className="text-[#d0d6dc]">{selectedSnapshot.contentSnapshot.phases.length} phases</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedSnapshot(null)}
                className="flex-1 px-4 py-2 text-sm font-medium text-[#d0d6dc] hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                Cancel
              </button>
              {onRestore && (
                <button
                  onClick={handleRestore}
                  disabled={isRestoring}
                  className="flex-1 bg-[#137fec] hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {isRestoring ? (
                    <>
                      <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                      Restoring...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">restore</span>
                      Restore This Version
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Styles */}
        <style jsx global>{`
          @keyframes slide-in-right {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
          .animate-slide-in-right {
            animation: slide-in-right 0.2s ease-out;
          }
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: #111418;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #283039;
            border-radius: 3px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #3d4a56;
          }
        `}</style>
      </div>
    </>
  )
}

// =============================================================================
// History Item Component
// =============================================================================

function HistoryItem({
  snapshot,
  isSelected,
  isCurrent,
  relativeTime,
  formattedDate,
  onClick,
}: {
  snapshot: BlueprintSnapshot
  isSelected: boolean
  isCurrent: boolean
  relativeTime: string
  formattedDate: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-all ${
        isSelected
          ? "bg-[#137fec]/10 border-[#137fec]/30"
          : "bg-[#1f2937]/50 border-[#283039] hover:bg-[#1f2937] hover:border-[#374151]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded font-bold ${
              isCurrent
                ? "bg-green-500/20 text-green-400"
                : "bg-blue-500/20 text-blue-400"
            }`}>
              v{snapshot.version}
            </span>
            {isCurrent && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 font-medium uppercase tracking-wider">
                Latest
              </span>
            )}
          </div>
          {snapshot.changeDescription ? (
            <p className="text-white text-sm font-medium truncate mb-1">
              {snapshot.changeDescription}
            </p>
          ) : (
            <p className="text-[#9dabb9] text-sm italic mb-1">
              Blueprint snapshot
            </p>
          )}
          <div className="flex items-center gap-2 text-xs text-[#9dabb9]">
            <span className="material-symbols-outlined text-[14px]">schedule</span>
            <span title={formattedDate}>{relativeTime}</span>
          </div>
        </div>
        <div className={`shrink-0 transition-transform ${isSelected ? "rotate-90" : ""}`}>
          <span className="material-symbols-outlined text-[#9dabb9] text-[20px]">
            chevron_right
          </span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#283039]/50">
        {snapshot.contentSnapshot.behaviors && snapshot.contentSnapshot.behaviors.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-[#9dabb9]">
            <span className="material-symbols-outlined text-[14px]">bolt</span>
            <span>{snapshot.contentSnapshot.behaviors.length} behaviors</span>
          </div>
        )}
        {snapshot.contentSnapshot.phases && snapshot.contentSnapshot.phases.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-[#9dabb9]">
            <span className="material-symbols-outlined text-[14px]">stairs</span>
            <span>{snapshot.contentSnapshot.phases.length} phases</span>
          </div>
        )}
        {snapshot.contentSnapshot.actors && snapshot.contentSnapshot.actors.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-[#9dabb9]">
            <span className="material-symbols-outlined text-[14px]">group</span>
            <span>{snapshot.contentSnapshot.actors.length} actors</span>
          </div>
        )}
      </div>
    </button>
  )
}
