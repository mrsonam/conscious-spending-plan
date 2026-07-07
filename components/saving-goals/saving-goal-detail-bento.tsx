"use client"

import Link from "next/link"
import { Download, ArrowLeft, PiggyBank, Target, TrendingUp } from "lucide-react"
import { TOKENS, CARD_INSET } from "@/lib/wealth-console-tokens"
import { BENTO } from "@/lib/app-routes"
import { MajorFigureCurrency } from "@/lib/currency-major-figure"
import { FormStatusAlert } from "@/components/wealth-console/form-status-alert"
import { useSavingGoalDetail, type SavingGoalLedgerRow } from "@/hooks/use-saving-goal-detail"
import { SavingGoalDetailBentoLoading } from "@/components/saving-goals/saving-goal-detail-bento-loading"

const SOURCE_LABEL: Record<SavingGoalLedgerRow["source"], string> = {
  income: "Paycheck",
  manual_transfer: "Manual transfer",
  withdrawal: "Withdrawal",
  archive_reset: "Archived",
}

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
    loading,
    error,
    message,
    formatCurrency,
  } = useSavingGoalDetail(id)

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
        <h2 className="text-2xl font-black tracking-tight sm:text-3xl" style={{ color: TOKENS.onSurface }}>
          {goal.name}
        </h2>
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
    </div>
  )
}
