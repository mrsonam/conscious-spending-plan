"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { EXPENSE_CATEGORY_CHART_COLORS } from "@/components/expenses/expense-console-ui"
import { ExpenseBulkDialog } from "@/components/expenses/expense-bulk-dialog"
import { ExpenseCategorySection } from "@/components/expenses/expense-category-section"
import { ExpenseHistorySection } from "@/components/expenses/expense-history-section"
import { ExpenseLogDialog } from "@/components/expenses/expense-log-dialog"
import { ExpenseRecurringSection } from "@/components/expenses/expense-recurring-section"
import { ExpenseSummarySection } from "@/components/expenses/expense-summary-section"
import { pctOf } from "@/components/expenses/expense-shared"
import { OTHER_BUCKET_CATEGORY } from "@/lib/expense-category-buckets"
import {
  buildExpensesCsv,
  downloadCsvFile,
  fetchAllExpensesForExport,
} from "@/lib/expense-csv-export"
import { FormStatusAlert } from "@/components/wealth-console/form-status-alert"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"
import type { UseExpensePageResult } from "@/hooks/use-expense-page"

export function ExpensePageBento(p: UseExpensePageResult) {
  const [logOpen, setLogOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [recurringOpen, setRecurringOpen] = useState(false)
  const [exportingCsv, setExportingCsv] = useState(false)
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null)
  const historySectionRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    void p.ensureExpensesLoaded()
  }, [p.ensureExpensesLoaded])

  useEffect(() => {
    if (recurringOpen || p.showRecurringForm) {
      void p.ensureRecurringLoaded()
    }
  }, [recurringOpen, p.showRecurringForm, p.ensureRecurringLoaded])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "s" && e.key !== "S") return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const tag = (e.target as HTMLElement).tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return
      const el = document.getElementById("expense-search")
      if (!el) return
      e.preventDefault()
      ;(el as HTMLInputElement).focus()
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [])

  const submitLog = async (e: React.FormEvent) => {
    const ok = await p.handleSubmit(e)
    if (ok) setLogOpen(false)
  }

  const openLogDialog = () => {
    p.resetLogForm()
    setLogOpen(true)
  }

  const openEditDialog = (expense: (typeof p.expenses)[number]) => {
    p.startEditExpense(expense)
    setLogOpen(true)
  }

  const handleLogOpenChange = (open: boolean) => {
    setLogOpen(open)
    if (!open) p.resetLogForm()
  }

  const perf = p.expenseStats.monthOverMonthPct
  const reducedMotion = usePrefersReducedMotion()

  const monthTotal = p.expenseStats.currentMonthTotal || 0
  const subcategoryInsights = p.expenseStats.subcategoryInsights
  const topCategories = subcategoryInsights.topCategories
  const classifiedSharePct = pctOf(monthTotal, subcategoryInsights.totalClassified)
  const unclassifiedSharePct = pctOf(monthTotal, subcategoryInsights.unclassifiedAmount)
  const categoryPalette = [...EXPENSE_CATEGORY_CHART_COLORS]
  const categoryChartData = [
    ...topCategories.map((category, index) => ({
      ...category,
      fill: categoryPalette[index % categoryPalette.length],
    })),
    ...(subcategoryInsights.otherAmount > 0
      ? [
          {
            category: OTHER_BUCKET_CATEGORY,
            label: "Other categories",
            amount: subcategoryInsights.otherAmount,
            count: subcategoryInsights.otherCount,
            sharePct: subcategoryInsights.otherSharePct,
            momentumPct: null,
            fill: categoryPalette[5] ?? categoryPalette[categoryPalette.length - 1],
          },
        ]
      : []),
  ]
  const shareChartData =
    subcategoryInsights.unclassifiedAmount > 0
      ? [
          ...categoryChartData,
          {
            category: "unclassified",
            label: "Unclassified",
            amount: subcategoryInsights.unclassifiedAmount,
            sharePct: unclassifiedSharePct,
            fill: "rgba(218, 226, 253, 0.2)",
            count: 0,
          },
        ]
      : categoryChartData
  const activeSubcategory =
    shareChartData.find((entry) => entry.category === selectedSubcategory) ??
    shareChartData[0] ??
    null
  const showSummarySkeleton =
    p.loadingSummary &&
    p.expenseStats.currentMonthTotal === 0 &&
    p.expenseStats.ytdTotal === 0

  const exportCsv = useCallback(async () => {
    setExportingCsv(true)
    try {
      const entries = await fetchAllExpensesForExport({
        startDate: p.filterStartDate || undefined,
        endDate: p.filterEndDate || undefined,
        fundCategory: p.filterFundCategory || undefined,
        expenseCategory: p.filterExpenseCategory || undefined,
        accountId: p.filterAccountId || undefined,
      })
      const csv = buildExpensesCsv(entries)
      downloadCsvFile(
        csv,
        `expenses-export-${new Date().toISOString().slice(0, 10)}.csv`,
      )
    } catch {
      p.setMessage({ type: "error", text: "Could not export expenses." })
    } finally {
      setExportingCsv(false)
    }
  }, [
    p.filterStartDate,
    p.filterEndDate,
    p.filterFundCategory,
    p.filterExpenseCategory,
    p.filterAccountId,
    p.setMessage,
  ])

  const openHistoryForCategory = (category: string) => {
    if (category === "unclassified" || category === OTHER_BUCKET_CATEGORY) return
    p.setFilterExpenseCategory(category)
    setFiltersOpen(true)
    const scrollToHistory = () => {
      const reduceMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      historySectionRef.current?.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start",
      })
    }
    scrollToHistory()
  }

  const openBulkImport = () => {
    if (p.loadingAccounts) return
    p.setShowBulkForm(true)
    p.setMessage(null)
    if (p.accounts.length && !p.bulkAccountId) {
      p.setBulkAccountId(
        p.accounts.find((a) => a.isDefault)?.id || p.accounts[0].id,
      )
    }
  }

  return (
    <>
      <FormStatusAlert message={p.message} />

      <ExpenseSummarySection
        p={p}
        showSummarySkeleton={showSummarySkeleton}
        perf={perf}
        reducedMotion={reducedMotion}
        onLogOpen={openLogDialog}
        onBulkOpen={openBulkImport}
      />

      <ExpenseCategorySection
        p={p}
        showSummarySkeleton={showSummarySkeleton}
        leadCategory={categoryChartData[0] ?? null}
        classifiedSharePct={classifiedSharePct}
        unclassifiedSharePct={unclassifiedSharePct}
        averageEntryAmount={subcategoryInsights.averageEntryAmount}
        categoryChartData={categoryChartData}
        shareChartData={shareChartData}
        selectedSubcategory={selectedSubcategory}
        onSelectSubcategory={setSelectedSubcategory}
        activeSubcategory={activeSubcategory}
        onOpenHistoryForCategory={openHistoryForCategory}
      />

      <ExpenseLogDialog
        open={logOpen}
        onOpenChange={handleLogOpenChange}
        p={p}
        onSubmit={submitLog}
        editingExpenseId={p.editingExpenseId}
      />

      <ExpenseBulkDialog p={p} />

      <ExpenseHistorySection
        p={p}
        sectionRef={historySectionRef}
        filtersOpen={filtersOpen}
        onFiltersOpenChange={setFiltersOpen}
        exportingCsv={exportingCsv}
        onExportCsv={() => void exportCsv()}
        onEditExpense={openEditDialog}
      />

      <ExpenseRecurringSection
        p={p}
        recurringOpen={recurringOpen}
        onRecurringOpenChange={setRecurringOpen}
      />

      <ConfirmDialog
        open={p.showDeleteConfirm}
        onOpenChange={(open) => !open && p.setShowDeleteConfirm(false)}
        title="Delete expense"
        description="This removes the expense and restores the amount to the account."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
       
        onConfirm={p.confirmDelete}
      />
      <ConfirmDialog
        open={p.showRecurringDeleteConfirm}
        onOpenChange={(open) =>
          !open && p.setShowRecurringDeleteConfirm(false)
        }
        title="Delete recurring template?"
        description="Past logged expenses stay unchanged."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
       
        onConfirm={p.confirmDeleteRecurring}
      />
    </>
  )
}
