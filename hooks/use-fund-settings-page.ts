"use client"

import { useCallback, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useFormatCurrency } from "@/hooks/use-format-currency"

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

  const fetchAllocation = useCallback(async () => {
    try {
      const [allocationRes, balancesRes] = await Promise.all([
        fetch("/api/fund-allocation"),
        fetch("/api/category-balances"),
      ])

      if (allocationRes.ok) {
        const data = (await allocationRes.json()) as FundAllocation
        setAllocation(data)
      }

      if (balancesRes.ok) {
        const data = (await balancesRes.json()) as { balances?: CategoryBalance[] }
        setBalances(data.balances || [])
      }
    } catch (e) {
      console.error("Error fetching allocation:", e)
    } finally {
      setLoading(false)
    }
  }, [])

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
        setMessage({ type: "success", text: "Settings saved successfully!" })
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
  }
}
