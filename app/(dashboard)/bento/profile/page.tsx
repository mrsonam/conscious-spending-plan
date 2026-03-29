"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { ProfilePageBento } from "@/components/profile/profile-page-bento"
import { ProfileSkeleton } from "@/components/skeletons/profile-skeleton"
import { CLASSIC } from "@/lib/app-routes"

export default function BentoProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return
    if ((session.user.dashboardTheme ?? "classic") !== "console") {
      router.replace(CLASSIC.profile)
    }
  }, [status, session?.user, router])

  if (status === "loading") {
    return (
      <>
        <Header
          title="Profile"
          description="Account and dashboard layout."
          variant="console"
        />
        <div className="mx-auto max-w-5xl min-h-[calc(100dvh-5.5rem)] space-y-4 px-4 pb-10 pt-4 sm:space-y-6 sm:px-6 lg:px-8">
          <ProfileSkeleton />
        </div>
      </>
    )
  }

  if (status === "authenticated" && (session?.user?.dashboardTheme ?? "classic") !== "console") {
    return null
  }

  if (!session) return null

  return (
    <>
      <Header
        title="Profile"
        description="Account and dashboard layout."
        variant="console"
      />
      <div className="mx-auto max-w-5xl min-h-[calc(100dvh-5.5rem)] space-y-4 px-4 pb-10 pt-4 sm:space-y-6 sm:px-6 lg:px-8">
        <ProfilePageBento />
      </div>
    </>
  )
}
