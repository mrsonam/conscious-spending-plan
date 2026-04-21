"use client"

import { useSession } from "next-auth/react"
import { Header } from "@/components/layout/header"
import { ProfilePageBento } from "@/components/profile/profile-page-bento"
import { ProfileSkeleton } from "@/components/skeletons/profile-skeleton"
import { TOKENS } from "@/lib/wealth-console-tokens"

export default function BentoProfilePage() {
  const { data: session, status } = useSession()

  const initialSessionLoading = status === "loading" && !session

  if (initialSessionLoading) {
    return (
      <>
        <Header
          title="Profile"
          description="Account and preferences."
          variant="console"
        />
        <div
          className="mx-auto min-h-[calc(100dvh-5.5rem)] max-w-7xl space-y-4 px-4 pb-10 pt-4 sm:space-y-6 sm:px-6 lg:px-8"
          style={{ background: TOKENS.surface }}
        >
          <ProfileSkeleton variant="console" />
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
      <div
        className="mx-auto min-h-[calc(100dvh-5.5rem)] max-w-7xl space-y-4 px-4 pb-10 pt-4 sm:space-y-6 sm:px-6 lg:px-8"
        style={{ background: TOKENS.surface }}
      >
        <ProfilePageBento />
      </div>
    </>
  )
}
