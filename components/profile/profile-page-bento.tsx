"use client"

import { useSession } from "next-auth/react"
import { DashboardThemePicker } from "@/components/dashboard-theme-picker"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import { Mail, Shield, User } from "lucide-react"
import { AppCacheResetSection } from "@/components/profile/app-cache-reset"

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
  const { data: session } = useSession()

  if (!session?.user) return null

  const u = session.user

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="px-1 py-2 sm:px-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: TOKENS.primary, boxShadow: CARD_INSET }} />
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em]" style={{ color: TOKENS.onSurfaceMuted }}>
              Institutional console
            </p>
          </div>
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
          className="rounded-xl border p-5 sm:p-6 lg:col-span-7"
          style={{
            background: TOKENS.surfaceLow,
            borderColor: TOKENS.outlineGhost,
            boxShadow: CARD_INSET,
          }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em]" style={{ color: TOKENS.onSurfaceMuted }}>
            Dashboard
          </p>
          <div className="mt-4">
            <DashboardThemePicker variant="console" />
          </div>
        </section>

        <section
          className="rounded-xl border p-5 sm:p-6 lg:col-span-5"
          style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost, boxShadow: CARD_INSET }}
        >
          <AppCacheResetSection variant="console" />
        </section>
      </div>
    </div>
  )
}
