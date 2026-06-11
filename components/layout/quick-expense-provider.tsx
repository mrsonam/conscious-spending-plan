"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { AddExpenseModal } from "@/components/modals/add-expense-modal"
import { AddIncomeModal } from "@/components/modals/add-income-modal"

type QuickEntryContextValue = {
  openExpense: () => void
  openIncome: () => void
}

const QuickEntryContext = React.createContext<QuickEntryContextValue | null>(null)

export function useQuickExpense() {
  const ctx = React.useContext(QuickEntryContext)
  if (!ctx) throw new Error("useQuickExpense must be used within QuickExpenseProvider")
  return ctx
}

function shouldIgnoreShortcutTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return true
  if (target.isContentEditable) return true
  return false
}

export function QuickExpenseProvider({ children }: { children: React.ReactNode }) {
  const [expenseOpen, setExpenseOpen] = React.useState(false)
  const [incomeOpen, setIncomeOpen] = React.useState(false)
  const router = useRouter()

  const openExpense = React.useCallback(() => setExpenseOpen(true), [])
  const openIncome = React.useCallback(() => setIncomeOpen(true), [])

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey || e.repeat) return
      if (shouldIgnoreShortcutTarget(e.target)) return
      const key = e.key.toLowerCase()
      if (key === "e") { e.preventDefault(); setExpenseOpen((o) => !o) }
      else if (key === "i") { e.preventDefault(); setIncomeOpen((o) => !o) }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  const handleSuccess = React.useCallback(async () => {
    router.refresh()
  }, [router])

  const value = React.useMemo(
    () => ({ openExpense, openIncome }),
    [openExpense, openIncome],
  )

  return (
    <QuickEntryContext.Provider value={value}>
      {children}
      <AddExpenseModal
        open={expenseOpen}
        onOpenChange={setExpenseOpen}
        onSuccess={handleSuccess}
      />
      <AddIncomeModal
        open={incomeOpen}
        onOpenChange={setIncomeOpen}
        onSuccess={handleSuccess}
      />
    </QuickEntryContext.Provider>
  )
}
