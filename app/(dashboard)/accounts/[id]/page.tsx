"use client"

import { use } from "react"
import { useEffect } from "react"
import { useHydratedSession } from "@/hooks/use-hydrated-session"
import { useRouter } from "next/navigation"
import { AccountDetailView } from "@/components/accounts/account-detail-view"

export default function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { session, status, isSessionPending } = useHydratedSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  if (!session && !isSessionPending) return null

  return <AccountDetailView id={id} />
}
