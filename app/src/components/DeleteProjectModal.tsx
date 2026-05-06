"use client"

import { useEffect, useRef, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface DeleteProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onDelete: () => Promise<void>
  projectName: string
  isDeleting: boolean
}

export default function DeleteProjectModal({
  isOpen,
  onClose,
  onDelete,
  projectName,
  isDeleting,
}: DeleteProjectModalProps) {
  const [confirmName, setConfirmName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setConfirmName("")
      setError(null)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (confirmName !== projectName) {
      setError("Project name does not match")
      return
    }

    try {
      await onDelete()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete project")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isDeleting) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex size-10 items-center justify-center rounded-lg bg-destructive/10">
              <span className="material-symbols-outlined text-destructive">warning</span>
            </div>
            <DialogTitle>Delete Project</DialogTitle>
          </div>
          <DialogDescription>This action cannot be undone.</DialogDescription>
        </DialogHeader>

        <div className="text-sm text-muted-foreground mb-2">
          This will permanently delete{" "}
          <span className="font-semibold text-foreground">&quot;{projectName}&quot;</span>{" "}
          and all associated blueprints and chat history.
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              Type <span className="font-semibold text-foreground">{projectName}</span> to confirm.
            </p>
            <Input
              ref={inputRef}
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder="Type project name to confirm"
              disabled={isDeleting}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={isDeleting || confirmName !== projectName}
            >
              {isDeleting ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[18px] mr-2">progress_activity</span>
                  Deleting...
                </>
              ) : (
                "Delete Project"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
