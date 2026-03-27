"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { CategoryTrackingClassic } from "@/components/category-tracking/category-tracking-classic"
import { SummaryCardsSkeleton, ChartsSkeleton } from "@/components/skeletons/category-tracking-sections"
import { BENTO } from "@/lib/app-routes"

export default function CategoryTrackingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (
      status === "authenticated" &&
      session?.user?.dashboardTheme === "console"
    ) {
      router.replace(BENTO.categoryTracking)
    }
  }, [status, session?.user?.dashboardTheme, router])

  if (status === "loading") {
    return (
      <>
        <Header title="Category tracking" />
        <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
          <SummaryCardsSkeleton />
          <ChartsSkeleton />
        </div>
      </>
    )
  }

  if (!session) return null

  if (session.user?.dashboardTheme === "console") {
    return null
  }

  return (
    <>
      <Header title="Category tracking" />
      <CategoryTrackingClassic />
    </>
  )
}
