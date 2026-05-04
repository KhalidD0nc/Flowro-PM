import { NextRequest, NextResponse } from "next/server"
import { readdir, stat } from "fs/promises"
import { homedir } from "os"
import path from "path"
import { verifyAuthToken, isAuthError, unauthorizedResponse } from "@/app/api/blueprints/auth"
import { getProject } from "@/lib/firebase/collections"

const GENERATED_APPS_BASE = process.env.FLOWRO_GENERATED_APPS_PATH || path.join(homedir(), "Desktop", "Flowro-Apps")
const IGNORED_NAMES = new Set([".git", ".next", ".turbo", "dist", "node_modules"])
const MAX_DEPTH = 5
const MAX_ENTRIES = 700

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
