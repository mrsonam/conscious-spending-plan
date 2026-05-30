"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { EXPENSE_CATEGORY_CHART_COLORS } from "@/components/expenses/expense-console-ui"
import { ExpenseBulkDialog } from "@/components/expenses/expense-bulk-dialog"
import { ExpenseCategorySection } from "@/components/expenses/expense-category-section"
import { ExpenseHistorySection } from "@/components/expenses/expense-history-section"
import { ExpenseLiquiditySection } from "@/components/expenses/expense-liquidity-section"
import { ExpenseLogDialog } from "@/components/expenses/expense-log-dialog"
import { ExpenseRecurringSection } from "@/components/expenses/expense-recurring-section"
import { ExpenseSummarySection } from "@/components/expenses/expense-summary-section"
import { pctOf } from "@/components/expenses/expense-shared"
import {
  buildExpensesCsv,
  downloadCsvFile,
  fetchAllExpensesForExport,
} from "@/lib/expense-csv-export"
import { FormStatusAlert } from "@/components/wealth-console/form-status-alert"
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

  const submitLog = async (e: React.FormEvent) => {
    const ok = await p.handleSubmit(e)
    if (ok) setLogOpen(false)
  }

  const perf = p.expenseStats.monthOverMonthPct
  const perfGood = perf === null || perf <= 0

  const monthTotal = p.expenseStats.currentMonthTotal || 0
  const fund = p.expenseStats.fundBreakdownCurrentMonth ?? {
    fixedCosts: 0,
    investment: 0,
    savings: 0,
    guiltFreeSpending: 0,
  }
  const fixedPct = pctOf(monthTotal, fund.fixedCosts)
  const investPct = pctOf(monthTotal, fund.investment)

  const fixedThreshold = 60
  const investTarget = 30
  const fixedOver = fixedPct > fixedThreshold
  const investOver = investPct > investTarget + 5

  const liquidity = p.accounts.reduce((sum, a) => sum + (a.balance || 0), 0)
  const runwayMonths = monthTotal > 0 ? liquidity / monthTotal : null
  const subcategoryInsights = p.expenseStats.subcategoryInsights
  const topCategories = subcategoryInsights.topCategories
  const leadCategory = topCategories[0] ?? null
  const classifiedSharePct = pctOf(monthTotal, subcategoryInsights.totalClassified)
  const unclassifiedSharePct = pctOf(monthTotal, subcategoryInsights.unclassifiedAmount)
  const categoryPalette = [...EXPENSE_CATEGORY_CHART_COLORS]
  const categoryChartData = topCategories.map((category, index) => ({
    ...category,
    fill: categoryPalette[index % categoryPalette.length],
  }))
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
    if (category === "unclassified") return
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
        perfGood={perfGood}
        fixedPct={fixedPct}
        investPct={investPct}
        fixedOver={fixedOver}
        investOver={investOver}
        fixedThreshold={fixedThreshold}
        investTarget={investTarget}
        onLogOpen={() => setLogOpen(true)}
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
        onOpenChange={setLogOpen}
        p={p}
        onSubmit={submitLog}
      />

      <ExpenseBulkDialog p={p} />

      <ExpenseHistorySection
        p={p}
        sectionRef={historySectionRef}
        filtersOpen={filtersOpen}
        onFiltersOpenChange={setFiltersOpen}
        exportingCsv={exportingCsv}
        onExportCsv={() => void exportCsv()}
      />

      <ExpenseRecurringSection
        p={p}
        recurringOpen={recurringOpen}
        onRecurringOpenChange={setRecurringOpen}
      />

      <ExpenseLiquiditySection
        p={p}
        monthTotal={monthTotal}
        runwayMonths={runwayMonths}
        showSummarySkeleton={showSummarySkeleton}
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
