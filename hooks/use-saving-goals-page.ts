"use client"

import { useCallback, useEffect, useLayoutEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useFormatCurrency } from "@/hooks/use-format-currency"
import {
  fetchJsonAndCache,
  peekCachedJson,
} from "@/lib/client-fetch-cache"
import {
  buildFieldErrors,
  hasFieldErrors,
  requireField,
} from "@/lib/form-validation"
import { useFormFieldErrors } from "@/hooks/use-form-field-errors"
import { parseMoneyInput } from "@/lib/money-input"
import { toastError, toastSuccess } from "@/lib/app-toast"
import {
  applyOptimisticGoalArchive,
  applyOptimisticGoalCreate,
  applyOptimisticGoalDelete,
  applyOptimisticGoalTransfer,
  applyOptimisticGoalUpdate,
  applyOptimisticGoalWithdraw,
  cloneSavingGoalsState,
  replaceOptimisticGoalRow,
} from "@/lib/saving-goals-optimistic"
import { isOptimisticClientId } from "@/lib/optimistic-id"

export type SavingGoalStatus = "active" | "complete" | "archived"

export interface SavingGoalRow {
  id: string
  name: string
  target: number | null
  current: number
  percent: number
  status: SavingGoalStatus
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface SavingGoalsSummary {
  activeCount: number
  assignedPercent: number
  unassignedPercent: number
  generalSavingsAvailable: number
}

export type SavingGoalFormFieldKey = "name" | "target" | "percent"

const SAVING_GOALS_CACHE_KEY = "saving-goals:page"
const SAVING_GOALS_CACHE_MS = 45_000

type SavingGoalsApiPayload = {
  goals?: SavingGoalRow[]
  summary?: SavingGoalsSummary
}

export function useSavingGoalsPage(
  authStatus: "loading" | "authenticated" | "unauthenticated"
) {
  const { formatCurrency, currencyCode } = useFormatCurrency()
  const router = useRouter()
  const [goals, setGoals] = useState<SavingGoalRow[]>([])
  const [summary, setSummary] = useState<SavingGoalsSummary>({
    activeCount: 0,
    assignedPercent: 0,
    unassignedPercent: 100,
    generalSavingsAvailable: 0,
  })
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{
    type: "success" | "error"
    text: string
  } | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [actionGoalId, setActionGoalId] = useState<string | null>(null)

  const [name, setName] = useState("")
  const [target, setTarget] = useState("")
  const [percent, setPercent] = useState("")

  const { fieldErrors, setFieldErrors, clearFieldError } =
    useFormFieldErrors<SavingGoalFormFieldKey>()

  const fetchGoals = useCallback(async (opts?: { force?: boolean }) => {
    const cached = peekCachedJson<SavingGoalsApiPayload>(SAVING_GOALS_CACHE_KEY, SAVING_GOALS_CACHE_MS)
    if (!cached?.goals) {
      setLoading(true)
    }
    const t = Date.now()
    try {
      const data = await fetchJsonAndCache<SavingGoalsApiPayload>(
        SAVING_GOALS_CACHE_KEY,
        `/api/saving-goals?t=${t}`,
        undefined,
        opts?.force ? { force: true } : undefined,
      )
      setGoals(data.goals ?? [])
      if (data.summary) setSummary(data.summary)
    } catch (e) {
      console.error("Error fetching saving goals:", e)
    } finally {
      setLoading(false)
    }
  }, [])

  useLayoutEffect(() => {
    if (authStatus !== "authenticated") return
    const cached = peekCachedJson<SavingGoalsApiPayload>(SAVING_GOALS_CACHE_KEY, SAVING_GOALS_CACHE_MS)
    if (cached?.goals) {
      setGoals(cached.goals)
      if (cached.summary) setSummary(cached.summary)
      setLoading(false)
    }
  }, [authStatus])

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login")
    } else if (authStatus === "authenticated") {
      void fetchGoals()
    }
  }, [authStatus, router, fetchGoals])

  const resetForm = () => {
    setName("")
    setTarget("")
    setPercent("")
    setFormError(null)
    setFieldErrors({})
  }

  const validateForm = () => {
    const percentNum = Number(percent)
    const percentError =
      requireField(percent, "Percent") ??
      (!Number.isFinite(percentNum) || percentNum < 0 || percentNum > 100
        ? "Percent must be between 0 and 100."
        : null)

    let targetError: string | null = null
    if (target.trim() !== "") {
      try {
        const dollars = parseMoneyInput(target, currencyCode)
        if (!Number.isFinite(dollars) || dollars <= 0) {
          targetError = "Target amount must be greater than zero."
        }
      } catch {
        targetError = "Enter a valid target amount or leave blank."
      }
    }

    const errors = buildFieldErrors<SavingGoalFormFieldKey>([
      ["name", requireField(name, "Name")],
      ["target", targetError],
      ["percent", percentError],
    ])
    setFieldErrors(errors)
    return !hasFieldErrors(errors)
  }

  const targetPayload = (value: string): number | null => {
    const trimmed = value.trim()
    if (!trimmed) return null
    return parseMoneyInput(trimmed, currencyCode)
  }

  const requirePersistedGoal = (goalId: string): boolean => {
    if (!isOptimisticClientId(goalId)) return true
    toastError("This goal is still being saved. Wait a moment and try again.")
    return false
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (!validateForm()) return

    const snapshot = cloneSavingGoalsState(goals, summary)
    const payload = {
      name: name.trim(),
      target: targetPayload(target),
      percent: Number(percent),
    }
    const optimistic = applyOptimisticGoalCreate(goals, summary, payload)
    const optimisticId = optimistic.optimisticId
    setGoals(optimistic.goals)
    setSummary(optimistic.summary)
    toastSuccess("Saving goal created")
    resetForm()

    void (async () => {
      try {
        const res = await fetch("/api/saving-goals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        const data = (await res.json()) as { error?: string; goal?: SavingGoalRow }
        if (!res.ok) {
          setGoals(snapshot.goals)
          setSummary(snapshot.summary)
          setFormError(data.error ?? "Failed to create goal")
          toastError(data.error ?? "Failed to create goal")
          return
        }
        if (data.goal) {
          setGoals((prev) => replaceOptimisticGoalRow(prev, optimisticId, data.goal!))
        }
        await fetchGoals({ force: true })
      } catch {
        setGoals(snapshot.goals)
        setSummary(snapshot.summary)
        setFormError("An error occurred")
        toastError("An error occurred")
      }
    })()

    return true
  }

  const handleUpdate = async (
    goalId: string,
    updates: { name?: string; target?: number | null; percent?: number }
  ) => {
    if (!requirePersistedGoal(goalId)) return false

    const snapshot = cloneSavingGoalsState(goals, summary)
    const optimistic = applyOptimisticGoalUpdate(goals, summary, goalId, updates)
    setGoals(optimistic.goals)
    setSummary(optimistic.summary)
    toastSuccess("Goal updated")

    void (async () => {
      setActionGoalId(goalId)
      try {
        const res = await fetch(`/api/saving-goals/${goalId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        })
        const data = (await res.json()) as { error?: string }
        if (!res.ok) {
          setGoals(snapshot.goals)
          setSummary(snapshot.summary)
          setMessage({ type: "error", text: data.error ?? "Failed to update goal" })
          toastError(data.error ?? "Failed to update goal")
          return
        }
        await fetchGoals({ force: true })
      } catch {
        setGoals(snapshot.goals)
        setSummary(snapshot.summary)
        setMessage({ type: "error", text: "An error occurred" })
        toastError("An error occurred")
      } finally {
        setActionGoalId(null)
      }
    })()

    return true
  }

  const handleArchive = async (goalId: string) => {
    if (!requirePersistedGoal(goalId)) return

    const snapshot = cloneSavingGoalsState(goals, summary)
    const optimistic = applyOptimisticGoalArchive(goals, summary, goalId)
    setGoals(optimistic.goals)
    setSummary(optimistic.summary)
    toastSuccess("Goal archived")

    void (async () => {
      setActionGoalId(goalId)
      try {
        const res = await fetch(`/api/saving-goals/${goalId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "archive" }),
        })
        if (!res.ok) {
          const data = (await res.json()) as { error?: string }
          setGoals(snapshot.goals)
          setSummary(snapshot.summary)
          setMessage({ type: "error", text: data.error ?? "Failed to archive goal" })
          toastError(data.error ?? "Failed to archive goal")
          return
        }
        await fetchGoals({ force: true })
      } catch {
        setGoals(snapshot.goals)
        setSummary(snapshot.summary)
        setMessage({ type: "error", text: "An error occurred" })
        toastError("An error occurred")
      } finally {
        setActionGoalId(null)
      }
    })()
  }

  const handleWithdraw = async (goalId: string) => {
    if (!requirePersistedGoal(goalId)) return

    const snapshot = cloneSavingGoalsState(goals, summary)
    const optimistic = applyOptimisticGoalWithdraw(goals, summary, goalId)
    setGoals(optimistic.goals)
    setSummary(optimistic.summary)
    toastSuccess("Goal withdrawn and archived")

    void (async () => {
      setActionGoalId(goalId)
      try {
        const res = await fetch(`/api/saving-goals/${goalId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "withdraw" }),
        })
        if (!res.ok) {
          const data = (await res.json()) as { error?: string }
          setGoals(snapshot.goals)
          setSummary(snapshot.summary)
          setMessage({ type: "error", text: data.error ?? "Failed to withdraw goal" })
          toastError(data.error ?? "Failed to withdraw goal")
          return
        }
        await fetchGoals({ force: true })
      } catch {
        setGoals(snapshot.goals)
        setSummary(snapshot.summary)
        setMessage({ type: "error", text: "An error occurred" })
        toastError("An error occurred")
      } finally {
        setActionGoalId(null)
      }
    })()
  }

  const handleTransfer = async (goalId: string, amount: number) => {
    if (!requirePersistedGoal(goalId)) return false

    const snapshot = cloneSavingGoalsState(goals, summary)
    const optimistic = applyOptimisticGoalTransfer(goals, summary, goalId, amount)
    setGoals(optimistic.goals)
    setSummary(optimistic.summary)
    toastSuccess("Funds transferred to goal")

    void (async () => {
      setActionGoalId(goalId)
      try {
        const res = await fetch(`/api/saving-goals/${goalId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "transfer", amount }),
        })
        const data = (await res.json()) as { error?: string }
        if (!res.ok) {
          setGoals(snapshot.goals)
          setSummary(snapshot.summary)
          setMessage({ type: "error", text: data.error ?? "Failed to transfer funds" })
          toastError(data.error ?? "Failed to transfer funds")
          return
        }
        await fetchGoals({ force: true })
      } catch {
        setGoals(snapshot.goals)
        setSummary(snapshot.summary)
        setMessage({ type: "error", text: "An error occurred" })
        toastError("An error occurred")
      } finally {
        setActionGoalId(null)
      }
    })()

    return true
  }

  const handleDelete = async (goalId: string) => {
    if (!requirePersistedGoal(goalId)) return

    const snapshot = cloneSavingGoalsState(goals, summary)
    const optimistic = applyOptimisticGoalDelete(goals, summary, goalId)
    setGoals(optimistic.goals)
    setSummary(optimistic.summary)
    toastSuccess("Goal deleted")

    void (async () => {
      setActionGoalId(goalId)
      try {
        const res = await fetch(`/api/saving-goals/${goalId}`, { method: "DELETE" })
        if (!res.ok) {
          const data = (await res.json()) as { error?: string }
          setGoals(snapshot.goals)
          setSummary(snapshot.summary)
          setMessage({ type: "error", text: data.error ?? "Failed to delete goal" })
          toastError(data.error ?? "Failed to delete goal")
          return
        }
        await fetchGoals({ force: true })
      } catch {
        setGoals(snapshot.goals)
        setSummary(snapshot.summary)
        setMessage({ type: "error", text: "An error occurred" })
        toastError("An error occurred")
      } finally {
        setActionGoalId(null)
      }
    })()
  }

  return {
    goals,
    summary,
    loading,
    message,
    setMessage,
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
    fetchGoals,
    targetPayload,
  }
}
