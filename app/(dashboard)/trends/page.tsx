"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useHydratedSession } from "@/hooks/use-hydrated-session"
import { Header } from "@/components/layout/header"
import { TrendsPageBento } from "@/components/trends/trends-page-bento"
import { TOKENS } from "@/lib/wealth-console-tokens"

export default function TrendsPage() {
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
          title="Trends"
          description="Spending patterns, income, and net worth over time."
        />
        <div className="mx-auto w-full max-w-7xl space-y-4 px-4 pb-10 pt-4 sm:space-y-6 sm:px-6 lg:px-8">
          <div className="space-y-4">
            <div className="h-24 animate-pulse rounded-xl" style={{ background: TOKENS.surfaceHigh }} />
            <div className="h-[420px] animate-pulse rounded-xl" style={{ background: TOKENS.surfaceHigh }} />
          </div>
        </div>
      </>
    )
  }

  if (!session) return null

  return (
    <>
      <Header
        title="Trends"
        description="Spending patterns, income, and net worth over time."
      />
      <div className="mx-auto w-full max-w-7xl px-4 pb-10 pt-4 sm:px-6 lg:px-8">
        <TrendsPageBento />
      </div>
    </>
  )
}
