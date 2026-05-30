"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useFormatCurrency } from "@/hooks/use-format-currency"
import {
  buildFieldErrors,
  hasFieldErrors,
  requireField,
} from "@/lib/form-validation"
import { useFormFieldErrors } from "@/hooks/use-form-field-errors"
import { parseMoneyInput } from "@/lib/money-input"

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

  const fetchGoals = useCallback(async () => {
    try {
      const res = await fetch("/api/saving-goals")
      if (res.ok) {
        const data = (await res.json()) as {
          goals?: SavingGoalRow[]
          summary?: SavingGoalsSummary
        }
        setGoals(data.goals ?? [])
        if (data.summary) setSummary(data.summary)
      }
    } catch (e) {
      console.error("Error fetching saving goals:", e)
    } finally {
      setLoading(false)
    }
  }, [])

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (!validateForm()) return

    setSubmitting(true)
    setMessage(null)
    try {
      const res = await fetch("/api/saving-goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          target: targetPayload(target),
          percent: Number(percent),
        }),
      })
      const data = (await res.json()) as { error?: string }
      if (res.ok) {
        setMessage({ type: "success", text: "Saving goal created" })
        resetForm()
        await fetchGoals()
        return true
      }
      setFormError(data.error ?? "Failed to create goal")
      return false
    } catch {
      setFormError("An error occurred")
      return false
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (
    goalId: string,
    updates: { name?: string; target?: number | null; percent?: number }
  ) => {
    setActionGoalId(goalId)
    setMessage(null)
    try {
      const res = await fetch(`/api/saving-goals/${goalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      const data = (await res.json()) as { error?: string }
      if (res.ok) {
        setMessage({ type: "success", text: "Goal updated" })
        await fetchGoals()
        return true
      }
      setMessage({ type: "error", text: data.error ?? "Failed to update goal" })
      return false
    } catch {
      setMessage({ type: "error", text: "An error occurred" })
      return false
    } finally {
      setActionGoalId(null)
    }
  }

  const handleArchive = async (goalId: string) => {
    setActionGoalId(goalId)
    setMessage(null)
    try {
      const res = await fetch(`/api/saving-goals/${goalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "archive" }),
      })
      if (res.ok) {
        setMessage({ type: "success", text: "Goal archived" })
        await fetchGoals()
      } else {
        const data = (await res.json()) as { error?: string }
        setMessage({ type: "error", text: data.error ?? "Failed to archive goal" })
      }
    } catch {
      setMessage({ type: "error", text: "An error occurred" })
    } finally {
      setActionGoalId(null)
    }
  }

  const handleWithdraw = async (goalId: string) => {
    setActionGoalId(goalId)
    setMessage(null)
    try {
      const res = await fetch(`/api/saving-goals/${goalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "withdraw" }),
      })
      if (res.ok) {
        setMessage({ type: "success", text: "Goal withdrawn and archived" })
        await fetchGoals()
      } else {
        const data = (await res.json()) as { error?: string }
        setMessage({ type: "error", text: data.error ?? "Failed to withdraw goal" })
      }
    } catch {
      setMessage({ type: "error", text: "An error occurred" })
    } finally {
      setActionGoalId(null)
    }
  }

  const handleTransfer = async (goalId: string, amount: number) => {
    setActionGoalId(goalId)
    setMessage(null)
    try {
      const res = await fetch(`/api/saving-goals/${goalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "transfer", amount }),
      })
      const data = (await res.json()) as { error?: string }
      if (res.ok) {
        setMessage({ type: "success", text: "Funds transferred to goal" })
        await fetchGoals()
        return true
      }
      setMessage({ type: "error", text: data.error ?? "Failed to transfer funds" })
      return false
    } catch {
      setMessage({ type: "error", text: "An error occurred" })
      return false
    } finally {
      setActionGoalId(null)
    }
  }

  const handleDelete = async (goalId: string) => {
    setActionGoalId(goalId)
    setMessage(null)
    try {
      const res = await fetch(`/api/saving-goals/${goalId}`, { method: "DELETE" })
      if (res.ok) {
        setMessage({ type: "success", text: "Goal deleted" })
        await fetchGoals()
      } else {
        const data = (await res.json()) as { error?: string }
        setMessage({ type: "error", text: data.error ?? "Failed to delete goal" })
      }
    } catch {
      setMessage({ type: "error", text: "An error occurred" })
    } finally {
      setActionGoalId(null)
    }
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
