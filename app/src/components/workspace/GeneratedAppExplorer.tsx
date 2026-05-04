"use client"

import { useEffect, useState } from "react"
import type { User } from "firebase/auth"
import { authGet } from "@/lib/authFetch"

type FileEntry = {
  name: string
  path: string
  type: "file" | "directory"
  children?: FileEntry[]
}

type FileResponse = {
  workspacePath: string
  entries: FileEntry[]
}

function FileIcon({ type }: { type: FileEntry["type"] }) {
  return (
    <span className="material-symbols-outlined text-[18px] text-[#6b7280]">
      {type === "directory" ? "folder" : "draft"}
    </span>
  )
}

function FileTree({ entries, depth = 0 }: { entries: FileEntry[]; depth?: number }) {
  return (
    <div className={depth === 0 ? "space-y-1" : "mt-1 space-y-1"}>
      {entries.map((entry) => (
        <div key={entry.path}>
          <div
            className="flex min-h-9 items-center gap-2 rounded-xl px-3 text-sm text-[#3d3d3d] transition hover:bg-[#f7f7f4]"
            style={{ paddingLeft: `${12 + depth * 18}px` }}
          >
            <FileIcon type={entry.type} />
            <span className={entry.type === "directory" ? "font-medium" : ""}>{entry.name}</span>
          </div>
          {entry.type === "directory" && entry.children?.length ? (
            <FileTree entries={entry.children} depth={depth + 1} />
          ) : null}
        </div>
      ))}
    </div>
  )
}

export default function GeneratedAppExplorer({
  projectId,
  user,
  fallbackPath,
}: {
  projectId: string
  user: User
  fallbackPath: string
}) {
  const [data, setData] = useState<FileResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let canceled = false

    async function loadFiles() {
      try {
        setLoading(true)
        setError(null)
        const response = await authGet(`/api/projects/${projectId}/files`, user)
        const nextData = await response.json()
        if (!response.ok) throw new Error(nextData.error || "Failed to load generated app files")
        if (!canceled) setData(nextData)
      } catch (err) {
        if (!canceled) setError(err instanceof Error ? err.message : "Failed to load generated app files")
      } finally {
        if (!canceled) setLoading(false)
      }
    }

    void loadFiles()

    return () => {
      canceled = true
    }
  }, [projectId, user])

  const workspacePath = data?.workspacePath || fallbackPath

  return (
    <div className="px-4 pb-8 pt-6 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-5xl overflow-hidden rounded-[1.65rem] border border-[#eceae4] bg-white text-[#111111] shadow-[0_28px_70px_-56px_rgba(17,17,17,0.35)]">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#eceae4] px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6b7280]">Code</p>
            <h1 className="mt-2 text-xl font-semibold tracking-tight">App folder</h1>
            <p className="mt-2 break-all font-mono text-xs leading-5 text-[#6b7280]">{workspacePath}</p>
          </div>
          <span className="rounded-full bg-[#f4f4f1] px-3 py-1.5 text-xs font-medium text-[#5f5f5d]">
            {data?.entries.length || 0} items
          </span>
        </div>

        <div className="min-h-[460px] bg-[#fbfbfa] p-3">
          {loading ? (
            <div className="flex h-80 items-center justify-center text-sm text-[#6b7280]">Loading files...</div>
          ) : error ? (
            <div className="flex h-80 items-center justify-center px-6 text-center text-sm text-[#6b7280]">
              {error}
            </div>
          ) : data?.entries.length ? (
            <FileTree entries={data.entries} />
          ) : (
            <div className="flex h-80 items-center justify-center text-sm text-[#6b7280]">
              No generated files found yet.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
