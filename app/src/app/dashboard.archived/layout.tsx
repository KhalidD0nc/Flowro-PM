import { Metadata } from "next"
import { AuthProvider } from "@/components/Providers"

export const metadata: Metadata = {
    title: "Dashboard",
    description: "Manage your projects and blueprints in Flowro AI.",
    robots: {
        index: false,
        follow: false,
    },
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <AuthProvider>{children}</AuthProvider>
}
