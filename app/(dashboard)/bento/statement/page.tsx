"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { StatementPageBento } from "@/components/statement/statement-page-bento"
import { useStatementPage } from "@/hooks/use-statement-page"
import { CLASSIC } from "@/lib/app-routes"

export default function BentoStatementPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const statement = useStatementPage(status, router)

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return
    if ((session.user.dashboardTheme ?? "classic") !== "console") {
      router.replace(CLASSIC.statement)
    }
  }, [status, session?.user, router])

  if (status === "loading") {
    return (
      <>
        <Header
          title="Statement"
          description="Consolidated ledger across income, expenses, transfers, and investments."
          variant="console"
        />
        <div className="mx-auto max-w-5xl space-y-4 px-4 pb-10 pt-4 sm:px-6 lg:px-8">
          <div className="h-28 rounded-xl border border-white/10 bg-white/5" />
          <div className="h-[420px] rounded-xl border border-white/10 bg-white/5" />
        </div>
      </>
    )
  }

  if (
    status === "authenticated" &&
    (session?.user?.dashboardTheme ?? "classic") !== "console"
  ) {
    return null
  }

  if (!session) return null

  return (
    <>
      <Header
        title="Statement"
        description="Consolidated ledger across income, expenses, transfers, and investments."
        variant="console"
      />
      <div className="mx-auto max-w-5xl min-h-[calc(100dvh-5.5rem)] space-y-4 px-4 pb-10 pt-4 sm:space-y-6 sm:px-6 lg:px-8">
        <StatementPageBento {...statement} />
      </div>
    </>
  )
}

