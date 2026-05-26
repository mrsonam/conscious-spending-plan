import { redirect } from "next/navigation"
import { Suspense } from "react"
import { LoginClient } from "./login-client"
import { auth } from "@/lib/auth"

export default async function LoginPage() {
  const session = await auth()
  if (session?.user?.id) {
    redirect("/dashboard")
  }

  return (
    <Suspense fallback={null}>
      <LoginClient />
    </Suspense>
  )
}
