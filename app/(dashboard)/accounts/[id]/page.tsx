"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useHydratedSession } from "@/hooks/use-hydrated-session"
import { Header } from "@/components/layout/header"
import { AccountDetailView } from "@/components/accounts/account-detail-view"

export default function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { session, status, isSessionPending } = useHydratedSession()
  const router = useRouter()
  const [accountName, setAccountName] = useState<string | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  useEffect(() => {
    setAccountName(null)
  }, [id])

  if (!session && !isSessionPending) return null

  return (
    <>
      <Header
        title={accountName ?? "Account detail"}
        description="Balance, details, and transactions."
      />
      <div className="mx-auto max-w-7xl space-y-4 px-4 pb-10 pt-4 sm:space-y-6 sm:px-6 lg:px-8">
        <AccountDetailView id={id} onAccountChange={setAccountName} />
      </div>
    </>
  )
}
