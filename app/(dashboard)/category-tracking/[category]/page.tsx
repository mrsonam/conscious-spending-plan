"use client"

import { use, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useHydratedSession } from "@/hooks/use-hydrated-session"
import { Header } from "@/components/layout/header"
import { CategoryDetailView } from "@/components/category-tracking/category-detail-view"
import { useCategoryDetailPage } from "@/hooks/use-category-detail-page"

export default function CategoryDetailPage({
  params,
}: {
  params: Promise<{ category: string }>
}) {
  const { category } = use(params)
  const { session, status, isSessionPending } = useHydratedSession()
  const router = useRouter()
  const detail = useCategoryDetailPage(category)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  if (!session && !isSessionPending) return null

  const title = detail.meta?.label ?? "Category detail"

  return (
    <>
      <Header
        title={title}
        description="Fund pillar envelope, trend, and transactions."
      />
      <div className="mx-auto max-w-7xl space-y-4 px-4 pb-10 pt-4 sm:space-y-6 sm:px-6 lg:px-8">
        <CategoryDetailView category={category} p={detail} />
      </div>
    </>
  )
}
