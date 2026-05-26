"use client"

import { useEffect } from "react"
import { useHydratedSession } from "@/hooks/use-hydrated-session"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { AccountsPageBento } from "@/components/accounts/accounts-page-bento"

export default function BentoAccountsPage() {
  const { session, status, isSessionPending } = useHydratedSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  if (isSessionPending) {
    return null
  }

  if (!session) return null

  return (
    <>
      <Header
        title="Accounts"
        description="Link institutions, view balances, and move liquidity."
       
      />
      <div className="mx-auto max-w-7xl space-y-4 px-4 pb-10 pt-4 sm:space-y-6 sm:px-6 lg:px-8">
        <AccountsPageBento />
      </div>
    </>
  )
}
