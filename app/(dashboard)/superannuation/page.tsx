"use client"

import { useHydratedSession } from "@/hooks/use-hydrated-session"
import { Header } from "@/components/layout/header"
import { SuperannuationPageBento } from "@/components/superannuation/superannuation-page-bento"

export default function SuperannuationPage() {
  const { session, isSessionPending } = useHydratedSession()

  if (isSessionPending) {
    return (
      <>
        <Header
          title="Superannuation"
          description="Track your super accounts, employer contributions, and retirement balance."
        />
        <div className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-10 pt-4 sm:px-6 lg:px-8">
          <div className="h-32 animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]" />
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="h-24 animate-pulse rounded-xl border border-white/10 bg-white/[0.04]" />
            <div className="h-24 animate-pulse rounded-xl border border-white/10 bg-white/[0.04]" />
            <div className="h-24 animate-pulse rounded-xl border border-white/10 bg-white/[0.04]" />
          </div>
          <div className="h-72 animate-pulse rounded-xl border border-white/10 bg-white/[0.04]" />
        </div>
      </>
    )
  }

  if (!session) return null

  return (
    <>
      <Header
        title="Superannuation"
        description="Track your super accounts, employer contributions, and retirement balance."
      />
      <div className="mx-auto w-full max-w-7xl space-y-4 px-4 pb-10 pt-4 sm:space-y-6 sm:px-6 lg:px-8">
        <SuperannuationPageBento />
      </div>
    </>
  )
}
