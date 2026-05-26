"use client"

import { useSession } from "next-auth/react"
import { Header } from "@/components/layout/header"
import { CategoryTrackingBento } from "@/components/category-tracking/category-tracking-bento"
import { CategoryTrackingBentoLoading } from "@/components/category-tracking/category-tracking-bento-loading"
import { useCategoryTrackingPage } from "@/hooks/use-category-tracking-page"

export default function BentoCategoryTrackingPage() {
  const { data: session, status } = useSession()
  const tracking = useCategoryTrackingPage()

  if (status === "loading") {
    const now = new Date()
    return (
      <>
        <Header
          title="Category tracking"
          description="Fund pillars, allocation, and spend pace."
         
        />
        <div className="mx-auto max-w-7xl space-y-4 px-4 pb-10 pt-4 sm:space-y-6 sm:px-6 lg:px-8">
          <CategoryTrackingBentoLoading
            monthOptions={tracking.monthOptions}
            selectedMonth={now.getMonth() + 1}
            selectedYear={now.getFullYear()}
            setSelectedMonth={tracking.setSelectedMonth}
            setSelectedYear={tracking.setSelectedYear}
            selectedMonthLabel={tracking.monthOptions[0]?.label ?? ""}
          />
        </div>
      </>
    )
  }

  if (!session) return null

  return (
    <>
      <Header
        title="Category tracking"
        description="Fund pillars, allocation, and spend pace."
       
      />
      <div className="mx-auto max-w-7xl space-y-4 px-4 pb-10 pt-4 sm:space-y-6 sm:px-6 lg:px-8">
        <CategoryTrackingBento {...tracking} />
      </div>
    </>
  )
}
