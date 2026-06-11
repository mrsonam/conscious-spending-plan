"use client"

import type { LucideIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { X, Menu, LogOut, ChevronsLeft, ChevronsRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useEffect, useMemo } from "react"
import { buildSidebarNavigationGroups } from "@/lib/sidebar-nav"
import { CSP_OPEN_SIDEBAR_EVENT, NAV_ITEM_TOUR_IDS } from "@/lib/product-tour"
import { TOKENS, CARD_INSET } from "@/lib/wealth-console-tokens"
import { BENTO } from "@/lib/app-routes"
import { prefetchDashboardConsole } from "@/lib/dashboard-console-cache"
import { prefetchRouteData } from "@/lib/route-data-warmup"
import { CspBrandMark } from "@/components/brand/csp-brand-mark"

const SIDEBAR_COLLAPSED_KEY = "csp-wealth-console-sidebar-collapsed"

function NavRow({
  href,
  icon: Icon,
  label,
  active,
  collapsed,
  tourId,
  onWarmNavigate,
}: {
  href: string
  icon: LucideIcon
  label: string
  active: boolean
  collapsed: boolean
  tourId?: string
  onWarmNavigate?: () => void
}) {
  return (
    <Link
      href={href}
      prefetch
      data-tour={tourId}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      onMouseEnter={onWarmNavigate}
      onFocus={onWarmNavigate}
      onTouchStart={onWarmNavigate}
      className={cn(
        "group relative flex touch-manipulation items-center rounded-xl py-2 transition-all duration-200",
        collapsed
          ? "justify-center px-0"
          : "gap-3 pl-2 pr-3",
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
      {active && !collapsed ? (
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
          outline: active && collapsed ? `2px solid color-mix(in srgb, ${TOKENS.primary} 45%, transparent)` : undefined,
        }}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.25 : 2} />
      </span>
      {!collapsed ? (
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
      ) : null}
    </Link>
  )
}

export function SidebarBento() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [isLg, setIsLg] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)")
    const onChange = () => setIsLg(mq.matches)
    onChange()
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  const railCollapsed = collapsed && isLg

  useEffect(() => {
    try {
      if (typeof window === "undefined") return
      if (window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1") {
        setCollapsed(true)
      }
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    try {
      if (typeof window === "undefined") return
      window.localStorage.setItem(
        SIDEBAR_COLLAPSED_KEY,
        collapsed ? "1" : "0"
      )
    } catch {
      /* ignore */
    }
  }, [collapsed])

  const groups = useMemo(
    () => buildSidebarNavigationGroups(session?.user?.dashboardTheme),
    [session?.user?.dashboardTheme]
  )

  useEffect(() => {
    setIsMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    const open = () => setIsMobileOpen(true)
    window.addEventListener(CSP_OPEN_SIDEBAR_EVENT, open)
    return () => window.removeEventListener(CSP_OPEN_SIDEBAR_EVENT, open)
  }, [])

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
        className="fixed z-50 flex touch-manipulation items-center justify-center rounded-xl border p-2.5 shadow-xl backdrop-blur-md transition-transform active:scale-95 lg:hidden"
        style={{
          left: "max(0.75rem, env(safe-area-inset-left, 0px))",
          top: "max(0.75rem, env(safe-area-inset-top, 0px))",
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
          "fixed inset-y-0 left-0 z-50 flex h-full w-[17.5rem] flex-col pt-[env(safe-area-inset-top,0px)] transition-[width,transform] duration-300 ease-out lg:static lg:translate-x-0 lg:pt-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
          railCollapsed && "lg:w-[4.75rem]"
        )}
        style={{
          background: `linear-gradient(175deg, ${TOKENS.surface} 0%, ${TOKENS.surfaceLow} 45%, #0d1528 100%)`,
          borderRight: `1px solid ${TOKENS.outlineGhost}`,
          boxShadow:
            "8px 0 40px rgba(0,0,0,0.35), inset -1px 0 0 rgba(218,226,253,0.04)",
        }}
      >
        {/* Accent rail */}
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
            className={cn(
              "shrink-0 border-b pb-4 pt-5",
              railCollapsed ? "px-2 sm:px-2" : "px-4 sm:px-5"
            )}
            style={{ borderColor: TOKENS.outlineGhost }}
          >
            <div
              className={cn(
                "flex items-start justify-between gap-2",
                railCollapsed && "lg:flex-col lg:items-center"
              )}
            >
              <div
                className={cn(
                  "min-w-0 flex-1",
                  railCollapsed && "lg:mx-auto lg:flex-none",
                )}
                onMouseEnter={prefetchDashboardConsole}
              >
                <CspBrandMark
                  href={BENTO.dashboard}
                  size={railCollapsed ? "md" : "lg"}
                  wordmark={railCollapsed ? "none" : "short"}
                  eyebrow={railCollapsed ? undefined : "Wealth Console"}
                  className={cn(
                    "items-start",
                    railCollapsed && "lg:justify-center",
                  )}
                  onClick={() => setIsMobileOpen(false)}
                />
              </div>
              <div
                className={cn(
                  "flex shrink-0 items-center gap-1",
                  railCollapsed && "lg:w-full lg:justify-center"
                )}
              >
                <button
                  type="button"
                  onClick={() => setCollapsed((c) => !c)}
                  className="hidden rounded-lg p-2 transition-colors hover:bg-white/[0.06] lg:flex"
                  style={{ color: TOKENS.onSurfaceMuted }}
                  aria-expanded={!collapsed}
                  aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                  {railCollapsed ? (
                    <ChevronsRight className="h-5 w-5" strokeWidth={2} />
                  ) : (
                    <ChevronsLeft className="h-5 w-5" strokeWidth={2} />
                  )}
                </button>
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
          </div>

          {/* Scrollable nav */}
          <nav
            className={cn(
              "scrollbar-none min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-4",
              railCollapsed ? "px-1.5 sm:px-1.5" : "px-3 sm:px-4"
            )}
          >
            <div className="space-y-7">
              {groups.map((group) => (
                <div key={group.id} aria-label={railCollapsed ? group.label : undefined}>
                  {!railCollapsed ? (
                    <p
                      className="mb-2.5 px-2 text-[10px] font-semibold uppercase tracking-[0.22em]"
                      style={{ color: TOKENS.onSurfaceMuted }}
                    >
                      {group.label}
                    </p>
                  ) : null}
                  <div className="space-y-1">
                    {group.items.map((item) => (
                      <NavRow
                        key={item.href + item.name}
                        href={item.href}
                        icon={item.icon}
                        label={item.name}
                        active={pathname === item.href}
                        collapsed={railCollapsed}
                        tourId={NAV_ITEM_TOUR_IDS[item.name]}
                        onWarmNavigate={() => prefetchRouteData(item.href)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </nav>

          {/* Footer — session + sign out (console header language) */}
          <div
            className={cn(
              "shrink-0 border-t py-4",
              railCollapsed ? "px-1.5 sm:px-1.5" : "px-3 sm:px-4"
            )}
            style={{
              borderColor: TOKENS.outlineGhost,
              background: `color-mix(in srgb, ${TOKENS.surface} 65%, transparent)`,
            }}
          >
            <Link
              href={BENTO.profile}
              title={railCollapsed ? "Profile" : undefined}
              className={cn(
                "flex min-w-0 items-center rounded-xl py-2 transition-colors hover:bg-white/[0.04]",
                railCollapsed
                  ? "justify-center px-0"
                  : "gap-3 px-2"
              )}
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
              {!railCollapsed ? (
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
              ) : null}
            </Link>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              title="Sign out"
              className={cn(
                "flex w-full items-center rounded-lg border transition-colors hover:bg-white/[0.06]",
                railCollapsed
                  ? "mt-2 justify-center px-0 py-2.5"
                  : "mt-3 justify-center gap-2 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em]"
              )}
              style={{
                borderColor: TOKENS.outlineGhost,
                color: TOKENS.onSurfaceMuted,
              }}
            >
              <LogOut className="h-4 w-4 shrink-0" strokeWidth={2} />
              {!railCollapsed ? <span>Sign out</span> : null}
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
