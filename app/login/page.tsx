import { redirect } from "next/navigation"
import { Suspense } from "react"
import { LoginClient } from "./login-client"
import { auth } from "@/lib/auth"
import { isSafeCallbackPath } from "@/lib/oauth-paths"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>
}) {
  const session = await auth()
  if (session?.user?.id) {
    const { callbackUrl } = await searchParams
    redirect(callbackUrl && isSafeCallbackPath(callbackUrl) ? callbackUrl : "/dashboard")
  }

  return (
    <Suspense fallback={null}>
      <LoginClient />
    </Suspense>
  )
}
