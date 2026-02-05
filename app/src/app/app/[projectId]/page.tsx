import { redirect } from "next/navigation"

export default async function AppProjectRedirectPage({ params }: { params: Promise<{ projectId: string }> }) {
    const { projectId } = await params
    redirect(`/app?projectId=${projectId}`)
}
