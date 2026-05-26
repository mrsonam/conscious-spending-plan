import { redirect } from "next/navigation"
import { SignupClient } from "./signup-client"
import { auth } from "@/lib/auth"

export default async function SignupPage() {
  const session = await auth()
  if (session?.user?.id) {
    redirect("/dashboard")
  }

  return <SignupClient />
}
