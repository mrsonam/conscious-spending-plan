"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { MajorFigureCurrency } from "@/lib/currency-major-figure"
import { parseMoneyInput } from "@/lib/money-input"
import { INCOME_PAGE_ERROR_SOFT as ERROR_SOFT } from "@/lib/income-page-types"
import { BENTO } from "@/lib/app-routes"
import { cn } from "@/lib/utils"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import {
  useSavingGoalsPage,
  type SavingGoalRow,
} from "@/hooks/use-saving-goals-page"
import { SavingGoalsPageBentoLoading } from "@/components/saving-goals/saving-goals-page-bento-loading"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { FormErrorAlert, FormStatusAlert } from "@/components/wealth-console/form-status-alert"
import { isOptimisticClientId } from "@/lib/optimistic-id"
import {
  FormFieldError,
  formFieldAria,
} from "@/components/forms/form-field-error"
import {
  Archive,
  ArrowRightLeft,
  CheckCircle2,
  Loader2,
  PiggyBank,
  Plus,
  Target,
  Trash2,
  Wallet,
} from "lucide-react"

const consoleField =
  "w-full rounded-xl border px-3 py-2.5 text-sm tabular-nums transition-[box-shadow] focus:outline-none focus:ring-2 focus:ring-[#4edea3]/45 [color-scheme:dark]"

const modalShellStyle = {
  background: TOKENS.surfaceContainer,
  borderColor: TOKENS.outlineGhost,
  boxShadow:
    "0 24px 48px rgba(0,0,0,0.5), inset 0 1px 0 0 rgba(218,226,253,0.06)",
} as const

const fieldStyle = {
  backgroundColor: TOKENS.surfaceLow,
  borderColor: TOKENS.outlineGhost,
  color: TOKENS.onSurface,
} as const

const labelClass =
  "text-[10px] font-semibold uppercase tracking-wider"

function GoalProgressBar({
  current,
  target,
  accent,
}: {
  current: number
  target: number | null
  accent: string
}) {
  if (target == null || target <= 0) {
    return (
      <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.14em]" style={{ color: TOKENS.onSurfaceMuted }}>
        Open-ended · no target
      </p>
    )
  }

  const pct = Math.min(100, (current / target) * 100)
  return (
    <div
      className="mt-3 h-2 overflow-hidden rounded-full"
      style={{ background: TOKENS.surfaceHigh }}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none"
        style={{ width: `${pct}%`, background: accent }}
      />
    </div>
  )
}

function StatusBadge({ status }: { status: SavingGoalRow["status"] }) {
  const styles =
    status === "active"
      ? {
          bg: `color-mix(in srgb, ${TOKENS.primary} 18%, transparent)`,
          color: TOKENS.primary,
          label: "Active",
        }
      : status === "complete"
        ? {
            bg: `color-mix(in srgb, ${TOKENS.secondary} 18%, transparent)`,
            color: TOKENS.secondary,
            label: "Complete",
          }
        : {
            bg: TOKENS.surfaceHigh,
            color: TOKENS.onSurfaceMuted,
            label: "Archived",
          }

  return (
    <span
      className="inline-flex rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]"
      style={{ background: styles.bg, color: styles.color }}
    >
      {styles.label}
    </span>
  )
}

function GoalCard({
  goal,
  formatCurrency,
  actionGoalId,
  onEdit,
  onTransfer,
  onArchive,
  onWithdraw,
  onDelete,
}: {
  goal: SavingGoalRow
  formatCurrency: (n: number) => string
  actionGoalId: string | null
  onEdit: (goal: SavingGoalRow) => void
  onTransfer: (goal: SavingGoalRow) => void
  onArchive: (id: string) => void
  onWithdraw: (id: string) => void
  onDelete: (id: string) => void
}) {
  const busy = actionGoalId === goal.id
  const pendingSave = isOptimisticClientId(goal.id)
  const canEdit = goal.status === "active"
  const actionBtn =
    "cursor-pointer rounded-lg border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] transition-colors duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"

  return (
    <div
      className="relative overflow-hidden rounded-2xl border transition-colors duration-200"
      style={{
        background: TOKENS.surfaceContainer,
        borderColor: TOKENS.outlineGhost,
        boxShadow: CARD_INSET,
      }}
    >
      <div className="h-1 w-full opacity-95" style={{ background: TOKENS.primary }} />
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold" style={{ color: TOKENS.onSurface }}>
                {goal.name}
              </h3>
              <StatusBadge status={goal.status} />
            </div>
            <p className="mt-1 text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
              {goal.percent}% of savings allocation
            </p>
          </div>
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
            style={{
              borderColor: TOKENS.outlineGhost,
              background: `color-mix(in srgb, ${TOKENS.primary} 16%, ${TOKENS.surfaceHigh})`,
            }}
          >
            <Target className="h-5 w-5" style={{ color: TOKENS.primary }} aria-hidden />
          </div>
        </div>

        <div className="mt-4 flex items-baseline justify-between gap-2">
          <MajorFigureCurrency
            amount={goal.current}
            variant="income"
            className="text-xl font-black tabular-nums"
            decimalEm={0.45}
          />
          <span className="text-xs tabular-nums" style={{ color: TOKENS.onSurfaceMuted }}>
            {goal.target != null ? `of ${formatCurrency(goal.target)}` : "No target set"}
          </span>
        </div>

        <GoalProgressBar current={goal.current} target={goal.target} accent={TOKENS.primary} />

        <div className="mt-4 flex flex-wrap gap-2">
          {canEdit ? (
            <>
              <button
                type="button"
                onClick={() => onEdit(goal)}
                disabled={busy || pendingSave}
                title={pendingSave ? "Goal is still being saved" : undefined}
                className={actionBtn}
                style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurfaceMuted }}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => onTransfer(goal)}
                disabled={busy || pendingSave}
                title={pendingSave ? "Goal is still being saved" : undefined}
                className={cn(actionBtn, "inline-flex items-center gap-1")}
                style={{
                  borderColor: `color-mix(in srgb, ${TOKENS.primary} 40%, transparent)`,
                  color: TOKENS.primary,
                }}
              >
                {busy ? (
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
              onClick={() => onWithdraw(goal.id)}
              disabled={busy}
              className={cn(actionBtn, "inline-flex items-center gap-1")}
              style={{
                borderColor: `color-mix(in srgb, ${TOKENS.primary} 40%, transparent)`,
                color: TOKENS.primary,
              }}
            >
              {busy ? (
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
              onClick={() => onArchive(goal.id)}
              disabled={busy}
              className={cn(actionBtn, "inline-flex items-center gap-1")}
              style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurfaceMuted }}
            >
              {busy ? (
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              ) : (
                <Archive className="h-3 w-3" aria-hidden />
              )}
              Archive
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onDelete(goal.id)}
            disabled={busy}
            className={cn(actionBtn, "inline-flex items-center gap-1")}
            style={{
              borderColor: `color-mix(in srgb, ${ERROR_SOFT} 35%, transparent)`,
              color: ERROR_SOFT,
            }}
          >
            {busy ? (
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
            ) : (
              <Trash2 className="h-3 w-3" aria-hidden />
            )}
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

type TransferModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal: SavingGoalRow | null
  availableAmount: number
  formatCurrency: (n: number) => string
  submitting: boolean
  formError: string | null
  amount: string
  onAmountChange: (v: string) => void
  onSubmit: (e: React.FormEvent) => void
}

function TransferModal({
  open,
  onOpenChange,
  goal,
  availableAmount,
  formatCurrency,
  submitting,
  formError,
  amount,
  onAmountChange,
  onSubmit,
}: TransferModalProps) {
  const amountId = "transfer-amount"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="relative max-h-[90vh] overflow-y-auto border p-0 shadow-2xl"
        style={modalShellStyle}
      >
        <DialogClose onClose={() => onOpenChange(false)} />
        <div className="p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="text-xl" style={{ color: TOKENS.onSurface }}>
              Transfer to {goal?.name ?? "goal"}
            </DialogTitle>
            <DialogDescription
              className="text-sm leading-relaxed"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              Move funds from your general savings pool into this goal.{" "}
              {formatCurrency(availableAmount)} available in general savings.
            </DialogDescription>
          </DialogHeader>
          <form
            noValidate
            className="mt-6 space-y-5"
            onSubmit={onSubmit}
            inert={submitting}
          >
            <FormErrorAlert error={formError} />
            <fieldset disabled={submitting} className="min-w-0 space-y-5 border-0 p-0">
              <div>
                <Label htmlFor={amountId} className={labelClass} style={{ color: TOKENS.onSurfaceMuted }}>
                  Amount *
                </Label>
                <Input
                  id={amountId}
                  value={amount}
                  onChange={(e) => onAmountChange(e.target.value)}
                  disabled={submitting}
                  className={cn(consoleField, "mt-1 border-transparent")}
                  style={fieldStyle}
                  placeholder="0.00"
                  inputMode="decimal"
                  aria-invalid={formError ? true : undefined}
                />
              </div>
            </fieldset>
            <button
              type="submit"
              disabled={submitting || availableAmount <= 0}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-bold uppercase tracking-[0.18em] transition-opacity duration-200 hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: TOKENS.primary, color: TOKENS.surface }}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Transferring…
                </>
              ) : (
                "Transfer funds"
              )}
            </button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}

type GoalFormModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  title: string
  description: string
  name: string
  target: string
  percent: string
  onNameChange: (v: string) => void
  onTargetChange: (v: string) => void
  onPercentChange: (v: string) => void
  fieldErrors: Partial<Record<"name" | "target" | "percent", string>>
  clearFieldError: (key: "name" | "target" | "percent") => void
  formError: string | null
  submitting: boolean
  unassignedHint?: string
  submitLabel: string
  onSubmit: (e: React.FormEvent) => void
}

function GoalFormModal({
  open,
  onOpenChange,
  mode,
  title,
  description,
  name,
  target,
  percent,
  onNameChange,
  onTargetChange,
  onPercentChange,
  fieldErrors,
  clearFieldError,
  formError,
  submitting,
  unassignedHint,
  submitLabel,
  onSubmit,
}: GoalFormModalProps) {
  const nameId = mode === "create" ? "goal-name" : "edit-goal-name"
  const targetId = mode === "create" ? "goal-target" : "edit-goal-target"
  const percentId = mode === "create" ? "goal-percent" : "edit-goal-percent"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="relative max-h-[90vh] overflow-y-auto border p-0 shadow-2xl"
        style={modalShellStyle}
      >
        <DialogClose onClose={() => onOpenChange(false)} />
        <div className="p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="text-xl" style={{ color: TOKENS.onSurface }}>
              {title}
            </DialogTitle>
            <DialogDescription
              className="text-sm leading-relaxed"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              {description}
            </DialogDescription>
          </DialogHeader>
          <form
            noValidate
            className="mt-6 space-y-5"
            onSubmit={onSubmit}
            inert={submitting}
          >
            <FormErrorAlert error={formError} />
            <fieldset disabled={submitting} className="min-w-0 space-y-5 border-0 p-0">
              <div>
                <Label htmlFor={nameId} className={labelClass} style={{ color: TOKENS.onSurfaceMuted }}>
                  Name *
                </Label>
                <Input
                  id={nameId}
                  value={name}
                  onChange={(e) => {
                    onNameChange(e.target.value)
                    clearFieldError("name")
                  }}
                  disabled={submitting}
                  className={cn(consoleField, "mt-1 border-transparent")}
                  style={fieldStyle}
                  placeholder="New phone"
                  {...formFieldAria(nameId, fieldErrors.name)}
                />
                <FormFieldError controlId={nameId} message={fieldErrors.name} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor={targetId} className={labelClass} style={{ color: TOKENS.onSurfaceMuted }}>
                    Target amount (optional)
                  </Label>
                  <Input
                    id={targetId}
                    value={target}
                    onChange={(e) => {
                      onTargetChange(e.target.value)
                      clearFieldError("target")
                    }}
                    disabled={submitting}
                    className={cn(consoleField, "mt-1 border-transparent")}
                    style={fieldStyle}
                    placeholder="Leave blank for open-ended"
                    inputMode="decimal"
                    {...formFieldAria(targetId, fieldErrors.target)}
                  />
                  <FormFieldError controlId={targetId} message={fieldErrors.target} />
                </div>
                <div>
                  <Label htmlFor={percentId} className={labelClass} style={{ color: TOKENS.onSurfaceMuted }}>
                    % of savings *
                  </Label>
                  <Input
                    id={percentId}
                    value={percent}
                    onChange={(e) => {
                      onPercentChange(e.target.value)
                      clearFieldError("percent")
                    }}
                    disabled={submitting}
                    className={cn(consoleField, "mt-1 border-transparent")}
                    style={fieldStyle}
                    placeholder="10"
                    inputMode="decimal"
                    {...formFieldAria(percentId, fieldErrors.percent)}
                  />
                  <FormFieldError controlId={percentId} message={fieldErrors.percent} />
                </div>
              </div>
              {unassignedHint ? (
                <p className="text-[11px] leading-relaxed" style={{ color: TOKENS.onSurfaceMuted }}>
                  {unassignedHint}
                </p>
              ) : null}
            </fieldset>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold uppercase tracking-[0.2em] transition-opacity duration-200 disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                background: TOKENS.primary,
                color: TOKENS.surface,
                boxShadow: "0 12px 28px rgba(0,0,0,0.25)",
              }}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
              ) : (
                <Plus className="h-4 w-4" aria-hidden />
              )}
              {submitting ? "Saving…" : submitLabel}
            </button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function SavingGoalsPageBento({
  authStatus,
}: {
  authStatus: "loading" | "authenticated" | "unauthenticated"
}) {
  const {
    goals,
    summary,
    loading,
    message,
    formError,
    fieldErrors,
    clearFieldError,
    name,
    setName,
    target,
    setTarget,
    percent,
    setPercent,
    submitting,
    actionGoalId,
    handleCreate,
    handleUpdate,
    handleArchive,
    handleTransfer,
    handleWithdraw,
    handleDelete,
    resetForm,
    formatCurrency,
    currencyCode,
    setMessage,
    targetPayload,
  } = useSavingGoalsPage(authStatus)

  const [createOpen, setCreateOpen] = useState(false)
  const [editGoal, setEditGoal] = useState<SavingGoalRow | null>(null)
  const [editName, setEditName] = useState("")
  const [editTarget, setEditTarget] = useState("")
  const [editPercent, setEditPercent] = useState("")
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [archiveConfirmId, setArchiveConfirmId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [transferGoal, setTransferGoal] = useState<SavingGoalRow | null>(null)
  const [transferAmount, setTransferAmount] = useState("")
  const [transferError, setTransferError] = useState<string | null>(null)

  const activeGoals = useMemo(
    () => goals.filter((g) => g.status === "active"),
    [goals]
  )
  const completedGoals = useMemo(
    () => goals.filter((g) => g.status === "complete"),
    [goals]
  )
  const archivedGoals = useMemo(
    () => goals.filter((g) => g.status === "archived"),
    [goals]
  )

  const openCreate = () => {
    setMessage(null)
    resetForm()
    setEditGoal(null)
    setCreateOpen(true)
  }

  const openEdit = (goal: SavingGoalRow) => {
    setMessage(null)
    setCreateOpen(false)
    setEditGoal(goal)
    setEditName(goal.name)
    setEditTarget(goal.target != null ? String(goal.target) : "")
    setEditPercent(String(goal.percent))
  }

  const parseTargetField = (value: string): number | null => targetPayload(value)

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editGoal) return
    setEditSubmitting(true)
    const ok = await handleUpdate(editGoal.id, {
      name: editName.trim(),
      target: parseTargetField(editTarget),
      percent: Number(editPercent),
    })
    setEditSubmitting(false)
    if (ok) setEditGoal(null)
  }

  const openTransfer = (goal: SavingGoalRow) => {
    setMessage(null)
    setTransferError(null)
    setTransferAmount("")
    setTransferGoal(goal)
  }

  const submitTransfer = (e: React.FormEvent) => {
    e.preventDefault()
    if (!transferGoal) return
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

    void handleTransfer(transferGoal.id, amount).then((ok) => {
      if (ok) {
        setTransferGoal(null)
        setTransferAmount("")
      }
    })
  }

  const submitCreate = async (e: React.FormEvent) => {
    const ok = await handleCreate(e)
    if (ok) setCreateOpen(false)
  }

  if (loading) {
    return <SavingGoalsPageBentoLoading />
  }

  return (
    <div className="w-full min-w-0 space-y-8 sm:space-y-10">
      <section
        className="relative w-full overflow-hidden rounded-2xl border px-5 py-7 sm:px-8 sm:py-9"
        style={{
          borderColor: TOKENS.outlineGhost,
          background: TOKENS.surfaceContainer,
          boxShadow: CARD_INSET,
        }}
      >
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: TOKENS.primary }} />
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.28em]"
                style={{ color: TOKENS.onSurfaceMuted }}
              >
                Saving goals
              </p>
            </div>
            <h2
              className="mt-5 text-2xl font-black leading-[1.15] tracking-tight sm:text-3xl"
              style={{ color: TOKENS.onSurface }}
            >
              Split savings into named targets
            </h2>
            <p
              className="mt-4 max-w-3xl text-sm leading-relaxed sm:text-[15px]"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              Each goal takes a percentage of your savings-bucket allocation on every paycheck.
              You can also move funds from your general savings pool into a goal manually.
            </p>
            <Link
              href={BENTO.funds}
              className="mt-4 inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold underline-offset-2 transition-colors duration-200 hover:underline"
              style={{ color: TOKENS.primary }}
            >
              <Wallet className="h-3.5 w-3.5" aria-hidden />
              Fund Settings
            </Link>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl px-5 py-3 text-xs font-bold uppercase tracking-[0.18em] transition-opacity duration-200 hover:opacity-95"
            style={{ background: TOKENS.primary, color: TOKENS.surface }}
          >
            <Plus className="h-4 w-4" aria-hidden />
            New goal
          </button>
        </div>
      </section>

      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Active goals", value: String(summary.activeCount), icon: PiggyBank },
          { label: "Assigned", value: `${summary.assignedPercent}%`, icon: Target },
          {
            label: "General savings",
            value: formatCurrency(summary.generalSavingsAvailable),
            icon: Wallet,
          },
        ].map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-2xl border p-4 sm:p-5"
            style={{
              borderColor: TOKENS.outlineGhost,
              background: TOKENS.surfaceContainer,
              boxShadow: CARD_INSET,
            }}
          >
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4" style={{ color: TOKENS.primary }} aria-hidden />
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.2em]"
                style={{ color: TOKENS.onSurfaceMuted }}
              >
                {label}
              </p>
            </div>
            <p className="mt-2 text-2xl font-black tabular-nums" style={{ color: TOKENS.onSurface }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      <FormStatusAlert message={message} />

      {activeGoals.length > 0 ? (
        <section className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: TOKENS.onSurfaceMuted }}>
            Active
          </h3>
          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                formatCurrency={formatCurrency}
                actionGoalId={actionGoalId}
                onEdit={openEdit}
                onTransfer={openTransfer}
                onArchive={setArchiveConfirmId}
                onWithdraw={handleWithdraw}
                onDelete={setDeleteConfirmId}
              />
            ))}
          </div>
        </section>
      ) : (
        <div
          className="rounded-2xl border border-dashed px-6 py-10 text-center"
          style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurfaceMuted }}
        >
          <PiggyBank className="mx-auto h-8 w-8 opacity-60" aria-hidden />
          <p className="mt-3 text-sm">No active saving goals yet.</p>
          <button
            type="button"
            onClick={openCreate}
            className="mt-4 cursor-pointer text-xs font-bold uppercase tracking-[0.16em] underline-offset-2 transition-colors duration-200 hover:underline"
            style={{ color: TOKENS.primary }}
          >
            Create your first goal
          </button>
        </div>
      )}

      {completedGoals.length > 0 ? (
        <section className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: TOKENS.onSurfaceMuted }}>
            Completed
          </h3>
          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {completedGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                formatCurrency={formatCurrency}
                actionGoalId={actionGoalId}
                onEdit={openEdit}
                onTransfer={openTransfer}
                onArchive={setArchiveConfirmId}
                onWithdraw={handleWithdraw}
                onDelete={setDeleteConfirmId}
              />
            ))}
          </div>
        </section>
      ) : null}

      {archivedGoals.length > 0 ? (
        <section className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: TOKENS.onSurfaceMuted }}>
            Archived
          </h3>
          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {archivedGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                formatCurrency={formatCurrency}
                actionGoalId={actionGoalId}
                onEdit={openEdit}
                onTransfer={openTransfer}
                onArchive={setArchiveConfirmId}
                onWithdraw={handleWithdraw}
                onDelete={setDeleteConfirmId}
              />
            ))}
          </div>
        </section>
      ) : null}

      <GoalFormModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        title="New saving goal"
        description="Set a % of your savings allocation. Target is optional — leave blank for open-ended goals."
        name={name}
        target={target}
        percent={percent}
        onNameChange={setName}
        onTargetChange={setTarget}
        onPercentChange={setPercent}
        fieldErrors={fieldErrors}
        clearFieldError={clearFieldError}
        formError={formError}
        submitting={submitting}
        unassignedHint={`${summary.unassignedPercent}% currently unassigned to general savings`}
        submitLabel="Create goal"
        onSubmit={submitCreate}
      />

      <GoalFormModal
        open={editGoal !== null}
        onOpenChange={(open) => !open && setEditGoal(null)}
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
        submitting={editSubmitting || actionGoalId === editGoal?.id}
        submitLabel="Save changes"
        onSubmit={submitEdit}
      />

      <TransferModal
        open={transferGoal !== null}
        onOpenChange={(open) => !open && setTransferGoal(null)}
        goal={transferGoal}
        availableAmount={summary.generalSavingsAvailable}
        formatCurrency={formatCurrency}
        submitting={actionGoalId === transferGoal?.id}
        formError={transferError}
        amount={transferAmount}
        onAmountChange={setTransferAmount}
        onSubmit={submitTransfer}
      />

      <ConfirmDialog
        open={archiveConfirmId !== null}
        onOpenChange={(open) => !open && setArchiveConfirmId(null)}
        title="Archive saving goal"
        description="This goal will stop receiving allocations and move to your archived list. You can still view its history."
        confirmText="Archive"
        cancelText="Cancel"
        onConfirm={() => {
          if (archiveConfirmId) void handleArchive(archiveConfirmId)
        }}
      />

      <ConfirmDialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        title="Delete saving goal"
        description="This permanently removes the goal and its credit history. This cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={() => {
          if (deleteConfirmId) void handleDelete(deleteConfirmId)
        }}
      />
    </div>
  )
}
