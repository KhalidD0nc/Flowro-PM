import { Metadata } from "next"
import { AuthProvider } from "@/components/Providers"

export const metadata: Metadata = {
    title: "Sign In",
    description: "Sign in to Flowro AI to create and manage your project blueprints. Transform your ideas into structured, agent-ready specifications.",
    robots: {
        index: true,
        follow: true,
    },
    openGraph: {
        title: "Sign In | Flowro AI",
        description: "Sign in to Flowro AI to create and manage your project blueprints.",
    },
}

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <AuthProvider>{children}</AuthProvider>
}
