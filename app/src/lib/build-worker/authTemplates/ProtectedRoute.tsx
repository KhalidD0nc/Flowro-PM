import { useEffect, useState } from "react"
import { Navigate } from "react-router-dom"
import { onAuthStateChange } from "@/lib/auth"

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<unknown | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const { data } = onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })
    return () => {
      data.subscription.unsubscribe()
    }
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--surface))]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[hsl(var(--cta))] border-t-transparent" />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
