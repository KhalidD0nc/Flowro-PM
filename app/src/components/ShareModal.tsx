"use client"

import { useState } from "react"
import { useAuth } from "./Providers"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  blueprintId: string
  projectId: string
  projectName: string
}

export default function ShareModal({
  isOpen,
  onClose,
  blueprintId,
  projectId,
  projectName,
}: ShareModalProps) {
  const { user } = useAuth()
  const [shareUrl, setShareUrl] = useState<string>("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewCount, setViewCount] = useState<number>(0)

  const handleGenerateLink = async () => {
    if (!user) {
      setError("You must be logged in to share blueprints")
      return
    }
    setIsGenerating(true)
    setError(null)
    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ blueprintId, projectId }),
      })
      if (!response.ok) throw new Error("Failed to generate share link")
      const data = await response.json()
      setShareUrl(data.shareUrl)
      setViewCount(data.shareToken.viewCount || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate share link")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch {
      setError("Failed to copy link")
    }
  }

  if (isOpen && !shareUrl && !isGenerating && !error) {
    handleGenerateLink()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-primary">share</span>
            <DialogTitle>Share Blueprint</DialogTitle>
          </div>
          <DialogDescription>
            Anyone with this link can view <strong>{projectName}</strong> blueprint (read-only).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isGenerating && (
            <div className="flex items-center justify-center py-8">
              <span className="material-symbols-outlined text-primary text-4xl animate-spin">
                progress_activity
              </span>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          {shareUrl && !isGenerating && (
            <>
              <div className="flex items-center gap-2">
                <Input value={shareUrl} readOnly className="flex-1 text-sm" />
                <Button
                  variant={isCopied ? "outline" : "default"}
                  onClick={handleCopyLink}
                  className={isCopied ? "text-green-600 border-green-500/30" : ""}
                >
                  <span className="material-symbols-outlined text-[18px] mr-1">
                    {isCopied ? "check" : "content_copy"}
                  </span>
                  {isCopied ? "Copied!" : "Copy"}
                </Button>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">visibility</span>
                  <span>{viewCount} views</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">schedule</span>
                  <span>Never expires</span>
                </div>
              </div>

              <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                <p className="text-primary text-sm flex items-start gap-2">
                  <span className="material-symbols-outlined text-[18px] mt-0.5">info</span>
                  <span>
                    Viewers will see a read-only version with a &quot;Create your own blueprint&quot; call-to-action
                  </span>
                </p>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
