"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { MajorFigureCurrency } from "@/lib/currency-major-figure"
import { parseMoneyInput } from "@/lib/money-input"
import { INCOME_PAGE_ERROR_SOFT as ERROR_SOFT } from "@/lib/income-page-types"
import { BENTO } from "@/lib/app-routes"
import { cn } from "@/lib/utils"
import { consoleFocus } from "@/components/wealth-console/console-ui"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import {
  useSavingGoalsPage,
  type SavingGoalRow,
} from "@/hooks/use-saving-goals-page"
import { SavingGoalsPageBentoLoading } from "@/components/saving-goals/saving-goals-page-bento-loading"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { FormStatusAlert } from "@/components/wealth-console/form-status-alert"
import { isOptimisticClientId } from "@/lib/optimistic-id"
import {
  StatusBadge,
  formatCompleteBy,
  GoalFormModal,
  TransferModal,
} from "@/components/saving-goals/saving-goal-shared"
import {
  Archive,
  ArrowRightLeft,
  CheckCircle2,
  Loader2,
  PiggyBank,
  Plus,
  Target,
  Trash2,
  TrendingUp,
  Wallet,
} from "lucide-react"

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
        className="console-budget-fill h-full w-full origin-left rounded-full"
        style={{ transform: `scaleX(${pct / 100})`, background: accent }}
      />
    </div>
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
  const actionBtn = cn(
    "cursor-pointer rounded-lg border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] transition-[background-color,border-color,transform,opacity] duration-200 hover:bg-white/[0.06] active:scale-[0.98] motion-reduce:active:scale-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent",
    consoleFocus,
  )

  const router = useRouter()

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => router.push(`${BENTO.savingGoals}/${goal.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter") router.push(`${BENTO.savingGoals}/${goal.id}`)
      }}
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-2xl border",
        "transition-[transform,box-shadow,background-color,border-color] duration-200 ease-out",
        "hover:-translate-y-0.5 hover:border-white/22 hover:bg-white/3",
        "hover:shadow-[0_8px_28px_rgba(0,0,0,0.22),inset_0_1px_0_0_rgba(218,226,253,0.1)]",
        "active:translate-y-0 active:scale-[0.995] motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4edea3]/45",
      )}
      style={{
        background: TOKENS.surfaceContainer,
        borderColor: TOKENS.outlineGhost,
        boxShadow: CARD_INSET,
      }}
    >
      <div
        className="h-1 w-full opacity-90 transition-opacity duration-200 group-hover:opacity-100"
        style={{ background: TOKENS.primary }}
      />
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3
                className="text-base font-bold transition-colors duration-200 group-hover:text-white"
                style={{ color: TOKENS.onSurface }}
              >
                {goal.name}
              </h3>
              <StatusBadge status={goal.status} />
            </div>
            <p className="mt-1 text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
              {goal.percent}% of savings allocation
            </p>
          </div>
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
              "transition-[transform,background-color,border-color] duration-200 ease-out",
              "group-hover:scale-105 group-hover:border-[color-mix(in_srgb,#4edea3_35%,transparent)]",
              "motion-reduce:transition-none motion-reduce:group-hover:scale-100",
            )}
            style={{
              borderColor: TOKENS.outlineGhost,
              background: `color-mix(in srgb, ${TOKENS.primary} 16%, ${TOKENS.surfaceHigh})`,
            }}
          >
            <Target
              className="h-5 w-5 transition-colors duration-200 group-hover:text-[#6ee9b8]"
              style={{ color: TOKENS.primary }}
              aria-hidden
            />
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

        {goal.status === "active" && goal.target != null && goal.current < goal.target ? (
          goal.projection ? (
            <p className="mt-3 flex items-center gap-1.5 text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
              <TrendingUp className="h-3.5 w-3.5 shrink-0" style={{ color: TOKENS.primary }} aria-hidden />
              <span>
                On pace for{" "}
                <span className="font-semibold" style={{ color: TOKENS.onSurface }}>
                  {formatCompleteBy(goal.projection.completeBy)}
                </span>{" "}
                · ≈{formatCurrency(goal.projection.monthlyPace)}/mo from recent allocations
              </span>
            </p>
          ) : (
            <p className="mt-3 text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
              No contributions in the last 90 days. No completion estimate yet.
            </p>
          )
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          {canEdit ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(goal)
                }}
                disabled={busy || pendingSave}
                title={pendingSave ? "Goal is still being saved" : undefined}
                className={actionBtn}
                style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurfaceMuted }}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onTransfer(goal)
                }}
                disabled={busy || pendingSave}
                title={pendingSave ? "Goal is still being saved" : undefined}
                className={cn(actionBtn, "inline-flex items-center gap-1 hover:bg-[color-mix(in_srgb,#4edea3_12%,transparent)]")}
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
              onClick={(e) => {
                e.stopPropagation()
                onWithdraw(goal.id)
              }}
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
              onClick={(e) => {
                e.stopPropagation()
                onArchive(goal.id)
              }}
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
            onClick={(e) => {
              e.stopPropagation()
              onDelete(goal.id)
            }}
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

  if (loading && goals.length === 0) {
    return <SavingGoalsPageBentoLoading />
  }

  return (
    <div className="w-full min-w-0 space-y-6 sm:space-y-8">
      <section className="px-1 py-2 sm:px-2" aria-labelledby="saving-goals-hero-heading">
        <div className="flex flex-wrap items-center justify-end gap-3">
          <div
            className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border px-2.5 py-2 text-[10px] font-bold uppercase tracking-[0.16em]"
            style={{
              borderColor: TOKENS.outlineGhost,
              color: TOKENS.primary,
              background: TOKENS.surfaceHigh,
            }}
          >
            <PiggyBank className="h-3.5 w-3.5" aria-hidden />
            {summary.activeCount} active
          </div>
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <h2
              id="saving-goals-hero-heading"
              className="text-2xl font-black tracking-tight sm:text-3xl"
              style={{ color: TOKENS.onSurface }}
            >
              Split savings into named targets
            </h2>
            <p
              className="mt-2 max-w-2xl text-sm leading-relaxed"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              Each goal takes a percentage of your savings-bucket allocation on every paycheck.
              You can also move funds from your general savings pool into a goal manually.
            </p>
            <Link
              href={BENTO.funds}
              className={cn(
                "mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-md text-xs font-semibold underline-offset-2 transition-[color,transform] duration-150 hover:underline active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100",
                consoleFocus,
              )}
              style={{ color: TOKENS.primary }}
            >
              <Wallet className="h-3.5 w-3.5" aria-hidden />
              Fund Settings
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={openCreate}
              className={cn(
                "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-bold uppercase tracking-[0.18em] transition-[opacity,transform] duration-150 hover:opacity-95 active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100",
                consoleFocus,
              )}
              style={{
                background: TOKENS.primary,
                color: TOKENS.surface,
                boxShadow: "0 12px 28px rgba(0,0,0,0.25)",
              }}
            >
              <Plus className="h-4 w-4" aria-hidden />
              New goal
            </button>
          </div>
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
            className={cn(
              "mt-4 cursor-pointer rounded-md text-xs font-bold uppercase tracking-[0.16em] underline-offset-2 transition-[color,transform] duration-150 hover:underline active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100",
              consoleFocus,
            )}
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
        description="Set a % of your savings allocation. Target is optional. Leave blank for open-ended goals."
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
