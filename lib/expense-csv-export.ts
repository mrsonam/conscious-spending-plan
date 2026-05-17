import type { ExpenseEntry } from "@/lib/expense-page-types"
import { FUND_CATEGORIES, EXPENSE_CATEGORIES } from "@/lib/expense-page-constants"

function fundLabel(v: string | null) {
  if (!v) return ""
  return FUND_CATEGORIES.find((c) => c.value === v)?.label ?? v
}

function expenseLabel(v: string | null) {
  if (!v) return ""
  return EXPENSE_CATEGORIES.find((c) => c.value === v)?.label ?? v
}

function csvCell(value: string) {
  return value.replace(/,/g, " ").replace(/"/g, '""')
}

export type ExpenseExportFilters = {
  startDate?: string
  endDate?: string
  fundCategory?: string
  expenseCategory?: string
  accountId?: string
}

export async function fetchAllExpensesForExport(
  filters: ExpenseExportFilters,
): Promise<ExpenseEntry[]> {
  const rows: ExpenseEntry[] = []
  let page = 1
  let total = 0

  do {
    const params = new URLSearchParams()
    if (filters.startDate) params.append("startDate", filters.startDate)
    if (filters.endDate) params.append("endDate", filters.endDate)
    if (filters.fundCategory) params.append("category", filters.fundCategory)
    if (filters.expenseCategory)
      params.append("expenseCategory", filters.expenseCategory)
    if (filters.accountId) params.append("accountId", filters.accountId)
    params.set("page", String(page))
    params.set("limit", "50")
    params.set("includeSummary", "false")

    const res = await fetch(`/api/expenses?${params.toString()}`)
    if (!res.ok) throw new Error("Export failed")
    const data = (await res.json()) as {
      expenses?: ExpenseEntry[]
      total?: number
    }
    const batch = data.expenses ?? []
    total = data.total ?? batch.length
    rows.push(...batch)
    if (batch.length === 0) break
    page += 1
  } while (rows.length < total)

  return rows
}

export function buildExpensesCsv(entries: ExpenseEntry[]) {
  const header = [
    "Date",
    "Amount",
    "Description",
    "Fund",
    "Expense type",
    "Account",
  ]
  const lines = [
    header.join(","),
    ...entries.map((row) => {
      const ac = row.account
        ? `${row.account.bankName} ${row.account.name}`.replace(/,/g, " ")
        : ""
      return [
        row.date.slice(0, 10),
        row.amount,
        csvCell(row.description ?? ""),
        csvCell(fundLabel(row.category)),
        csvCell(expenseLabel(row.expenseCategory)),
        csvCell(ac),
      ].join(",")
    }),
  ]
  return lines.join("\n")
}

export function downloadCsvFile(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
