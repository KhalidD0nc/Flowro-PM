"use client"

import { useEffect, useRef, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface RenameProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onRename: (newName: string) => Promise<void>
  currentName: string
  isRenaming: boolean
}

export default function RenameProjectModal({
  isOpen,
  onClose,
  onRename,
  currentName,
  isRenaming,
}: RenameProjectModalProps) {
  const [name, setName] = useState(currentName)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setName(currentName)
      setError(null)
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 50)
    }
  }, [isOpen, currentName])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError("Project name cannot be empty")
      return
    }
    if (trimmedName === currentName) {
      onClose()
      return
    }

    try {
      await onRename(trimmedName)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rename project")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isRenaming) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Rename Project</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="projectName">Project Name</Label>
            <Input
              ref={inputRef}
              id="projectName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter project name"
              disabled={isRenaming}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={isRenaming}>
              Cancel
            </Button>
            <Button type="submit" disabled={isRenaming || !name.trim()}>
              {isRenaming ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[18px] mr-2">progress_activity</span>
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
