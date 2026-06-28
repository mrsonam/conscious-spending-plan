"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useHydratedSession } from "@/hooks/use-hydrated-session"
import { Header } from "@/components/layout/header"
import { SmartInsights } from "@/components/ai-chat/smart-insights"
import { AnomalyDetection } from "@/components/ai-chat/anomaly-detection"

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
          description="AI-powered analysis of your finances."
        />
        <div className="mx-auto w-full max-w-7xl space-y-4 px-4 pb-10 pt-4 sm:space-y-6 sm:px-6 lg:px-8">
          <div className="h-[240px] animate-pulse rounded-2xl" style={{ background: "rgba(255,255,255,0.04)" }} />
          <div className="h-[240px] animate-pulse rounded-2xl" style={{ background: "rgba(255,255,255,0.04)" }} />
        </div>
      </>
    )
  }

  if (!session) return null

  return (
    <>
      <Header
        title="Insights"
        description="AI-powered analysis of your finances."
      />
      <div className="mx-auto w-full max-w-7xl space-y-4 px-4 pb-10 pt-4 sm:space-y-6 sm:px-6 lg:px-8">
        <SmartInsights />
        <AnomalyDetection />
      </div>
    </>
  )
}
