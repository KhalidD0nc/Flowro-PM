import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button, Input, Label, FadeIn } from "@/components/ui/app-kit"
import { signInWithEmail } from "@/lib/auth"

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await signInWithEmail(email, password)
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      navigate("/app")
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--surface))] px-6">
      <FadeIn>
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-[hsl(var(--ink))]">Sign in</h1>
            <p className="mt-2 text-sm text-[hsl(var(--ink-muted))]">Welcome back</p>
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
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            {error && (
              <p className="text-sm text-[hsl(var(--danger))]">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <p className="text-center text-sm text-[hsl(var(--ink-muted))]">
            Don&apos;t have an account?{" "}
            <a href="/signup" className="text-[hsl(var(--cta))] hover:underline">
              Sign up
            </a>
          </p>
        </div>
      </FadeIn>
    </div>
  )
}
