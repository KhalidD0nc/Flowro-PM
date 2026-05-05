import { useState } from "react"
import { Button, Input, Label, FadeIn } from "@/components/ui/app-kit"
import { supabase } from "@/lib/supabase"

export default function PasswordResetPage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    if (!supabase) {
      setError("Supabase is not configured. Check VITE_SUPABASE_URL and the browser key in .env.local.")
      setLoading(false)
      return
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--surface))] px-6">
        <FadeIn>
          <div className="w-full max-w-sm text-center space-y-4">
            <h1 className="text-2xl font-bold text-[hsl(var(--ink))]">Check your email</h1>
            <p className="text-sm text-[hsl(var(--ink-muted))]">
              If an account exists, we sent a password reset link.
            </p>
            <a href="/login">
              <Button variant="outline" className="mt-4">Back to sign in</Button>
            </a>
          </div>
        </FadeIn>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--surface))] px-6">
      <FadeIn>
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-[hsl(var(--ink))]">Reset password</h1>
            <p className="mt-2 text-sm text-[hsl(var(--ink-muted))]">We&apos;ll send you a reset link</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            {error && (
              <p className="text-sm text-[hsl(var(--danger))]">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending…" : "Send reset link"}
            </Button>
          </form>
          <p className="text-center text-sm text-[hsl(var(--ink-muted))]">
            Remember your password?{" "}
            <a href="/login" className="text-[hsl(var(--cta))] hover:underline">
              Sign in
            </a>
          </p>
        </div>
      </FadeIn>
    </div>
  )
}
