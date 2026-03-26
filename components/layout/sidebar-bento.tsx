"use client"

import type { LucideIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { X, Menu, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useEffect, useMemo } from "react"
import { buildSidebarNavigationGroups } from "@/lib/sidebar-nav"
import { TOKENS, CARD_INSET } from "@/lib/wealth-console-tokens"
import { CLASSIC } from "@/lib/app-routes"

function NavRow({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string
  icon: LucideIcon
  label: string
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex touch-manipulation items-center gap-3 rounded-xl py-2 pl-2 pr-3 transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4edea3]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1326]",
        !active && "hover:bg-white/[0.04]"
      )}
      style={
        active
          ? {
              boxShadow: CARD_INSET,
              background: TOKENS.surfaceContainer,
            }
          : undefined
      }
    >
      {active ? (
        <span
          className="absolute bottom-2 left-0 top-2 w-1 rounded-full"
          style={{ background: TOKENS.primary }}
          aria-hidden
        />
      ) : null}
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors duration-200"
        style={{
          background: active
            ? `color-mix(in srgb, ${TOKENS.primary} 16%, ${TOKENS.surfaceHigh})`
            : TOKENS.surfaceContainer,
          boxShadow: active ? CARD_INSET : CARD_INSET,
          color: active ? TOKENS.primary : TOKENS.onSurfaceMuted,
        }}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.25 : 2} />
      </span>
      <span
        className={cn(
          "min-w-0 flex-1 text-[13px] leading-tight tracking-tight transition-colors",
          active ? "font-semibold" : "font-medium"
        )}
        style={{
          color: active ? TOKENS.onSurface : TOKENS.onSurfaceMuted,
        }}
      >
        {label}
      </span>
    </Link>
  )
}

export function SidebarBento() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const groups = useMemo(
    () => buildSidebarNavigationGroups(session?.user?.dashboardTheme),
    [session?.user?.dashboardTheme]
  )

  useEffect(() => {
    setIsMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isMobileOpen])

  const email = session?.user?.email ?? ""
  const displayName =
    session?.user?.name?.trim() ||
    (email ? email.split("@")[0] : "Account")

  return (
    <>
      <button
        onClick={() => setIsMobileOpen(true)}
        className="fixed left-3 top-3 z-50 flex touch-manipulation items-center justify-center rounded-xl border p-2.5 shadow-xl backdrop-blur-md transition-transform active:scale-95 lg:hidden"
        style={{
          background: `color-mix(in srgb, ${TOKENS.surface} 88%, transparent)`,
          borderColor: TOKENS.outlineGhost,
          color: TOKENS.primary,
          boxShadow: `0 8px 32px rgba(0,0,0,0.35)`,
        }}
        aria-label="Open menu"
        type="button"
      >
        <Menu className="h-5 w-5" strokeWidth={2} />
      </button>

      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#050a14]/75 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-full w-[17.5rem] flex-col transition-transform duration-300 ease-out lg:static lg:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{
          background: `linear-gradient(175deg, ${TOKENS.surface} 0%, ${TOKENS.surfaceLow} 45%, #0d1528 100%)`,
          borderRight: `1px solid ${TOKENS.outlineGhost}`,
          boxShadow:
            "8px 0 40px rgba(0,0,0,0.35), inset -1px 0 0 rgba(218,226,253,0.04)",
        }}
      >
        {/* Accent rail — matches console “institutional” vertical */}
        <div
          className="pointer-events-none absolute bottom-0 left-0 top-0 w-px opacity-90"
          style={{
            background: `linear-gradient(180deg, ${TOKENS.primary} 0%, transparent 28%, transparent 72%, ${TOKENS.secondary} 100%)`,
          }}
          aria-hidden
        />

        <div className="relative flex min-h-0 flex-1 flex-col">
          {/* Brand */}
          <div
            className="shrink-0 border-b px-4 pb-4 pt-5 sm:px-5"
            style={{ borderColor: TOKENS.outlineGhost }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-start gap-3">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                style={{
                  background: TOKENS.surfaceContainer,
                  boxShadow: `${CARD_INSET}, 0 12px 28px rgba(0,0,0,0.25)`,
                }}
              >
                <img
                  src="/icon.svg"
                  alt=""
                  className="h-7 w-7 object-contain opacity-95"
                />
              </div>
              <div className="min-w-0 pt-0.5">
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.28em]"
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  Wealth Console
                </p>
                <p
                  className="mt-1.5 text-lg font-semibold leading-none tracking-tight"
                  style={{ color: TOKENS.onSurface }}
                >
                  Finance
                </p>
              </div>
              </div>
              <button
                onClick={() => setIsMobileOpen(false)}
                className="shrink-0 rounded-lg p-2 transition-colors hover:bg-white/[0.06] lg:hidden"
                style={{ color: TOKENS.onSurfaceMuted }}
                aria-label="Close menu"
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Scrollable nav */}
          <nav className="scrollbar-none min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 sm:px-4">
            <div className="space-y-7">
              {groups.map((group) => (
                <div key={group.id}>
                  <p
                    className="mb-2.5 px-2 text-[10px] font-semibold uppercase tracking-[0.22em]"
                    style={{ color: TOKENS.onSurfaceMuted }}
                  >
                    {group.label}
                  </p>
                  <div className="space-y-1">
                    {group.items.map((item) => (
                      <NavRow
                        key={item.href + item.name}
                        href={item.href}
                        icon={item.icon}
                        label={item.name}
                        active={pathname === item.href}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </nav>

          {/* Footer — session + sign out (console header language) */}
          <div
            className="shrink-0 border-t px-3 py-4 sm:px-4"
            style={{
              borderColor: TOKENS.outlineGhost,
              background: `color-mix(in srgb, ${TOKENS.surface} 65%, transparent)`,
            }}
          >
            <Link
              href={CLASSIC.profile}
              className="flex min-w-0 items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-white/[0.04]"
            >
              {session?.user?.image ? (
                <img
                  src={session.user.image}
                  alt=""
                  className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-white/10"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  style={{
                    background: TOKENS.surfaceContainer,
                    color: TOKENS.secondary,
                    boxShadow: CARD_INSET,
                  }}
                >
                  {email
                    ? email
                        .split("@")[0]
                        .slice(0, 2)
                        .toUpperCase()
                    : "?"}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-[13px] font-semibold leading-tight"
                  style={{ color: TOKENS.onSurface }}
                >
                  {displayName}
                </p>
                {email ? (
                  <p
                    className="truncate text-[11px] leading-tight"
                    style={{ color: TOKENS.onSurfaceMuted }}
                  >
                    {email}
                  </p>
                ) : null}
              </div>
            </Link>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors hover:bg-white/[0.06]"
              style={{
                borderColor: TOKENS.outlineGhost,
                color: TOKENS.onSurfaceMuted,
              }}
            >
              <LogOut className="h-3.5 w-3.5" strokeWidth={2} />
              Sign out
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
