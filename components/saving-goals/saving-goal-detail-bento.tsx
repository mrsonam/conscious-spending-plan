"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Download,
  ArrowLeft,
  Archive,
  ArrowRightLeft,
  CheckCircle2,
  Loader2,
  PiggyBank,
  Target,
  Trash2,
  TrendingUp,
} from "lucide-react"
import { TOKENS, CARD_INSET } from "@/lib/wealth-console-tokens"
import { BENTO } from "@/lib/app-routes"
import { cn } from "@/lib/utils"
import { parseMoneyInput } from "@/lib/money-input"
import { INCOME_PAGE_ERROR_SOFT as ERROR_SOFT } from "@/lib/income-page-types"
import { MajorFigureCurrency } from "@/lib/currency-major-figure"
import { FormStatusAlert } from "@/components/wealth-console/form-status-alert"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useSavingGoalDetail, type SavingGoalLedgerRow } from "@/hooks/use-saving-goal-detail"
import { SavingGoalDetailBentoLoading } from "@/components/saving-goals/saving-goal-detail-bento-loading"
import {
  StatusBadge,
  formatCompleteBy,
  GoalFormModal,
  TransferModal,
} from "@/components/saving-goals/saving-goal-shared"

const SOURCE_LABEL: Record<SavingGoalLedgerRow["source"], string> = {
  income: "Paycheck",
  manual_transfer: "Manual transfer",
  withdrawal: "Withdrawal",
  archive_reset: "Archived",
}

const actionBtn =
  "cursor-pointer rounded-lg border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] transition-colors duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function exportLedgerCsv(goalName: string, ledger: SavingGoalLedgerRow[]) {
  const header = ["Date", "Source", "Amount", "RunningBalance"]
  const lines = [
    header.join(","),
    ...ledger.map((row) =>
      [
        new Date(row.createdAt).toISOString().slice(0, 10),
        SOURCE_LABEL[row.source],
        row.amount.toFixed(2),
        row.runningBalance.toFixed(2),
      ].join(",")
    ),
  ]
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${goalName.toLowerCase().replace(/\s+/g, "-")}-ledger.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function SavingGoalDetailBento({ id }: { id: string }) {
  const {
    goal,
    stats,
    ledger,
    projection,
    loading,
    error,
    message,
    setMessage,
    actionPending,
    handleUpdate,
    handleTransfer,
    handleArchive,
    handleWithdraw,
    handleDelete,
    formatCurrency,
    currencyCode,
  } = useSavingGoalDetail(id)

  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState("")
  const [editTarget, setEditTarget] = useState("")
  const [editPercent, setEditPercent] = useState("")
  const [editSubmitting, setEditSubmitting] = useState(false)

  const [transferOpen, setTransferOpen] = useState(false)
  const [transferAmount, setTransferAmount] = useState("")
  const [transferError, setTransferError] = useState<string | null>(null)
  const [generalSavingsAvailable, setGeneralSavingsAvailable] = useState(0)

  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  if (loading) return <SavingGoalDetailBentoLoading />

  if (error || !goal) {
    return (
      <div
        className="rounded-2xl border border-dashed px-6 py-10 text-center"
        style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurfaceMuted }}
      >
        <p className="text-sm">{error ?? "Saving goal not found"}</p>
        <Link
          href={BENTO.savingGoals}
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.16em] underline-offset-2 hover:underline"
          style={{ color: TOKENS.primary }}
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back to saving goals
        </Link>
      </div>
    )
  }

  const pct = goal.target != null && goal.target > 0
    ? Math.min(100, (goal.current / goal.target) * 100)
    : null
  const canEdit = goal.status === "active"

  const parseTargetField = (value: string): number | null => {
    const trimmed = value.trim()
    if (!trimmed) return null
    return parseMoneyInput(trimmed, currencyCode)
  }

  const openEdit = () => {
    setMessage(null)
    setEditName(goal.name)
    setEditTarget(goal.target != null ? String(goal.target) : "")
    setEditPercent(String(goal.percent))
    setEditOpen(true)
  }

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    setEditSubmitting(true)
    const ok = await handleUpdate({
      name: editName.trim(),
      target: parseTargetField(editTarget),
      percent: Number(editPercent),
    })
    setEditSubmitting(false)
    if (ok) setEditOpen(false)
  }

  const openTransfer = () => {
    setMessage(null)
    setTransferError(null)
    setTransferAmount("")
    setTransferOpen(true)
    void fetch("/api/saving-goals")
      .then((res) => res.json())
      .then((data: { summary?: { generalSavingsAvailable?: number } }) => {
        setGeneralSavingsAvailable(data.summary?.generalSavingsAvailable ?? 0)
      })
      .catch(() => {})
  }

  const submitTransfer = (e: React.FormEvent) => {
    e.preventDefault()
    setTransferError(null)

    let amount: number
    try {
      amount = parseMoneyInput(transferAmount, currencyCode)
      if (!Number.isFinite(amount) || amount <= 0) {
        setTransferError("Amount must be greater than zero.")
        return
      }
    } catch {
      setTransferError("Enter a valid transfer amount.")
      return
    }

    void handleTransfer(amount).then((ok) => {
      if (ok) {
        setTransferOpen(false)
        setTransferAmount("")
      }
    })
  }

  return (
    <div className="w-full min-w-0 space-y-6 sm:space-y-8">
      <Link
        href={BENTO.savingGoals}
        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] underline-offset-2 hover:underline"
        style={{ color: TOKENS.onSurfaceMuted }}
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Saving goals
      </Link>

      <section className="px-1 py-2 sm:px-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl" style={{ color: TOKENS.onSurface }}>
            {goal.name}
          </h2>
          <StatusBadge status={goal.status} />
        </div>
        <p className="mt-2 text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
          {goal.percent}% of savings allocation
        </p>
        <div className="mt-4 flex items-baseline gap-2">
          <MajorFigureCurrency
            amount={goal.current}
            variant="income"
            className="text-3xl font-black tabular-nums"
            decimalEm={0.45}
          />
          <span className="text-sm tabular-nums" style={{ color: TOKENS.onSurfaceMuted }}>
            {goal.target != null ? `of ${formatCurrency(goal.target)}` : "No target set"}
          </span>
        </div>
        {pct != null ? (
          <div className="mt-3 h-2 w-full max-w-md overflow-hidden rounded-full" style={{ background: TOKENS.surfaceHigh }}>
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: TOKENS.primary }} />
          </div>
        ) : null}

        {goal.status === "active" && goal.target != null && goal.current < goal.target ? (
          projection ? (
            <p className="mt-3 flex items-center gap-1.5 text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
              <TrendingUp className="h-3.5 w-3.5 shrink-0" style={{ color: TOKENS.primary }} aria-hidden />
              <span>
                On pace for{" "}
                <span className="font-semibold" style={{ color: TOKENS.onSurface }}>
                  {formatCompleteBy(projection.completeBy)}
                </span>{" "}
                · ≈{formatCurrency(projection.monthlyPace)}/mo from recent allocations
              </span>
            </p>
          ) : (
            <p className="mt-3 text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
              No contributions in the last 90 days. No completion estimate yet.
            </p>
          )
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          {canEdit ? (
            <>
              <button
                type="button"
                onClick={openEdit}
                disabled={actionPending}
                className={actionBtn}
                style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurfaceMuted }}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={openTransfer}
                disabled={actionPending}
                className={cn(actionBtn, "inline-flex items-center gap-1")}
                style={{
                  borderColor: `color-mix(in srgb, ${TOKENS.primary} 40%, transparent)`,
                  color: TOKENS.primary,
                }}
              >
                {actionPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                ) : (
                  <ArrowRightLeft className="h-3 w-3" aria-hidden />
                )}
                Transfer
              </button>
            </>
          ) : null}
          {goal.status === "complete" ? (
            <button
              type="button"
              onClick={() => void handleWithdraw()}
              disabled={actionPending}
              className={cn(actionBtn, "inline-flex items-center gap-1")}
              style={{
                borderColor: `color-mix(in srgb, ${TOKENS.primary} 40%, transparent)`,
                color: TOKENS.primary,
              }}
            >
              {actionPending ? (
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              ) : (
                <CheckCircle2 className="h-3 w-3" aria-hidden />
              )}
              Withdraw
            </button>
          ) : null}
          {goal.status !== "archived" ? (
            <button
              type="button"
              onClick={() => setArchiveConfirmOpen(true)}
              disabled={actionPending}
              className={cn(actionBtn, "inline-flex items-center gap-1")}
              style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurfaceMuted }}
            >
              {actionPending ? (
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              ) : (
                <Archive className="h-3 w-3" aria-hidden />
              )}
              Archive
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setDeleteConfirmOpen(true)}
            disabled={actionPending}
            className={cn(actionBtn, "inline-flex items-center gap-1")}
            style={{
              borderColor: `color-mix(in srgb, ${ERROR_SOFT} 35%, transparent)`,
              color: ERROR_SOFT,
            }}
          >
            {actionPending ? (
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
            ) : (
              <Trash2 className="h-3 w-3" aria-hidden />
            )}
            Delete
          </button>
        </div>
      </section>

      <FormStatusAlert message={message} />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total contributed", value: formatCurrency(stats?.totalContributed ?? 0), icon: PiggyBank },
          { label: "From paychecks", value: formatCurrency(stats?.fromPaychecks ?? 0), icon: TrendingUp },
          { label: "Manual transfers", value: formatCurrency(stats?.fromManualTransfers ?? 0), icon: Target },
          { label: "Withdrawn", value: formatCurrency(stats?.withdrawn ?? 0), icon: ArrowLeft },
        ].map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-2xl border p-4"
            style={{ borderColor: TOKENS.outlineGhost, background: TOKENS.surfaceContainer, boxShadow: CARD_INSET }}
          >
            <div className="flex items-center gap-2">
              <Icon className="h-3.5 w-3.5" style={{ color: TOKENS.primary }} aria-hidden />
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: TOKENS.onSurfaceMuted }}>
                {label}
              </p>
            </div>
            <p className="mt-2 text-lg font-black tabular-nums" style={{ color: TOKENS.onSurface }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      <div
        className="rounded-2xl border p-5 sm:p-6"
        style={{ borderColor: TOKENS.outlineGhost, background: TOKENS.surfaceContainer, boxShadow: CARD_INSET }}
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: TOKENS.onSurfaceMuted }}>
            Allocation history
          </h3>
          {ledger.length > 0 ? (
            <button
              type="button"
              onClick={() => exportLedgerCsv(goal.name, ledger)}
              className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide hover:bg-white/5"
              style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurfaceMuted }}
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              CSV
            </button>
          ) : null}
        </div>

        {ledger.length === 0 ? (
          <p className="mt-4 text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
            No activity yet.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[480px] text-[13px]">
              <thead>
                <tr style={{ color: TOKENS.onSurfaceMutedElevated }}>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider">Date</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider">Source</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider">Amount</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider">Balance</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((row) => (
                  <tr key={row.id} className="border-t" style={{ borderColor: TOKENS.outlineGhost }}>
                    <td className="px-3 py-2.5 text-left" style={{ color: TOKENS.onSurfaceMuted }}>
                      {formatDate(row.createdAt)}
                    </td>
                    <td className="px-3 py-2.5 text-left" style={{ color: TOKENS.onSurface }}>
                      {SOURCE_LABEL[row.source]}
                    </td>
                    <td
                      className="px-3 py-2.5 text-right font-semibold tabular-nums"
                      style={{ color: row.amount >= 0 ? TOKENS.primary : TOKENS.loss }}
                    >
                      {row.amount >= 0 ? "+" : "−"}
                      {formatCurrency(Math.abs(row.amount))}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: TOKENS.onSurfaceMuted }}>
                      {formatCurrency(row.runningBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <GoalFormModal
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        title="Edit goal"
        description="Changes apply to future income only."
        name={editName}
        target={editTarget}
        percent={editPercent}
        onNameChange={setEditName}
        onTargetChange={setEditTarget}
        onPercentChange={setEditPercent}
        fieldErrors={{}}
        clearFieldError={() => {}}
        formError={null}
        submitting={editSubmitting || actionPending}
        submitLabel="Save changes"
        onSubmit={submitEdit}
      />

      <TransferModal
        open={transferOpen}
        onOpenChange={setTransferOpen}
        goal={goal}
        availableAmount={generalSavingsAvailable}
        formatCurrency={formatCurrency}
        submitting={actionPending}
        formError={transferError}
        amount={transferAmount}
        onAmountChange={setTransferAmount}
        onSubmit={submitTransfer}
      />

      <ConfirmDialog
        open={archiveConfirmOpen}
        onOpenChange={setArchiveConfirmOpen}
        title="Archive saving goal"
        description="This goal will stop receiving allocations and move to your archived list. You can still view its history."
        confirmText="Archive"
        cancelText="Cancel"
        onConfirm={() => void handleArchive()}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete saving goal"
        description="This permanently removes the goal and its credit history. This cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={() => void handleDelete()}
      />
    </div>
  )
}
