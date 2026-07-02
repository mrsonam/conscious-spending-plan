"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import { Coins, Compass, Mail, Shield, User } from "lucide-react"
import { useProductTour } from "@/components/product-tour/product-tour-provider"
import { AppCacheResetSection } from "@/components/profile/app-cache-reset"
import { AppSelect } from "@/components/ui/app-select"
import { Button } from "@/components/ui/button"
import {
  DEFAULT_DISPLAY_CURRENCY,
  normalizeDisplayCurrency,
} from "@/lib/display-currency"
import { buildCurrencySelectOptions } from "@/components/ui/currency-select-options"
import { RedbarkSetupSection } from "@/components/redbark/redbark-setup-section"

function getInitials(email: string) {
  return email
    .split("@")[0]
    .split(".")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function ProfilePageBento() {
  const { data: session, update } = useSession()
  const { startTour } = useProductTour()
  const [displayCurrency, setDisplayCurrency] = useState(
    DEFAULT_DISPLAY_CURRENCY,
  )
  const [currencySaving, setCurrencySaving] = useState(false)
  const [currencyMessage, setCurrencyMessage] = useState<string | null>(null)
  useEffect(() => {
    if (session?.user?.displayCurrency) {
      setDisplayCurrency(normalizeDisplayCurrency(session.user.displayCurrency))
    }
  }, [session?.user?.displayCurrency])

  if (!session?.user) return null

  const u = session.user

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
    <div className="space-y-6 sm:space-y-8">
      <section className="px-1 py-2 sm:px-2">
        <div className="flex flex-wrap items-center justify-end gap-3">
          <div
            className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em]"
            style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.secondary, background: TOKENS.surfaceHigh }}
          >
            <Shield className="h-3.5 w-3.5" />
            Identity
          </div>
        </div>

        <div className="mt-5">
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl" style={{ color: TOKENS.onSurface }}>
            Operator profile
          </h2>
        </div>
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-12 lg:gap-5">
        <section
          className="rounded-xl border p-5 sm:p-6 lg:col-span-12"
          style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost, boxShadow: CARD_INSET }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: TOKENS.onSurfaceMuted }}>
            Account
          </p>

          <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-center">
            {u.image ? (
              <img
                src={u.image}
                alt=""
                className="h-20 w-20 shrink-0 rounded-2xl border-2 object-cover"
                style={{ borderColor: TOKENS.outlineGhost }}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div
                className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-xl font-black"
                style={{
                  background: TOKENS.surfaceHigh,
                  border: `1px solid ${TOKENS.outlineGhost}`,
                  color: TOKENS.primary,
                }}
              >
                {u.email ? getInitials(u.email) : "U"}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-lg font-bold" style={{ color: TOKENS.onSurface }}>
                {u.name || "User"}
              </p>
              <p className="mt-1 truncate text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
                {u.email}
              </p>
            </div>
          </div>

          <div className="mt-8 space-y-4 border-t pt-6" style={{ borderColor: TOKENS.outlineGhost }}>
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-4 w-4 shrink-0" style={{ color: TOKENS.onSurfaceMuted }} />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                  Email
                </p>
                <p className="mt-0.5 text-sm" style={{ color: TOKENS.onSurface }}>
                  {u.email}
                </p>
              </div>
            </div>
            {u.name ? (
              <div className="flex items-start gap-3">
                <User className="mt-0.5 h-4 w-4 shrink-0" style={{ color: TOKENS.onSurfaceMuted }} />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                    Display name
                  </p>
                  <p className="mt-0.5 text-sm" style={{ color: TOKENS.onSurface }}>
                    {u.name}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-12 lg:gap-5">
        <section
          className="rounded-xl border p-5 sm:p-6 lg:col-span-12"
          style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost, boxShadow: CARD_INSET }}
        >
          <div className="flex flex-wrap items-center justify-end gap-3">
            <div
              className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em]"
              style={{
                borderColor: TOKENS.outlineGhost,
                color: TOKENS.secondary,
                background: TOKENS.surfaceHigh,
              }}
            >
              <Coins className="h-3.5 w-3.5" />
              Numbers
            </div>
          </div>
          <p
            className="mt-5 text-[10px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: TOKENS.onSurfaceMuted }}
          >
            Display currency
          </p>
          <p className="mt-2 max-w-xl text-sm leading-relaxed" style={{ color: TOKENS.onSurfaceMuted }}>
            Amounts in the app are shown in this currency. Stored values are unchanged; only labels and
            grouping update.
          </p>
          <div className="mt-5 flex max-w-md flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label
                htmlFor="display-currency"
                className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: TOKENS.onSurfaceMuted }}
              >
                Currency
              </label>
              <AppSelect
                id="display-currency"
                value={displayCurrency}
                onValueChange={setDisplayCurrency}
               
                options={buildCurrencySelectOptions()}
                placeholder="Select currency"
                className="mt-1.5"
                style={{
                  borderColor: TOKENS.outlineGhost,
                  background: TOKENS.surfaceLow,
                  color: TOKENS.onSurface,
                }}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={currencySaving}
              onClick={() => void saveDisplayCurrency()}
              className="shrink-0 border-[rgba(218,226,253,0.12)] bg-[#131b2e] text-[#dae2fd] hover:bg-white/10"
            >
              {currencySaving ? "Saving…" : "Save"}
            </Button>
          </div>
          {currencyMessage ? (
            <p className="mt-3 text-sm" style={{ color: TOKENS.primary }}>
              {currencyMessage}
            </p>
          ) : null}
        </section>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-12 lg:gap-5">
        <section
          className="rounded-xl border p-5 sm:p-6 lg:col-span-12"
          style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost, boxShadow: CARD_INSET }}
        >
          <RedbarkSetupSection />
        </section>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-12 lg:gap-5">
        <section
          className="rounded-xl border p-5 sm:p-6 lg:col-span-12"
          style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost, boxShadow: CARD_INSET }}
        >
          <h2 className="text-sm font-semibold" style={{ color: TOKENS.onSurface }}>
            App tour
          </h2>
          <p className="mt-1 text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
            Replay the spotlight walkthrough of sidebar tabs and core features.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => startTour()}
            className="mt-4 gap-2 border-[rgba(218,226,253,0.12)] bg-[#131b2e] text-[#dae2fd] hover:bg-white/10"
          >
            <Compass className="h-4 w-4" />
            Replay tour
          </Button>
        </section>
        <section
          className="rounded-xl border p-5 sm:p-6 lg:col-span-12"
          style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost, boxShadow: CARD_INSET }}
        >
          <AppCacheResetSection />
        </section>
      </div>
    </div>
  )
}
