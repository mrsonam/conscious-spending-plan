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
        <div className="mx-auto max-w-7xl space-y-4 px-4 pb-10 pt-4 sm:space-y-6 sm:px-6 lg:px-8">
          <div className="h-28 animate-pulse rounded-xl border border-white/10 bg-white/5" />
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="h-80 animate-pulse rounded-xl border border-white/10 bg-white/5 lg:col-span-7" />
            <div className="h-64 animate-pulse rounded-xl border border-white/10 bg-white/5 lg:col-span-5" />
          </div>
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
      <div className="mx-auto max-w-7xl space-y-4 px-4 pb-10 pt-4 sm:space-y-6 sm:px-6 lg:px-8">
        <SuperannuationPageBento />
      </div>
    </>
  )
}
