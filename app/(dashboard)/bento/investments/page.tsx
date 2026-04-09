"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { InvestmentsPageBento } from "@/components/investments/investments-page-bento"

export default function BentoInvestmentsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  if (status === "loading") {
    return (
      <>
        <Header
          title="Investments"
          description="Track positions, balances, and deployment from investment accounts."
          variant="console"
        />
        <div className="mx-auto max-w-5xl min-h-[calc(100dvh-5.5rem)] space-y-4 px-4 pb-10 pt-4 sm:space-y-6 sm:px-6 lg:px-8">
          <div className="h-36 animate-pulse rounded-xl border border-white/10 bg-white/5" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl border border-white/10 bg-white/5" />
            ))}
          </div>
          <div className="h-96 animate-pulse rounded-xl border border-white/10 bg-white/5" />
        </div>
      </>
    )
  }

  if (!session) return null

  return (
    <>
      <Header
        title="Investments"
        description="Track positions, balances, and deployment from investment accounts."
        variant="console"
      />
      <div className="mx-auto max-w-5xl min-h-[calc(100dvh-5.5rem)] space-y-4 px-4 pb-10 pt-4 sm:space-y-6 sm:px-6 lg:px-8">
        <InvestmentsPageBento />
      </div>
    </>
  )
}
