"use client"

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
import { cn } from "@/lib/utils"
import { consoleFocus } from "@/components/wealth-console/console-ui"
import { TOKENS } from "@/lib/wealth-console-tokens"
import type { SavingGoalRow } from "@/hooks/use-saving-goals-page"
import { FormErrorAlert } from "@/components/wealth-console/form-status-alert"
import {
  FormFieldError,
  formFieldAria,
} from "@/components/forms/form-field-error"
import { Loader2, Plus } from "lucide-react"

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

/** "Mar 2027", month-level precision; anything finer would be false accuracy. */
export function formatCompleteBy(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  })
}

export function StatusBadge({ status }: { status: SavingGoalRow["status"] }) {
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

export function TransferModal({
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
              className={cn(
                "flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-bold uppercase tracking-[0.18em] transition-[opacity,transform] duration-150 hover:opacity-95 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 motion-reduce:transition-none motion-reduce:active:scale-100",
                consoleFocus,
              )}
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

export function GoalFormModal({
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
              className={cn(
                "inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold uppercase tracking-[0.2em] transition-[opacity,transform] duration-150 hover:opacity-95 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100 motion-reduce:transition-none motion-reduce:active:scale-100",
                consoleFocus,
              )}
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
