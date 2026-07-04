"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useHydratedSession } from "@/hooks/use-hydrated-session"
import { Header } from "@/components/layout/header"
import { InsightsPageBento } from "@/components/insights/insights-page-bento"

export default function InsightsPage() {
  const { session, status, isSessionPending } = useHydratedSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  if (isSessionPending) {
    return (
      <>
        <Header
          title="Insights"
          description="Facts up top, AI judgment in the middle, actions at the bottom."
        />
        <div className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-10 pt-4 sm:space-y-8 sm:px-6 lg:px-8">
          <section className="px-1 py-2 sm:px-2">
            <div className="flex justify-end">
              <div
                className="h-8 w-28 animate-pulse rounded-lg"
                style={{ background: "rgba(255,255,255,0.06)" }}
              />
            </div>
            <div className="mt-5 space-y-3">
              <div
                className="h-8 w-72 max-w-full animate-pulse rounded"
                style={{ background: "rgba(255,255,255,0.06)" }}
              />
              <div
                className="h-4 w-full max-w-xl animate-pulse rounded"
                style={{ background: "rgba(255,255,255,0.06)" }}
              />
            </div>
          </section>
          <div
            className="h-40 animate-pulse rounded-xl"
            style={{ background: "rgba(255,255,255,0.04)" }}
          />
          <div
            className="h-[280px] animate-pulse rounded-xl"
            style={{ background: "rgba(255,255,255,0.04)" }}
          />
          <div className="grid gap-4 lg:grid-cols-3 lg:gap-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-[240px] animate-pulse rounded-xl"
                style={{ background: "rgba(255,255,255,0.04)" }}
              />
            ))}
          </div>
          <div
            className="h-36 animate-pulse rounded-xl"
            style={{ background: "rgba(255,255,255,0.04)" }}
          />
        </div>
      </>
    )
  }

  if (!session) return null

  return (
    <>
      <Header
        title="Insights"
        description="Facts up top, AI judgment in the middle, actions at the bottom."
      />
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-10 pt-4 sm:space-y-8 sm:px-6 lg:px-8">
        <InsightsPageBento />
      </div>
    </>
  )
}
