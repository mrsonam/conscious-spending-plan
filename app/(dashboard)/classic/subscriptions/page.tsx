"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { SubscriptionsPageBento } from "@/components/subscriptions/subscriptions-page-bento"
import { BENTO } from "@/lib/app-routes"

export default function ClassicSubscriptionsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  useEffect(() => {
    if (
      status === "authenticated" &&
      session?.user?.dashboardTheme === "console"
    ) {
      router.replace(BENTO.subscriptions)
    }
  }, [status, session?.user?.dashboardTheme, router])

  if (status === "loading" || !session) {
    return null
  }

  if (session.user?.dashboardTheme === "console") {
    return null
  }

  return (
    <>
      <Header
        title="Subscriptions"
        description="Link recurring charges and track renewals."
      />
      <div className="mx-auto max-w-7xl space-y-4 p-4 sm:space-y-6 sm:p-6">
        <SubscriptionsPageBento />
      </div>
    </>
  )
}
