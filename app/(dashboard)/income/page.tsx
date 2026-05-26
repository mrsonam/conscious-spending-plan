"use client"

import { useEffect } from "react"
import { useHydratedSession } from "@/hooks/use-hydrated-session"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import {
  IncomeFormSkeleton,
  IncomeHistorySkeleton,
} from "@/components/skeletons/income-sections"
import { IncomePageBento } from "@/components/income/income-page-bento"
import { useIncomePage } from "@/hooks/use-income-page"

export default function BentoIncomePage() {
  const { session, status, isSessionPending } = useHydratedSession()
  const router = useRouter()
  const income = useIncomePage(status, router)

  if (isSessionPending) {
    return (
      <>
        <Header
          title="Income"
          description="Log inflows and see how they split across your fund pillars."
         
        />
        <div className="mx-auto max-w-7xl space-y-4 px-4 pb-10 pt-4 sm:px-6 lg:px-8">
          <IncomeFormSkeleton />
          <IncomeHistorySkeleton />
        </div>
      </>
    )
  }

  if (!session) return null

  return (
    <>
      <Header
        title="Income"
        description="Log inflows and see how they split across your fund pillars."
       
      />
      <div className="mx-auto max-w-7xl space-y-4 px-4 pb-10 pt-4 sm:space-y-6 sm:px-6 lg:px-8">
        <IncomePageBento {...income} />
      </div>
    </>
  )
}
