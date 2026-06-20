"use client"

import { useState, useEffect } from "react"
import { Check, X, CheckCheck } from "lucide-react"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AppSelect } from "@/components/ui/app-select"
import { cn } from "@/lib/utils"
import { TOKENS, CARD_INSET } from "@/lib/wealth-console-tokens"
import { consoleFocus } from "@/components/wealth-console/console-ui"
import { useFormatCurrency } from "@/hooks/use-format-currency"
import { toastError, toastSuccess } from "@/lib/app-toast"
import { formatInvestmentDateShort } from "@/components/investments/investment-shared"
import { EXPENSE_CATEGORIES } from "@/lib/expense-page-constants"

type PendingTransaction = {
  id: string
  type: "expense"
  amount: number
  description: string | null
  date: string
  account: string
  autoCategory: string | null
  autoExpenseCategory: string | null
  syncStatus: string
}

const PILLAR_OPTIONS = [
  { value: "fixedCosts", label: "Fixed Costs" },
  { value: "savings", label: "Savings" },
  { value: "investment", label: "Investment" },
  { value: "guiltFreeSpending", label: "Guilt-free" },
]

type TransactionReviewProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onReviewComplete: (approvedCount: number) => void
}

export function TransactionReview({
  open,
  onOpenChange,
  onReviewComplete,
}: TransactionReviewProps) {
  const { formatCurrency } = useFormatCurrency()
  const [pending, setPending] = useState<PendingTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [edits, setEdits] = useState<
    Record<string, { category?: string; expenseCategory?: string }>
  >({})

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch("/api/basiq/pending")
      .then((r) => r.json())
      .then((data: { pending: PendingTransaction[] }) => {
        setPending(data.pending ?? [])
        setEdits({})
      })
      .catch(() => toastError("Failed to load pending transactions"))
      .finally(() => setLoading(false))
  }, [open])

  const handleApprove = async (id: string) => {
    setSubmitting(true)
    try {
      const edit = edits[id]
      const res = await fetch("/api/basiq/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actions: [{ id, action: "approve", ...edit }],
        }),
      })
      if (!res.ok) {
        toastError("Failed to approve")
        return
      }
      setPending((p) => p.filter((t) => t.id !== id))
      onReviewComplete(1)
    } catch {
      toastError("Failed to approve")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDismiss = async (id: string) => {
    setSubmitting(true)
    try {
      const res = await fetch("/api/basiq/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actions: [{ id, action: "dismiss" }] }),
      })
      if (!res.ok) {
        toastError("Failed to dismiss")
        return
      }
      setPending((p) => p.filter((t) => t.id !== id))
      onReviewComplete(0)
    } catch {
      toastError("Failed to dismiss")
    } finally {
      setSubmitting(false)
    }
  }

  const handleApproveAll = async () => {
    setSubmitting(true)
    try {
      const actions = pending.map((t) => ({
        id: t.id,
        action: "approve" as const,
        ...edits[t.id],
      }))
      const res = await fetch("/api/basiq/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actions }),
      })
      if (!res.ok) {
        toastError("Failed to approve all")
        return
      }
      const count = pending.length
      setPending([])
      onReviewComplete(count)
      toastSuccess(`Approved ${count} transactions.`)
      onOpenChange(false)
    } catch {
      toastError("Failed to approve all")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="relative max-h-[90vh] overflow-y-auto border p-0 shadow-2xl"
        style={{
          background: TOKENS.surfaceContainer,
          borderColor: TOKENS.outlineGhost,
        }}
      >
        <DialogClose onClose={() => onOpenChange(false)} />
        <div className="p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="text-xl" style={{ color: TOKENS.onSurface }}>
              Review transactions
            </DialogTitle>
            <DialogDescription style={{ color: TOKENS.onSurfaceMuted }}>
              Confirm categories or dismiss transactions that shouldn't count toward your budget.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <p className="mt-6 text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
              Loading…
            </p>
          ) : pending.length === 0 ? (
            <p className="mt-6 text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
              No pending transactions.
            </p>
          ) : (
            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={handleApproveAll}
                disabled={submitting}
                className={cn(
                  "inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-lg py-2 text-[11px] font-bold uppercase tracking-[0.18em] disabled:opacity-50",
                  consoleFocus,
                )}
                style={{ background: TOKENS.primary, color: TOKENS.surface }}
              >
                <CheckCheck className="h-4 w-4" />
                Approve all ({pending.length})
              </button>

              {pending.map((tx) => (
                <div
                  key={tx.id}
                  className="rounded-xl border p-3"
                  style={{ borderColor: TOKENS.outlineGhost, background: TOKENS.surfaceLow, boxShadow: CARD_INSET }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold" style={{ color: TOKENS.onSurface }}>
                        {tx.description ?? "Unknown"}
                      </p>
                      <p className="text-[10px]" style={{ color: TOKENS.onSurfaceMuted }}>
                        {formatInvestmentDateShort(tx.date)} · {tx.account}
                      </p>
                    </div>
                    <p className="text-sm font-bold tabular-nums" style={{ color: TOKENS.secondary }}>
                      {formatCurrency(tx.amount)}
                    </p>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <AppSelect
                      value={edits[tx.id]?.category ?? tx.autoCategory ?? "guiltFreeSpending"}
                      onValueChange={(v) =>
                        setEdits((p) => ({ ...p, [tx.id]: { ...p[tx.id], category: v } }))
                      }
                      options={PILLAR_OPTIONS}
                      className="flex-1 text-[11px]"
                    />
                    <AppSelect
                      value={edits[tx.id]?.expenseCategory ?? tx.autoExpenseCategory ?? "other"}
                      onValueChange={(v) =>
                        setEdits((p) => ({ ...p, [tx.id]: { ...p[tx.id], expenseCategory: v } }))
                      }
                      options={EXPENSE_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
                      className="flex-1 text-[11px]"
                    />
                    <button
                      type="button"
                      onClick={() => handleApprove(tx.id)}
                      disabled={submitting}
                      className={cn("rounded-md p-1.5 transition-colors hover:bg-white/[0.04]", consoleFocus)}
                      style={{ color: TOKENS.primary }}
                      title="Approve"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDismiss(tx.id)}
                      disabled={submitting}
                      className={cn("rounded-md p-1.5 transition-colors hover:bg-white/[0.04]", consoleFocus)}
                      style={{ color: TOKENS.onSurfaceMuted }}
                      title="Dismiss"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
