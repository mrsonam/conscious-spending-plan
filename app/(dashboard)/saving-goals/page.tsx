"use client"

import { useEffect } from "react"
import { useHydratedSession } from "@/hooks/use-hydrated-session"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { SavingGoalsPageBento } from "@/components/saving-goals/saving-goals-page-bento"
import { SavingGoalsPageBentoLoading } from "@/components/saving-goals/saving-goals-page-bento-loading"

export default function SavingGoalsPage() {
  const { session, status, isSessionPending } = useHydratedSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  if (isSessionPending) {
    return (
      <>
        <Header
          title="Savings Goals"
          description="Named targets funded automatically from your savings-bucket allocation."
        />
        <div className="mx-auto w-full max-w-7xl space-y-4 px-4 pb-10 pt-4 sm:space-y-6 sm:px-6 lg:px-8">
          <SavingGoalsPageBentoLoading />
        </div>
      </>
    )
  }

  if (!session) return null

  return (
    <>
      <Header
        title="Savings Goals"
        description="Named targets funded automatically from your savings-bucket allocation."
      />
      <div className="mx-auto w-full max-w-7xl space-y-4 px-4 pb-10 pt-4 sm:space-y-6 sm:px-6 lg:px-8">
        <SavingGoalsPageBento authStatus={status} />
      </div>
    </>
  )
}
