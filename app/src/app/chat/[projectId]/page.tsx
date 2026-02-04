import { redirect } from "next/navigation"

export default function ChatRedirectPage({ params }: { params: { projectId: string } }) {
    redirect(`/app/${params.projectId}`)
}
