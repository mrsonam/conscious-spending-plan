"use client"

import { useSession, signOut } from "next-auth/react"
import { ChevronDown, LogOut } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { TOKENS } from "@/lib/wealth-console-tokens"

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
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

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
        className="sticky top-0 z-30 border-b px-4 py-3 backdrop-blur-md sm:px-6 lg:pl-6"
        style={{
          background: `color-mix(in srgb, ${TOKENS.surface} 92%, transparent)`,
          borderColor: TOKENS.outlineGhost,
        }}
      >
        <div className="min-w-0 pl-10 lg:pl-0">
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
      </header>
    )
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex min-h-16 items-center justify-between gap-4 px-4 py-2 sm:px-6 lg:pl-6",
        "bg-white shadow-sm"
      )}
    >
      <div className="ml-12 min-w-0 flex-1 pr-2 lg:ml-0">
        <h1 className="text-lg sm:text-xl font-semibold truncate text-gray-900">
          {title}
        </h1>
        {description ? (
          <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{description}</p>
        ) : null}
      </div>
      <div className="relative flex-shrink-0 self-center" ref={dropdownRef}>
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
    </header>
  )
}
