"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { User, Mail, Coins } from "lucide-react"
import { AppSelect } from "@/components/ui/app-select"
import { Button } from "@/components/ui/button"
import {
  DEFAULT_DISPLAY_CURRENCY,
  normalizeDisplayCurrency,
} from "@/lib/display-currency"
import { buildCurrencySelectOptions } from "@/components/ui/currency-select-options"
import { ProfileSkeleton } from "@/components/skeletons/profile-skeleton"
import { AppCacheResetSection } from "@/components/profile/app-cache-reset"
import { BENTO } from "@/lib/app-routes"

export default function ProfilePage() {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const [displayCurrency, setDisplayCurrency] = useState(DEFAULT_DISPLAY_CURRENCY)
  const [currencySaving, setCurrencySaving] = useState(false)
  const [currencyMessage, setCurrencyMessage] = useState<string | null>(null)

  useEffect(() => {
    if (session?.user?.displayCurrency) {
      setDisplayCurrency(normalizeDisplayCurrency(session.user.displayCurrency))
    }
  }, [session?.user?.displayCurrency])

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
        <div className="mx-auto max-w-7xl p-4 sm:p-6">
          <div className="mx-auto max-w-2xl">
            <ProfileSkeleton />
          </div>
        </div>
      </>
    )
  }

  if (!session) return null

  if ((session.user.dashboardTheme ?? "classic") === "console") {
    return null
  }

  const saveDisplayCurrency = async () => {
    setCurrencySaving(true)
    setCurrencyMessage(null)
    try {
      const res = await fetch("/api/user/display-currency", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayCurrency }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setCurrencyMessage(data.error || "Could not save currency")
        return
      }
      await update({ displayCurrency })
      setCurrencyMessage("Display currency saved.")
    } catch {
      setCurrencyMessage("Something went wrong.")
    } finally {
      setCurrencySaving(false)
    }
  }

  return (
    <>
      <Header title="Profile" />
      <div className="mx-auto max-w-7xl p-4 sm:p-6">
        <div className="mx-auto max-w-2xl space-y-6">
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-indigo-600" />
              Display currency
            </CardTitle>
            <CardDescription>
              Amounts across the app use this symbol and grouping. Stored numbers are unchanged.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex max-w-md flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <label htmlFor="classic-display-currency" className="text-sm font-medium text-gray-700">
                  Currency
                </label>
                <AppSelect
                  id="classic-display-currency"
                  value={displayCurrency}
                  onValueChange={setDisplayCurrency}
                  variant="classic"
                  options={buildCurrencySelectOptions()}
                  placeholder="Select currency"
                  className="mt-1.5"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={currencySaving}
                onClick={() => void saveDisplayCurrency()}
              >
                {currencySaving ? "Saving…" : "Save"}
              </Button>
            </div>
            {currencyMessage ? (
              <p className="text-sm text-green-700">{currencyMessage}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>This device</CardTitle>
            <CardDescription>
              Clear offline cache and reload the latest app shell.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AppCacheResetSection variant="classic" />
          </CardContent>
        </Card>
        </div>
      </div>
    </>
  )
}
