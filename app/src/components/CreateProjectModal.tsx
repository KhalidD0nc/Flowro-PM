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
import { Textarea } from "@/components/ui/textarea"

interface CreateProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateProject: (prompt: string) => Promise<void>
}

const examplePrompts = [
  "A habit tracker app for remote workers",
  "An AI-powered email summarizer for busy executives",
  "A marketplace connecting local artisans with customers",
]

const loadingPhases = [
  { icon: "folder_open", text: "Creating project..." },
  { icon: "psychology", text: "Analyzing your idea..." },
  { icon: "auto_awesome", text: "Generating blueprint..." },
]

export default function CreateProjectModal({
  isOpen,
  onClose,
  onCreateProject,
}: CreateProjectModalProps) {
  const [prompt, setPrompt] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [loadingPhase, setLoadingPhase] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isLoading) {
      const timer = setInterval(() => {
        setLoadingPhase((p) => Math.min(p + 1, loadingPhases.length - 1))
      }, 2000)
      return () => clearInterval(timer)
    }
  }, [isLoading])

  const handleClose = () => {
    if (isLoading) return
    setPrompt("")
    setError(null)
    setIsLoading(false)
    setLoadingPhase(0)
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const trimmedPrompt = prompt.trim()
    if (!trimmedPrompt) {
      setError("Please tell me what you want to build.")
      return
    }

    setIsLoading(true)
    try {
      await onCreateProject(trimmedPrompt)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project")
      setIsLoading(false)
      setLoadingPhase(0)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault()
      if (prompt.trim() && !isLoading) handleSubmit(e)
    }
  }

  const currentPhase = loadingPhases[loadingPhase]

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isLoading) handleClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <span className="material-symbols-outlined text-primary">add_circle</span>
            </div>
            <DialogTitle className="text-2xl">New Project</DialogTitle>
          </div>
          <DialogDescription>What do you want to build today?</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-2">
            <Textarea
              ref={inputRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your project idea in detail..."
              rows={6}
              disabled={isLoading}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Describe your target users and 2–3 key features for the best results
            </p>
          </div>

          {!isLoading && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-muted-foreground">Try an example:</p>
              <div className="flex flex-wrap gap-2">
                {examplePrompts.map((example, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => { setPrompt(example); inputRef.current?.focus() }}
                    className="text-xs px-3 py-1.5 rounded-full border border-border bg-muted text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isLoading && (
            <div className="flex flex-col gap-3 py-2">
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                  <span className="material-symbols-outlined text-primary text-[18px] animate-pulse">
                    {currentPhase.icon}
                  </span>
                </div>
                <span className="text-sm font-medium">{currentPhase.text}</span>
              </div>
              <div className="flex items-center gap-2 ml-11">
                {loadingPhases.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${i <= loadingPhase ? "w-6 bg-primary" : "w-1.5 bg-border"}`}
                  />
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-muted-foreground/60 hidden sm:block">
              <kbd className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground">⌘</kbd>
              <span className="mx-1">+</span>
              <kbd className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground">↵</kbd>
              <span className="ml-1">to submit</span>
            </div>
            <div className="flex items-center gap-3 ml-auto">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || !prompt.trim()}>
                {isLoading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[18px] mr-2">progress_activity</span>
                    Creating...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px] mr-2">rocket_launch</span>
                    Create Project
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
