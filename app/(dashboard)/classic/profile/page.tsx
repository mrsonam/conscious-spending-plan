"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { User, Mail } from "lucide-react"
import { ProfileSkeleton } from "@/components/skeletons/profile-skeleton"
import { DashboardThemePicker } from "@/components/dashboard-theme-picker"
import { BENTO } from "@/lib/app-routes"

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return
    if ((session.user.dashboardTheme ?? "classic") === "console") {
      router.replace(BENTO.profile)
    }
  }, [status, session?.user, router])

  if (status === "loading") {
    return (
      <>
        <Header title="Profile" />
        <div className="p-4 sm:p-6 max-w-2xl mx-auto">
          <ProfileSkeleton />
        </div>
      </>
    )
  }

  if (!session) return null

  if ((session.user.dashboardTheme ?? "classic") === "console") {
    return null
  }

  return (
    <>
      <Header title="Profile" />
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>
              Your profile details and account preferences.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              {session.user?.image ? (
                <img
                  src={session.user.image}
                  alt="Profile"
                  className="h-16 w-16 rounded-full object-cover ring-2 ring-indigo-100"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-2xl font-semibold text-indigo-700">
                  {session.user?.email
                    ? session.user.email
                        .split("@")[0]
                        .split(".")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)
                    : "U"}
                </div>
              )}
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {session.user?.name || "User"}
                </h3>
                <p className="text-sm text-gray-500">{session.user?.email}</p>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-gray-400" />
                <div>
                  <div className="text-sm font-medium text-gray-500">Email</div>
                  <div className="text-sm text-gray-900">{session.user?.email}</div>
                </div>
              </div>

              {session.user?.name && (
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="text-sm font-medium text-gray-500">Name</div>
                    <div className="text-sm text-gray-900">{session.user.name}</div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Dashboard</CardTitle>
            <CardDescription>
              Choose which home dashboard loads when you open Dashboard or sign
              in. Your choice is saved to your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DashboardThemePicker />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
