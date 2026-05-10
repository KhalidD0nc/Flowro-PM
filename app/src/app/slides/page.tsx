import { redirect } from "next/navigation"

export default function SlidesEntryPage() {
  redirect("/app?mode=slides")
}
