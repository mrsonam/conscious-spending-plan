"use client"

import { use, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useHydratedSession } from "@/hooks/use-hydrated-session"
import { Header } from "@/components/layout/header"
import { SavingGoalDetailBento } from "@/components/saving-goals/saving-goal-detail-bento"
import { SavingGoalDetailBentoLoading } from "@/components/saving-goals/saving-goal-detail-bento-loading"

export default function SavingGoalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
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
        <Header title="Saving goal" description="Allocation history and details." />
        <div className="mx-auto w-full max-w-7xl space-y-4 px-4 pb-10 pt-4 sm:space-y-6 sm:px-6 lg:px-8">
          <SavingGoalDetailBentoLoading />
        </div>
      </>
    )
  }

  if (!session) return null

  return (
    <>
      <Header title="Saving goal" description="Allocation history and details." />
      <div className="mx-auto w-full max-w-7xl space-y-4 px-4 pb-10 pt-4 sm:space-y-6 sm:px-6 lg:px-8">
        <SavingGoalDetailBento id={id} />
      </div>
    </>
  )
}
