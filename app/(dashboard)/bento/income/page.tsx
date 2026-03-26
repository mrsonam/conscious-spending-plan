"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import {
  IncomeFormSkeleton,
  IncomeHistorySkeleton,
} from "@/components/skeletons/income-sections"
import { IncomePageBento } from "@/components/income/income-page-bento"
import { useIncomePage } from "@/hooks/use-income-page"
import { CLASSIC } from "@/lib/app-routes"

export default function BentoIncomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const income = useIncomePage(status, router)

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return
    if ((session.user.dashboardTheme ?? "classic") !== "console") {
      router.replace(CLASSIC.income)
    }
  }, [status, session?.user, router])

  if (status === "loading") {
    return (
      <>
        <Header
          title="Income"
          description="Log inflows and see how they split across your fund pillars."
          variant="console"
        />
        <div className="mx-auto max-w-4xl space-y-4 px-4 pb-10 pt-4 sm:px-6 lg:px-8">
          <IncomeFormSkeleton variant="console" />
          <IncomeHistorySkeleton variant="console" />
        </div>
      </>
    )
  }

  if (
    status === "authenticated" &&
    (session?.user?.dashboardTheme ?? "classic") !== "console"
  ) {
    return null
  }

  if (!session) return null

  return (
    <>
      <Header
        title="Income"
        description="Log inflows and see how they split across your fund pillars."
        variant="console"
      />
      <div className="mx-auto max-w-4xl min-h-[calc(100dvh-5.5rem)] space-y-4 px-4 pb-10 pt-4 sm:space-y-6 sm:px-6 lg:px-8">
        <IncomePageBento {...income} />
      </div>
    </>
  )
}
