"use client"

import { use, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useHydratedSession } from "@/hooks/use-hydrated-session"
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

  return <CategoryDetailView category={category} p={detail} />
}
