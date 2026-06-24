"use client"

import { useHydratedSession } from "@/hooks/use-hydrated-session"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { FundsPageBento } from "@/components/funds/funds-page-bento"
import { BudgetRecommendations } from "@/components/ai-chat/budget-recommendations"

export default function BentoFundsPage() {
  const { session, status, isSessionPending } = useHydratedSession()
  const router = useRouter()

  if (isSessionPending) {
    return (
      <>
        <Header
          title="Fund settings"
          description="Income split, caps, and envelope behavior."
         
        />
        <div className="mx-auto max-w-7xl space-y-4 px-4 pb-10 pt-4 sm:space-y-6 sm:px-6 lg:px-8">
          <div className="h-28 animate-pulse rounded-xl border border-white/10 bg-white/5" />
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-xl border border-white/10 bg-white/5" />
            ))}
          </div>
        </div>
      </>
    )
  }

  if (!session) return null

  return (
    <>
      <Header
        title="Fund settings"
        description="Income split, caps, and envelope behavior."
       
      />
      <div className="mx-auto max-w-7xl space-y-4 px-4 pb-10 pt-4 sm:space-y-6 sm:px-6 lg:px-8">
        <BudgetRecommendations />
        <FundsPageBento />
      </div>
    </>
  )
}
