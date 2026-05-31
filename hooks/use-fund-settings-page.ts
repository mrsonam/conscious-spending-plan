"use client"

import { useCallback, useEffect, useLayoutEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useFormatCurrency } from "@/hooks/use-format-currency"
import { toastSuccess } from "@/lib/app-toast"
import { fetchJsonAndCache, peekCachedJson } from "@/lib/client-fetch-cache"

export interface FundAllocation {
  id: string
  fixedCostsType: string
  fixedCostsValue: number
  fixedCostsCap: number | null
  savingsType: string
  savingsValue: number
  savingsCap: number | null
  investmentType: string
  investmentValue: number
  investmentCap: number | null
  guiltFreeSpendingType: string
  guiltFreeSpendingValue: number
  guiltFreeSpendingCap: number | null
}

export interface CategoryBalance {
  id: string
  category: string
  balance: number
  allocatedFromIncome: number
}

const FUNDS_ALLOCATION_CACHE_KEY = "funds:allocation"
const FUNDS_BALANCES_CACHE_KEY = "funds:balances"
const FUNDS_CACHE_MS = 45_000

export function useFundSettingsPage() {
  const { data: session, status } = useSession()
  const { formatCurrency, currencyCode } = useFormatCurrency()
  const router = useRouter()
  const [allocation, setAllocation] = useState<FundAllocation | null>(null)
  const [balances, setBalances] = useState<CategoryBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{
    type: "success" | "error"
    text: string
  } | null>(null)
  const [savingGoalsSummary, setSavingGoalsSummary] = useState<{
    activeCount: number
    assignedPercent: number
    unassignedPercent: number
  } | null>(null)

  const fetchAllocation = useCallback(async (opts?: { force?: boolean }) => {
    const cachedAllocation = peekCachedJson<FundAllocation>(FUNDS_ALLOCATION_CACHE_KEY, FUNDS_CACHE_MS)
    const cachedBalances = peekCachedJson<{ balances?: CategoryBalance[] }>(
      FUNDS_BALANCES_CACHE_KEY,
      FUNDS_CACHE_MS,
    )
    if (!cachedAllocation) {
      setLoading(true)
    }
    const t = Date.now()
    try {
      const [allocationData, balancesData, goalsRes] = await Promise.all([
        fetchJsonAndCache<FundAllocation>(
          FUNDS_ALLOCATION_CACHE_KEY,
          `/api/fund-allocation?t=${t}`,
          undefined,
          opts?.force ? { force: true } : undefined,
        ),
        fetchJsonAndCache<{ balances?: CategoryBalance[] }>(
          FUNDS_BALANCES_CACHE_KEY,
          `/api/category-balances?t=${t}`,
          undefined,
          opts?.force ? { force: true } : undefined,
        ),
        fetch(`/api/saving-goals?status=active&t=${t}`),
      ])

      setAllocation(allocationData)
      setBalances(balancesData.balances || [])

      if (goalsRes.ok) {
        const data = (await goalsRes.json()) as {
          summary?: {
            activeCount: number
            assignedPercent: number
            unassignedPercent: number
          }
        }
        if (data.summary) setSavingGoalsSummary(data.summary)
      }
    } catch (e) {
      console.error("Error fetching allocation:", e)
    } finally {
      setLoading(false)
    }
  }, [])

  useLayoutEffect(() => {
    if (status !== "authenticated") return
    const cachedAllocation = peekCachedJson<FundAllocation>(FUNDS_ALLOCATION_CACHE_KEY, FUNDS_CACHE_MS)
    const cachedBalances = peekCachedJson<{ balances?: CategoryBalance[] }>(
      FUNDS_BALANCES_CACHE_KEY,
      FUNDS_CACHE_MS,
    )
    if (cachedAllocation) {
      setAllocation(cachedAllocation)
    }
    if (cachedBalances?.balances) {
      setBalances(cachedBalances.balances)
    }
    if (cachedAllocation && cachedBalances?.balances) {
      setLoading(false)
    }
  }, [status])

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    } else if (status === "authenticated") {
      void fetchAllocation()
    }
  }, [status, router, fetchAllocation])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!allocation) return

    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch("/api/fund-allocation", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(allocation),
      })

      if (response.ok) {
        toastSuccess("Settings saved successfully!")
        const balancesRes = await fetch("/api/category-balances")
        if (balancesRes.ok) {
          const data = (await balancesRes.json()) as { balances?: CategoryBalance[] }
          setBalances(data.balances || [])
        }
      } else {
        setMessage({ type: "error", text: "Failed to save settings" })
      }
    } catch {
      setMessage({ type: "error", text: "An error occurred" })
    } finally {
      setSaving(false)
    }
  }

  const updateField = useCallback(
    (field: keyof FundAllocation, value: string | number | null) => {
      setAllocation((prev) => (prev ? { ...prev, [field]: value } : null))
    },
    [],
  )

  const getBalance = useCallback(
    (category: string) => {
      const balance = balances.find((b) => b.category === category)
      return balance?.balance ?? 0
    },
    [balances],
  )

  const getAllocatedFromIncome = useCallback(
    (category: string) => {
      const balance = balances.find((b) => b.category === category)
      return balance?.allocatedFromIncome ?? 0
    },
    [balances],
  )

  return {
    session,
    status,
    allocation,
    balances,
    loading,
    saving,
    message,
    setMessage,
    fetchAllocation,
    handleSubmit,
    updateField,
    getBalance,
    getAllocatedFromIncome,
    formatCurrency,
    currencyCode,
    savingGoalsSummary,
  }
}
