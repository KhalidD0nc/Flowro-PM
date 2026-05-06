"use client"

import { useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
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

type FileContent = {
  name: string
  path: string
  content: string
  size: number
}

const OPEN_BY_DEFAULT = new Set(["src", "app", "pages", "components", "hooks", "lib", "public", ".lovable", "supabase"])
const KEYWORDS = new Set([
  "as",
  "async",
  "await",
  "boolean",
  "const",
  "export",
  "false",
  "from",
  "function",
  "if",
  "import",
  "interface",
  "let",
  "null",
  "return",
  "string",
  "true",
  "type",
  "undefined",
])

function getFileIcon(entry: Pick<FileEntry, "name" | "type">) {
  if (entry.type === "directory") return "keyboard_arrow_right"
  const ext = entry.name.split(".").pop()?.toLowerCase()
  if (ext === "css") return "language"
  if (ext === "md") return "article"
  if (ext === "json") return "data_object"
  if (ext === "svg" || ext === "ico" || ext === "png" || ext === "jpg") return "image"
  return "draft"
}

function flattenFiles(entries: FileEntry[]): FileEntry[] {
  return entries.flatMap((entry) => entry.type === "file" ? [entry] : flattenFiles(entry.children || []))
}

function collectDefaultOpenDirs(entries: FileEntry[]) {
  const open = new Set<string>()
  const walk = (items: FileEntry[]) => {
    items.forEach((entry) => {
      if (entry.type !== "directory") return
      if (OPEN_BY_DEFAULT.has(entry.name) || entry.path.split("/").length <= 2) {
        open.add(entry.path)
      }
      walk(entry.children || [])
    })
  }
  walk(entries)
  return open
}

function tokenClass(token: string) {
  if (/^\/\/.*/.test(token)) return "text-[#6f7d76]"
  if (/^(['\"`]).*\1$/.test(token)) return "text-[#8fb7ff]"
  if (/^\d+$/.test(token)) return "text-[#f4a261]"
  if (KEYWORDS.has(token)) return "text-[#d58cff]"
  if (/^[A-Z][A-Za-z0-9_]*$/.test(token)) return "text-[#c6c6c2]"
  return "text-[#b8b8b5]"
}

function highlightLine(line: string) {
  const parts = line.split(/(\/\/.*|["'`][^"'`]*["'`]|\b\d+\b|\b[A-Za-z_][A-Za-z0-9_]*\b)/g)
  return parts.map((part, index) => part ? <span key={`${part}-${index}`} className={tokenClass(part)}>{part}</span> : null)
}

function FileTree({
  entries,
  selectedPath,
  openDirs,
  onToggleDir,
  onSelectFile,
  depth = 0,
}: {
  entries: FileEntry[]
  selectedPath: string | null
  openDirs: Set<string>
  onToggleDir: (path: string) => void
  onSelectFile: (entry: FileEntry) => void
  depth?: number
}) {
  return (
    <div className={depth === 0 ? "space-y-1" : "space-y-1"}>
      {entries.map((entry) => {
        const isOpen = openDirs.has(entry.path)
        const isSelected = selectedPath === entry.path

        if (entry.type === "directory") {
          return (
            <div key={entry.path}>
              <button
                type="button"
                onClick={() => onToggleDir(entry.path)}
                className="flex min-h-9 w-full items-center gap-2 rounded-[0.55rem] px-2 text-left text-[15px] text-[#d8d8d5] transition hover:bg-white/[0.055]"
                style={{ paddingLeft: `${10 + depth * 18}px` }}
              >
                <span className={`material-symbols-outlined text-[18px] text-[#e8e8e4] transition ${isOpen ? "rotate-90" : ""}`}>{getFileIcon(entry)}</span>
                <span className="truncate font-medium">{entry.name}</span>
              </button>
              {isOpen ? (
                <FileTree
                  entries={entry.children || []}
                  selectedPath={selectedPath}
                  openDirs={openDirs}
                  onToggleDir={onToggleDir}
                  onSelectFile={onSelectFile}
                  depth={depth + 1}
                />
              ) : null}
            </div>
          )
        }

        return (
          <button
            key={entry.path}
            type="button"
            onClick={() => onSelectFile(entry)}
            className={`flex min-h-10 w-full items-center gap-2 rounded-[0.55rem] border px-2 text-left text-[15px] transition ${
              isSelected
                ? "border-[#8bb7ff] bg-[#263957] text-[#f3f7ff] shadow-[0_0_0_1px_rgba(139,183,255,0.55)]"
                : "border-transparent text-[#d8d8d5] hover:bg-white/[0.055]"
            }`}
            style={{ paddingLeft: `${28 + depth * 18}px` }}
          >
            <span className="material-symbols-outlined text-[18px] text-[#d8d8d5]">{getFileIcon(entry)}</span>
            <span className="truncate">{entry.name}</span>
          </button>
        )
      })}
    </div>
  )
}

function CodeLines({ content }: { content: string }) {
  const lines = content.split("\n")

  return (
    <div className="min-w-max font-mono text-[14px] leading-6">
      {lines.map((line, index) => (
        <div key={index} className="grid grid-cols-[3.5rem_minmax(0,1fr)]">
          <span className="select-none border-r border-white/[0.06] bg-[#242624] pr-4 text-right text-[#777b77]">{index + 1}</span>
          <pre className="px-4 text-[#b8b8b5]"><code>{line ? highlightLine(line) : " "}</code></pre>
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
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [openDirs, setOpenDirs] = useState<Set<string>>(new Set())
  const [fileContent, setFileContent] = useState<FileContent | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingFile, setLoadingFile] = useState(false)
  const [search, setSearch] = useState("")

  useEffect(() => {
    let canceled = false

    async function loadFiles() {
      try {
        setLoading(true)
        setError(null)
        const response = await authGet(`/api/projects/${projectId}/files`, user)
        const nextData = await response.json()
        if (!response.ok) throw new Error(nextData.error || "Failed to load generated app files")
        if (canceled) return

        const entries = nextData.entries || []
        const firstFile = flattenFiles(entries)[0]
        setData(nextData)
        setOpenDirs(collectDefaultOpenDirs(entries))
        if (firstFile) setSelectedPath(firstFile.path)
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

  useEffect(() => {
    if (!selectedPath) return
    let canceled = false
    const pathToLoad = selectedPath

    async function loadFileContent() {
      try {
        setLoadingFile(true)
        setFileError(null)
        const response = await authGet(`/api/projects/${projectId}/files?path=${encodeURIComponent(pathToLoad)}`, user)
        const nextData = await response.json()
        if (!response.ok) throw new Error(nextData.error || "Failed to load file")
        if (!canceled) setFileContent(nextData.file)
      } catch (err) {
        if (!canceled) {
          setFileContent(null)
          setFileError(err instanceof Error ? err.message : "Failed to load file")
        }
      } finally {
        if (!canceled) setLoadingFile(false)
      }
    }

    void loadFileContent()

    return () => {
      canceled = true
    }
  }, [projectId, selectedPath, user])

  const workspacePath = data?.workspacePath || fallbackPath
  const allFiles = useMemo(() => flattenFiles(data?.entries || []), [data?.entries])
  const filteredEntries = useMemo(() => {
    if (!search.trim()) return data?.entries || []
    const needle = search.trim().toLowerCase()
    return allFiles.filter((entry) => entry.path.toLowerCase().includes(needle))
  }, [allFiles, data?.entries, search])
  const selectedFile = allFiles.find((entry) => entry.path === selectedPath) || null
  const tabs = [selectedFile, ...allFiles.filter((entry) => entry.path !== selectedPath).slice(0, 2)].filter(Boolean) as FileEntry[]

  const renderContent = (): ReactNode => {
    if (loading) return <div className="flex h-full items-center justify-center text-sm text-[#a8a8a5]">Loading files...</div>
    if (error) return <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[#a8a8a5]">{error}</div>
    if (!data?.entries.length) return <div className="flex h-full items-center justify-center text-sm text-[#a8a8a5]">No generated files found yet.</div>
    if (loadingFile) return <div className="flex h-full items-center justify-center text-sm text-[#a8a8a5]">Loading file...</div>
    if (fileError) return <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[#a8a8a5]">{fileError}</div>
    if (!fileContent) return <div className="flex h-full items-center justify-center text-sm text-[#a8a8a5]">Select a file to preview.</div>
    return <CodeLines content={fileContent.content} />
  }

  return (
    <div className="h-[calc(100vh-6rem)] overflow-hidden rounded-[1rem] border border-white/[0.08] bg-[#151515] shadow-[0_26px_70px_-52px_rgba(0,0,0,0.95)]">
      <section className="grid h-full grid-cols-[22rem_minmax(0,1fr)] overflow-hidden rounded-[1rem] text-[#f0f0ed]">
        <aside className="min-h-0 border-r border-white/[0.08] bg-[#191919]">
          <div className="border-b border-white/[0.08] p-3">
            <label className="sr-only" htmlFor="code-search">Search code</label>
            <input
              id="code-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search code"
              className="h-12 w-full rounded-[0.7rem] border border-white/[0.09] bg-[#171717] px-4 text-[15px] text-[#e8e8e4] outline-none transition placeholder:text-[#8f8f8b] focus:border-[#4169ff]/70 focus:ring-2 focus:ring-[#4169ff]/25"
            />
          </div>
          <div className="h-[calc(100%-73px)] overflow-auto px-3 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {loading || error ? null : search.trim() ? (
              <FileTree
                entries={filteredEntries}
                selectedPath={selectedPath}
                openDirs={openDirs}
                onToggleDir={() => undefined}
                onSelectFile={(entry) => setSelectedPath(entry.path)}
              />
            ) : (
              <FileTree
                entries={data?.entries || []}
                selectedPath={selectedPath}
                openDirs={openDirs}
                onToggleDir={(path) => {
                  setOpenDirs((current) => {
                    const next = new Set(current)
                    if (next.has(path)) next.delete(path)
                    else next.add(path)
                    return next
                  })
                }}
                onSelectFile={(entry) => setSelectedPath(entry.path)}
              />
            )}
          </div>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-col bg-[#171717]">
          <header className="grid min-h-[52px] grid-cols-[1fr_auto] border-b border-white/[0.08] bg-[#191919]">
            <div className="flex min-w-0 overflow-hidden">
              {tabs.map((tab) => (
                <button
                  key={tab.path}
                  type="button"
                  onClick={() => setSelectedPath(tab.path)}
                  className={`min-w-0 border-r border-white/[0.08] px-5 text-left text-[15px] font-semibold transition ${
                    tab.path === selectedPath ? "bg-[#232323] text-[#f0f0ed]" : "text-[#b8b8b5] hover:bg-white/[0.045]"
                  }`}
                >
                  <span className="block truncate">{tab.path}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 px-4 text-sm text-[#d8d8d5]">
              <span className="hidden text-[#b8b8b5] md:inline">Read only</span>
              <button type="button" aria-label="Add comment" className="flex size-8 items-center justify-center rounded-md text-[#b8b8b5] transition hover:bg-white/[0.06] hover:text-white">
                <span className="material-symbols-outlined text-[18px]">add_comment</span>
              </button>
              <button type="button" aria-label="Copy path" className="flex size-8 items-center justify-center rounded-md text-[#b8b8b5] transition hover:bg-white/[0.06] hover:text-white">
                <span className="material-symbols-outlined text-[18px]">content_copy</span>
              </button>
              <button type="button" className="hidden min-h-9 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-[#d8d8d5] transition hover:bg-white/[0.06] hover:text-white lg:inline-flex">
                <span className="material-symbols-outlined text-[18px]">download</span>
                Download
              </button>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-auto bg-[#171717] [scrollbar-width:thin]">
            {renderContent()}
          </div>

          <footer className="flex min-h-8 items-center justify-between border-t border-white/[0.06] bg-[#191919] px-4 text-xs text-[#8f8f8b]">
            <span className="truncate">{workspacePath}</span>
            {fileContent ? <span>{fileContent.size.toLocaleString()} bytes</span> : null}
          </footer>
        </main>
      </section>
    </div>
  )
}
