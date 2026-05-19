"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { ProductTour } from "@/components/product-tour/product-tour"

type ProductTourContextValue = {
  startTour: () => void
  tourActive: boolean
}

const ProductTourContext = createContext<ProductTourContextValue | null>(null)

export function useProductTour() {
  const ctx = useContext(ProductTourContext)
  if (!ctx) {
    throw new Error("useProductTour must be used within ProductTourProvider")
  }
  return ctx
}

export function ProductTourProvider({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [tourActive, setTourActive] = useState(false)
  const [checked, setChecked] = useState(false)

  const clearTourQuery = useCallback(() => {
    if (searchParams.get("tour") !== "1") return
    const params = new URLSearchParams(searchParams.toString())
    params.delete("tour")
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [pathname, router, searchParams])

  const startTour = useCallback(() => {
    setTourActive(true)
  }, [])

  const handleComplete = useCallback(() => {
    setTourActive(false)
    clearTourQuery()
  }, [clearTourQuery])

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch("/api/product-tour/status")
        if (!res.ok) {
          setChecked(true)
          return
        }
        const data = (await res.json()) as {
          needsTour?: boolean
          isDemoAccount?: boolean
        }
        if (cancelled) return
        if (data.needsTour || data.isDemoAccount || searchParams.get("tour") === "1") {
          window.setTimeout(() => setTourActive(true), 400)
        }
      } finally {
        if (!cancelled) setChecked(true)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [searchParams])

  const value = useMemo(
    () => ({ startTour, tourActive }),
    [startTour, tourActive],
  )

  return (
    <ProductTourContext.Provider value={value}>
      {children}
      {checked ? <ProductTour active={tourActive} onComplete={handleComplete} /> : null}
    </ProductTourContext.Provider>
  )
}
