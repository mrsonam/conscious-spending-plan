"use client"

import { useHydratedSession } from "@/hooks/use-hydrated-session"
import { Header } from "@/components/layout/header"
import { FundsPageBento } from "@/components/funds/funds-page-bento"

export default function BentoFundsPage() {
  const { session, isSessionPending } = useHydratedSession()

  if (isSessionPending) {
    return (
      <>
        <Header
          title="Fund settings"
          description="Income split, caps, and envelope behavior."
        />
        <div className="mx-auto max-w-7xl space-y-4 px-4 pb-10 pt-4 sm:space-y-6 sm:px-6 lg:px-8">
          <FundsPageBento />
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
        <FundsPageBento />
      </div>
    </>
  )
}
