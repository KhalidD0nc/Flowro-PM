import { redirect } from "next/navigation"

export default function ChatBoardRedirectPage({ params }: { params: { projectId: string } }) {
    redirect(`/app/${params.projectId}`)
}
