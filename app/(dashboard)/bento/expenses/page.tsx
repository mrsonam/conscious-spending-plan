"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import {
  IncomeFormSkeleton,
  IncomeHistorySkeleton,
} from "@/components/skeletons/income-sections"
import { ExpensePageBento } from "@/components/expenses/expense-page-bento"
import { useExpensePage } from "@/hooks/use-expense-page"
import { CLASSIC } from "@/lib/app-routes"

export default function BentoExpensesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const expense = useExpensePage(status, router)

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return
    if ((session.user.dashboardTheme ?? "classic") !== "console") {
      router.replace(CLASSIC.expenses)
    }
  }, [status, session?.user, router])

  if (status === "loading") {
    return (
      <>
        <Header
          title="Expenses"
          description="Track outflows, recurring charges, and history."
          variant="console"
        />
        <div className="mx-auto max-w-4xl space-y-4 px-4 pb-10 pt-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
            <div className="lg:col-span-7">
              <IncomeFormSkeleton variant="console" />
            </div>
            <div className="lg:col-span-5">
              <IncomeHistorySkeleton variant="console" />
            </div>
          </div>
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
        title="Expenses"
        description="Track outflows, recurring charges, and history."
        variant="console"
      />
      <div className="mx-auto max-w-4xl min-h-[calc(100dvh-5.5rem)] space-y-4 px-4 pb-10 pt-4 sm:space-y-6 sm:px-6 lg:px-8">
        <ExpensePageBento {...expense} />
      </div>
    </>
  )
}
