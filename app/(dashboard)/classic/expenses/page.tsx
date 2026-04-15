"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { ExpensesSkeleton } from "@/components/skeletons/expenses-skeleton"
import { ExpensePageClassic } from "@/components/expenses/expense-page-classic"
import { useExpensePage } from "@/hooks/use-expense-page"
import { BENTO } from "@/lib/app-routes"
import { cn } from "@/lib/utils"

export default function ClassicExpensesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const expense = useExpensePage(status, router)

  useEffect(() => {
    if (
      status === "authenticated" &&
      session?.user?.dashboardTheme === "console"
    ) {
      router.replace(BENTO.expenses)
    }
  }, [status, session?.user?.dashboardTheme, router])

  if (status === "loading") {
    return (
      <>
        <Header title="Expenses" />
        <div className="mx-auto max-w-7xl space-y-4 p-4 sm:space-y-6 sm:p-6">
          <ExpensesSkeleton />
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
      <Header title="Expenses" />
      <div
        className={cn(
          "mx-auto max-w-7xl space-y-4 p-4 pb-10 sm:space-y-6 sm:p-6",
        )}
      >
        <ExpensePageClassic {...expense} />
      </div>
    </>
  )
}
