import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { getOnboardingRedirect } from "@/lib/onboarding-server"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) {
    redirect("/login")
  }

  const onboardingRedirect = await getOnboardingRedirect(session.user.id)
  if (onboardingRedirect) {
    redirect(onboardingRedirect)
  }

  return <DashboardShell>{children}</DashboardShell>
}
