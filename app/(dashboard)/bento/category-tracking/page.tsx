"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { CategoryTrackingBento } from "@/components/category-tracking/category-tracking-bento"

export default function BentoCategoryTrackingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  if (status === "loading") {
    return (
      <>
        <Header
          title="Category tracking"
          description="Fund pillars, allocation, and spend pace."
          variant="console"
        />
        <div className="mx-auto max-w-5xl min-h-[calc(100dvh-5.5rem)] space-y-4 px-4 pb-10 pt-4 sm:space-y-6 sm:px-6 lg:px-8">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-xl border border-white/10 bg-white/5"
              />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="h-72 animate-pulse rounded-xl border border-white/10 bg-white/5" />
            <div className="h-72 animate-pulse rounded-xl border border-white/10 bg-white/5" />
          </div>
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
        variant="console"
      />
      <div className="mx-auto max-w-5xl min-h-[calc(100dvh-5.5rem)] space-y-4 px-4 pb-10 pt-4 sm:space-y-6 sm:px-6 lg:px-8">
        <CategoryTrackingBento />
      </div>
    </>
  )
}
