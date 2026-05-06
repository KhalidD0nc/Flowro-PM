import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button, Input, Label, FadeIn } from "@/components/ui/app-kit"
import { signUpWithEmail } from "@/lib/auth"

export default function SignupPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { data, error } = await signUpWithEmail(email, password)
    setLoading(false)
    if (error) {
      setError(error.message)
    } else if (data.session) {
      navigate("/app")
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
              We sent a confirmation link to {email}. Click it to activate your account.
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
            <h1 className="text-2xl font-bold text-[hsl(var(--ink))]">Create account</h1>
            <p className="mt-2 text-sm text-[hsl(var(--ink-muted))]">Get started free</p>
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
                minLength={6}
              />
            </div>
            {error && (
              <p className="text-sm text-[hsl(var(--danger))]">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account…" : "Create account"}
            </Button>
          </form>
          <p className="text-center text-sm text-[hsl(var(--ink-muted))]">
            Already have an account?{" "}
            <a href="/login" className="text-[hsl(var(--cta))] hover:underline">
              Sign in
            </a>
          </p>
        </div>
      </FadeIn>
    </div>
  )
}
