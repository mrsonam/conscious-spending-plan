"use client"

import { useHydratedSession } from "@/hooks/use-hydrated-session"
import { Header } from "@/components/layout/header"
import { ProfilePageBento } from "@/components/profile/profile-page-bento"
import { ProfileSkeleton } from "@/components/skeletons/profile-skeleton"
import { TOKENS } from "@/lib/wealth-console-tokens"

export default function BentoProfilePage() {
  const { session, isSessionPending } = useHydratedSession()

  const initialSessionLoading = isSessionPending

  if (initialSessionLoading) {
    return (
      <>
        <Header
          title="Profile"
          description="Account and preferences."
         
        />
        <div
          className="mx-auto max-w-7xl space-y-4 px-4 pb-10 pt-4 sm:space-y-6 sm:px-6 lg:px-8"
          style={{ background: TOKENS.surface }}
        >
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
       
      />
      <div
        className="mx-auto max-w-7xl space-y-4 px-4 pb-10 pt-4 sm:space-y-6 sm:px-6 lg:px-8"
        style={{ background: TOKENS.surface }}
      >
        <ProfilePageBento />
      </div>
    </>
  )
}
