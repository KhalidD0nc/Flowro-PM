import { Metadata } from "next"

export const metadata: Metadata = {
    title: "Project",
    description: "Work on your project blueprint in Flowro AI.",
    robots: {
        index: false,
        follow: false,
    },
}

export default function ChatLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return children
}
