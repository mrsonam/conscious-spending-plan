"use client"

import { useSession, signOut } from "next-auth/react"
import { ChevronDown, LogOut, Search } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { TOKENS } from "@/lib/wealth-console-tokens"
import { useCommandPalette } from "@/components/command-palette"
import { CspBrandMark } from "@/components/brand/csp-brand-mark"
import { BENTO, CLASSIC } from "@/lib/app-routes"

export function Header({
  title,
  description,
  variant = "classic",
}: {
  title: string
  /** Subtitle under the title (console: always supported; classic: shown when set). */
  description?: string
  /** Matches Wealth Console shell when using dashboard theme “console”. */
  variant?: "classic" | "console"
}) {
  const isConsole = variant === "console"
  const { data: session } = useSession()
  const { open: openCommandPalette } = useCommandPalette()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [searchShortcut, setSearchShortcut] = useState("⌘K")

  useEffect(() => {
    setSearchShortcut(
      typeof navigator !== "undefined" &&
        /Mac|iPhone|iPod|iPad/i.test(navigator.platform)
        ? "⌘K"
        : "Ctrl+K"
    )
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const getInitials = (email: string) => {
    return email
      .split("@")[0]
      .split(".")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  if (isConsole) {
    return (
      <header
        className="sticky top-0 z-30 border-b px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))] sm:px-6 lg:pl-6"
        style={{
          background: `color-mix(in srgb, ${TOKENS.surface} 96%, transparent)`,
          borderColor: TOKENS.outlineGhost,
        }}
      >
        <div className="flex items-start justify-between gap-3 pl-12 sm:pl-14 lg:pl-0">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <CspBrandMark
              href={BENTO.dashboard}
              size="sm"
              wordmark="none"
              variant="console"
              className="shrink-0 lg:hidden"
            />
            <div className="min-w-0 flex-1">
              <h1
                className="text-lg font-semibold leading-tight tracking-tight sm:text-xl"
                style={{ color: TOKENS.onSurface }}
              >
                {title}
              </h1>
              {description ? (
                <p
                  className="mt-1 max-w-2xl text-[11px] leading-snug sm:text-xs"
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  {description}
                </p>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={() => openCommandPalette()}
            className="flex shrink-0 touch-manipulation items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4edea3]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1326] sm:px-3"
            style={{
              borderColor: TOKENS.outlineGhost,
              color: TOKENS.onSurfaceMuted,
              background: `color-mix(in srgb, ${TOKENS.surfaceHigh} 70%, transparent)`,
            }}
            aria-label="Search and navigate"
          >
            <Search className="h-4 w-4" style={{ color: TOKENS.onSurface }} />
            <kbd
              className="hidden font-mono text-[10px] opacity-90 sm:inline"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              {searchShortcut}
            </kbd>
          </button>
        </div>
      </header>
    )
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex min-h-16 items-center justify-between gap-4 px-4 pb-2 pt-[max(0.5rem,env(safe-area-inset-top,0px))] sm:px-6 lg:pl-6",
        "bg-white shadow-sm"
      )}
    >
      <div className="ml-14 flex min-w-0 flex-1 items-center gap-3 pr-2 sm:ml-16 lg:ml-0">
        <CspBrandMark
          href={CLASSIC.dashboard}
          size="sm"
          wordmark="none"
          variant="classic"
          className="shrink-0 lg:hidden"
        />
        <div className="min-w-0 flex-1">
        <h1 className="text-lg sm:text-xl font-semibold truncate text-gray-900">
          {title}
        </h1>
        {description ? (
          <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{description}</p>
        ) : null}
        </div>
      </div>
      <div className="flex flex-shrink-0 items-center gap-2 self-center">
        <button
          type="button"
          onClick={() => openCommandPalette()}
          className="flex touch-manipulation items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
          aria-label="Search and navigate"
        >
          <Search className="h-4 w-4 text-gray-700" />
          <kbd className="hidden font-mono text-[10px] text-gray-500 sm:inline">
            {searchShortcut}
          </kbd>
        </button>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex touch-manipulation items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-gray-50 active:bg-gray-100 sm:px-3"
          aria-label="User menu"
        >
          {session?.user?.image ? (
            <img
              src={session.user.image}
              alt=""
              className="h-8 w-8 flex-shrink-0 rounded-full object-cover ring-1 ring-gray-200"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-medium text-indigo-700">
              {session?.user?.email ? getInitials(session.user.email) : "U"}
            </div>
          )}
          <span className="hidden max-w-[120px] truncate text-sm font-medium text-gray-700 sm:block">
            {session?.user?.name || session?.user?.email?.split("@")[0]}
          </span>
          <ChevronDown className="h-4 w-4 flex-shrink-0 text-gray-500" />
        </button>
        {isOpen && (
          <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-gray-200 bg-white shadow-lg">
            <div className="p-2">
              <div className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700">
                {session?.user?.image ? (
                  <img
                    src={session.user.image}
                    alt=""
                    className="h-9 w-9 flex-shrink-0 rounded-full object-cover ring-1 ring-gray-200"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-medium text-indigo-700">
                    {session?.user?.email ? getInitials(session.user.email) : "U"}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{session?.user?.name || "User"}</div>
                  <div className="truncate text-xs text-gray-500">
                    {session?.user?.email}
                  </div>
                </div>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex w-full touch-manipulation items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 active:bg-gray-100"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
    </header>
  )
}
