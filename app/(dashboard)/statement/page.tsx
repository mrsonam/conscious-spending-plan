"use client"

import { useHydratedSession } from "@/hooks/use-hydrated-session"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { StatementPageBento } from "@/components/statement/statement-page-bento"
import { useStatementPage } from "@/hooks/use-statement-page"

export default function BentoStatementPage() {
  const { session, status, isSessionPending } = useHydratedSession()
  const router = useRouter()
  const statement = useStatementPage(status, router)

  if (isSessionPending) {
    return (
      <>
        <Header
          title="Statement"
          description="Consolidated ledger across income, expenses, transfers, and investments."
         
        />
        <div className="mx-auto max-w-7xl space-y-4 px-4 pb-10 pt-4 sm:px-6 lg:px-8">
          <div className="h-28 rounded-xl border border-white/10 bg-white/5" />
          <div className="h-[420px] rounded-xl border border-white/10 bg-white/5" />
        </div>
      </>
    )
  }

  if (!session) return null

  return (
    <>
      <Header
        title="Statement"
        description="Consolidated ledger across income, expenses, transfers, and investments."
       
      />
      <div className="mx-auto max-w-7xl space-y-4 px-4 pb-10 pt-4 sm:space-y-6 sm:px-6 lg:px-8">
        <StatementPageBento {...statement} />
      </div>
    </>
  )
}

