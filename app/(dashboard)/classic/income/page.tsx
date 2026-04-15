"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { IncomeSkeleton } from "@/components/skeletons/income-skeleton"
import { IncomePageClassic } from "@/components/income/income-page-classic"
import { useIncomePage } from "@/hooks/use-income-page"
import { BENTO } from "@/lib/app-routes"
import { cn } from "@/lib/utils"

export default function ClassicIncomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const income = useIncomePage(status, router)

  useEffect(() => {
    if (
      status === "authenticated" &&
      session?.user?.dashboardTheme === "console"
    ) {
      router.replace(BENTO.income)
    }
  }, [status, session?.user?.dashboardTheme, router])

  if (status === "loading") {
    return (
      <>
        <Header title="Income" variant="classic" />
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
          <IncomeSkeleton />
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
      <Header title="Income" variant="classic" />
      <div
        className={cn(
          "p-4 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6 pb-10",
        )}
      >
        <IncomePageClassic {...income} />
      </div>
    </>
  )
}
