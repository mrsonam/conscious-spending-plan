import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getOnboardingStatus } from "@/lib/onboarding-server"
import { TOKENS } from "@/lib/wealth-console-tokens"

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/login")
  }

  const status = await getOnboardingStatus(session.user.id)
  if (!status.needsOnboarding) {
    redirect("/dashboard")
  }

  return (
    <div
      className="flex min-h-dvh flex-col"
      data-csp-dashboard-theme="console"
      style={{ background: TOKENS.surface }}
    >
      {children}
    </div>
  )
}
