import { NextRequest, NextResponse } from "next/server"
import { readFile, readdir, stat } from "fs/promises"
import { homedir } from "os"
import path from "path"
import { verifyAuthToken, isAuthError, unauthorizedResponse } from "@/app/api/blueprints/auth"
import { getProject } from "@/lib/firebase/collections"

const GENERATED_APPS_BASE = process.env.FLOWRO_GENERATED_APPS_PATH || path.join(homedir(), "Desktop", "Flowro-Apps")
const IGNORED_NAMES = new Set([".git", ".next", ".turbo", "dist", "node_modules"])
const MAX_DEPTH = 5
const MAX_ENTRIES = 700
const MAX_FILE_BYTES = 250_000
const READABLE_EXTENSIONS = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".ts",
  ".tsx",
  ".txt",
  ".vue",
  ".yml",
  ".yaml",
])

type FileEntry = {
  name: string
  path: string
  type: "file" | "directory"
  children?: FileEntry[]
}

async function verifyOwnership(projectId: string, userId: string): Promise<void> {
  const project = await getProject(projectId)
  if (!project) throw new Error("Project not found")
  if (project.userId !== userId) throw new Error("Access denied")
}

function getWorkspacePath(projectId: string) {
  return path.join(GENERATED_APPS_BASE, projectId)
}

function getSafeFilePath(rootPath: string, requestedPath: string) {
  const normalized = path.normalize(requestedPath).replace(/^(\.\.(\/|\\|$))+/, "")
  const absolutePath = path.resolve(rootPath, normalized)
  const relativePath = path.relative(rootPath, absolutePath)

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error("Invalid file path")
  }

  const segments = relativePath.split(path.sep)
  if (segments.some((segment) => IGNORED_NAMES.has(segment))) {
    throw new Error("File is not readable")
  }

  return { absolutePath, relativePath }
}

async function listEntries(rootPath: string, currentPath: string, depth: number, counter: { count: number }): Promise<FileEntry[]> {
  if (depth > MAX_DEPTH || counter.count >= MAX_ENTRIES) return []

  const dirents = await readdir(currentPath, { withFileTypes: true })
  const visible = dirents
    .filter((entry) => !IGNORED_NAMES.has(entry.name))
    .filter((entry) => !entry.name.startsWith(".") || entry.name === ".env.example")
    .sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1
      if (!a.isDirectory() && b.isDirectory()) return 1
      return a.name.localeCompare(b.name)
    })

  const entries: FileEntry[] = []

  for (const entry of visible) {
    if (counter.count >= MAX_ENTRIES) break
    const absolutePath = path.join(currentPath, entry.name)
    const relativePath = path.relative(rootPath, absolutePath)
    counter.count += 1

    if (entry.isDirectory()) {
      entries.push({
        name: entry.name,
        path: relativePath,
        type: "directory",
        children: await listEntries(rootPath, absolutePath, depth + 1, counter),
      })
    } else if (entry.isFile()) {
      entries.push({
        name: entry.name,
        path: relativePath,
        type: "file",
      })
    }
  }

  return entries
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const authResult = await verifyAuthToken(request)
    if (isAuthError(authResult)) return unauthorizedResponse(authResult)

    const { projectId } = await params
    await verifyOwnership(projectId, authResult.userId)

    const workspacePath = getWorkspacePath(projectId)
    const workspaceStats = await stat(workspacePath)
    if (!workspaceStats.isDirectory()) {
      return NextResponse.json({ error: "Generated app folder is not available yet" }, { status: 404 })
    }

    const requestedFile = request.nextUrl.searchParams.get("path")
    if (requestedFile) {
      const { absolutePath, relativePath } = getSafeFilePath(workspacePath, requestedFile)
      const fileStats = await stat(absolutePath)
      if (!fileStats.isFile()) {
        return NextResponse.json({ error: "Requested path is not a file" }, { status: 400 })
      }
      if (fileStats.size > MAX_FILE_BYTES) {
        return NextResponse.json({ error: "File is too large to preview" }, { status: 413 })
      }

      const extension = path.extname(absolutePath).toLowerCase()
      if (extension && !READABLE_EXTENSIONS.has(extension)) {
        return NextResponse.json({ error: "File type is not supported for preview" }, { status: 415 })
      }

      const content = await readFile(absolutePath, "utf8")
      return NextResponse.json({
        workspacePath,
        file: {
          name: path.basename(absolutePath),
          path: relativePath,
          content,
          size: fileStats.size,
        },
      })
    }

    const entries = await listEntries(workspacePath, workspacePath, 0, { count: 0 })

    return NextResponse.json({
      workspacePath,
      entries,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list generated app files"
    const status = message.includes("Access denied")
      ? 403
      : message.includes("not found") || message.includes("ENOENT")
        ? 404
        : 500
    return NextResponse.json({ error: message }, { status })
  }
}
