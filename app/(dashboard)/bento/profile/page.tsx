"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { ProfilePageBento } from "@/components/profile/profile-page-bento"
import { ProfileSkeleton } from "@/components/skeletons/profile-skeleton"

export default function BentoProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  if (status === "loading") {
    return (
      <>
        <Header
          title="Profile"
          description="Account and preferences."
          variant="console"
        />
        <div className="mx-auto max-w-7xl min-h-[calc(100dvh-5.5rem)] space-y-4 px-4 pb-10 pt-4 sm:space-y-6 sm:px-6 lg:px-8">
          <ProfileSkeleton />
        </div>
      </>
    )
  }

  if (!session) return null

  return (
    <>
      <Header
        title="Profile"
        description="Account and preferences."
        variant="console"
      />
      <div className="mx-auto max-w-7xl min-h-[calc(100dvh-5.5rem)] space-y-4 px-4 pb-10 pt-4 sm:space-y-6 sm:px-6 lg:px-8">
        <ProfilePageBento />
      </div>
    </>
  )
}
