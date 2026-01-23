import { Metadata } from "next"

export async function generateMetadata({
    params,
}: {
    params: { token: string }
}): Promise<Metadata> {
    // Note: In development, we skip the fetch since the API requires authentication
    // and the server-side fetch doesn't have access to the user's token.
    // In production, you'd want to make the share API endpoint public or use
    // a different approach for metadata generation.

    // For now, return generic metadata
    // In production, you could fetch the blueprint data server-side from Firestore directly

    return {
        title: "Shared Blueprint | Flowro AI",
        description: "View this Unified Blueprint created with Flowro AI",
        openGraph: {
            title: "Shared Blueprint | Flowro AI",
            description: "Transform messy ideas into structured, agent-ready project blueprints",
            type: "website",
            images: [
                {
                    url: "/og-blueprint-preview.png",
                    width: 1200,
                    height: 630,
                    alt: "Flowro AI Blueprint",
                },
            ],
        },
        twitter: {
            card: "summary_large_image",
            title: "Shared Blueprint | Flowro AI",
            description: "View this Unified Blueprint created with Flowro AI",
            images: ["/og-blueprint-preview.png"],
        },
    }
}

export default function ShareLayout({ children }: { children: React.ReactNode }) {
    return children
}
