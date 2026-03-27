"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { FundsPageBento } from "@/components/funds/funds-page-bento"
import { CLASSIC } from "@/lib/app-routes"

export default function BentoFundsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return
    if ((session.user.dashboardTheme ?? "classic") !== "console") {
      router.replace(CLASSIC.funds)
    }
  }, [status, session?.user, router])

  if (status === "loading") {
    return (
      <>
        <Header
          title="Fund settings"
          description="Income split, caps, and envelope behavior."
          variant="console"
        />
        <div className="mx-auto max-w-5xl min-h-[calc(100dvh-5.5rem)] space-y-4 px-4 pb-10 pt-4 sm:space-y-6 sm:px-6 lg:px-8">
          <div className="h-28 animate-pulse rounded-xl border border-white/10 bg-white/5" />
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-xl border border-white/10 bg-white/5" />
            ))}
          </div>
        </div>
      </>
    )
  }

  if (status === "authenticated" && (session?.user?.dashboardTheme ?? "classic") !== "console") {
    return null
  }

  if (!session) return null

  return (
    <>
      <Header
        title="Fund settings"
        description="Income split, caps, and envelope behavior."
        variant="console"
      />
      <div className="mx-auto max-w-5xl min-h-[calc(100dvh-5.5rem)] space-y-4 px-4 pb-10 pt-4 sm:space-y-6 sm:px-6 lg:px-8">
        <FundsPageBento />
      </div>
    </>
  )
}
