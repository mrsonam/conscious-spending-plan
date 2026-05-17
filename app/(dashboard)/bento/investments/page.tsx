"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { InvestmentsPageBento } from "@/components/investments/investments-page-bento"
import { InvestmentsPageBentoLoading } from "@/components/investments/investments-page-bento-loading"
import { useInvestmentsPage } from "@/hooks/use-investments-page"

export default function BentoInvestmentsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const investments = useInvestmentsPage(status)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  if (status === "loading") {
    return (
      <>
        <Header
          title="Investments"
          description="Track positions, balances, and deployment from investment accounts."
          variant="console"
        />
        <div className="mx-auto max-w-7xl space-y-4 px-4 pb-10 pt-4 sm:px-6 lg:px-8">
          <InvestmentsPageBentoLoading />
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
      <div className="mx-auto max-w-7xl space-y-4 px-4 pb-10 pt-4 sm:space-y-6 sm:px-6 lg:px-8">
        <InvestmentsPageBento {...investments} />
      </div>
    </>
  )
}
