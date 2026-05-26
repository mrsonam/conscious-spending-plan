"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { SubscriptionsPageBento } from "@/components/subscriptions/subscriptions-page-bento"

export default function BentoSubscriptionsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  if (status === "loading") {
    return null
  }

  if (!session) return null

  return (
    <>
      <Header
        title="Subscriptions"
        description="Link recurring charges, see monthly cost, and upcoming renewals."
       
      />
      <div className="mx-auto max-w-7xl space-y-4 px-4 pb-10 pt-4 sm:space-y-6 sm:px-6 lg:px-8">
        <SubscriptionsPageBento />
      </div>
    </>
  )
}
