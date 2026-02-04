import { redirect } from "next/navigation"

export default function AppProjectRedirectPage({ params }: { params: { projectId: string } }) {
    redirect(`/app?projectId=${params.projectId}`)
}
