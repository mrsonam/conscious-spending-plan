"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useFormatCurrency } from "@/hooks/use-format-currency"
import { toastError, toastSuccess } from "@/lib/app-toast"
import { BENTO } from "@/lib/app-routes"
import type { SavingGoalRow } from "@/hooks/use-saving-goals-page"

export interface SavingGoalLedgerRow {
  id: string
  source: "income" | "manual_transfer" | "withdrawal" | "archive_reset"
  amount: number
  runningBalance: number
  incomeEntryId: string | null
  createdAt: string
}

export interface SavingGoalDetailStats {
  totalContributed: number
  fromPaychecks: number
  fromManualTransfers: number
  withdrawn: number
}

type DetailPayload = {
  goal?: SavingGoalRow
  stats?: SavingGoalDetailStats
  ledger?: SavingGoalLedgerRow[]
  error?: string
}

export function useSavingGoalDetail(goalId: string) {
  const router = useRouter()
  const { formatCurrency, currencyCode } = useFormatCurrency()

  const [goal, setGoal] = useState<SavingGoalRow | null>(null)
  const [stats, setStats] = useState<SavingGoalDetailStats | null>(null)
  const [ledger, setLedger] = useState<SavingGoalLedgerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [actionPending, setActionPending] = useState(false)

  const fetchDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/saving-goals/${goalId}`)
      const data = (await res.json()) as DetailPayload
      if (!res.ok || !data.goal) {
        setError(data.error ?? "Saving goal not found")
        return
      }
      setGoal(data.goal)
      setStats(data.stats ?? null)
      setLedger(data.ledger ?? [])
    } catch {
      setError("Failed to load saving goal")
    } finally {
      setLoading(false)
    }
  }, [goalId])

  useEffect(() => {
    void fetchDetail()
  }, [fetchDetail])

  const runAction = async (
    body: Record<string, unknown>,
    successText: string,
    failText: string
  ): Promise<boolean> => {
    setActionPending(true)
    try {
      const res = await fetch(`/api/saving-goals/${goalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? failText })
        toastError(data.error ?? failText)
        return false
      }
      toastSuccess(successText)
      await fetchDetail()
      return true
    } catch {
      setMessage({ type: "error", text: "An error occurred" })
      toastError("An error occurred")
      return false
    } finally {
      setActionPending(false)
    }
  }

  const handleUpdate = (updates: { name?: string; target?: number | null; percent?: number }) =>
    runAction(updates, "Goal updated", "Failed to update goal")

  const handleTransfer = (amount: number) =>
    runAction({ action: "transfer", amount }, "Funds transferred to goal", "Failed to transfer funds")

  const handleArchive = async () => {
    await runAction({ action: "archive" }, "Goal archived", "Failed to archive goal")
  }

  const handleWithdraw = async () => {
    await runAction({ action: "withdraw" }, "Goal withdrawn and archived", "Failed to withdraw goal")
  }

  const handleDelete = async () => {
    setActionPending(true)
    try {
      const res = await fetch(`/api/saving-goals/${goalId}`, { method: "DELETE" })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        setMessage({ type: "error", text: data.error ?? "Failed to delete goal" })
        toastError(data.error ?? "Failed to delete goal")
        return
      }
      toastSuccess("Goal deleted")
      router.push(BENTO.savingGoals)
    } catch {
      setMessage({ type: "error", text: "An error occurred" })
      toastError("An error occurred")
    } finally {
      setActionPending(false)
    }
  }

  return {
    goal,
    stats,
    ledger,
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
  }
}
