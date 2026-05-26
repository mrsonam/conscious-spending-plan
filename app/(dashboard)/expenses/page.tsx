"use client"

import { useHydratedSession } from "@/hooks/use-hydrated-session"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { ExpensesPageLoadingSkeleton } from "@/components/skeletons/expenses-sections"
import { ExpensePageBento } from "@/components/expenses/expense-page-bento"
import { useExpensePage } from "@/hooks/use-expense-page"

export default function BentoExpensesPage() {
  const { session, status, isSessionPending } = useHydratedSession()
  const router = useRouter()
  const expense = useExpensePage(status, router)

  if (isSessionPending) {
    return (
      <>
        <Header
          title="Expenses"
          description="Track outflows, recurring charges, and history."
         
        />
        <div className="mx-auto max-w-7xl space-y-4 px-4 pb-10 pt-4 sm:px-6 lg:px-8">
          <ExpensesPageLoadingSkeleton />
        </div>
      </>
    )
  }

  if (!session) return null

  return (
    <>
      <Header
        title="Expenses"
        description="Track outflows, recurring charges, and history."
       
      />
      <div className="mx-auto max-w-7xl space-y-4 px-4 pb-10 pt-4 sm:space-y-6 sm:px-6 lg:px-8">
        <ExpensePageBento {...expense} />
      </div>
    </>
  )
}
