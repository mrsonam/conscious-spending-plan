"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { X, Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useEffect, useMemo } from "react"
import { buildSidebarNavigation } from "@/lib/sidebar-nav"

export function SidebarClassic() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const navigation = useMemo(
    () => buildSidebarNavigation(session?.user?.dashboardTheme),
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

  return (
    <>
      <button
        onClick={() => setIsMobileOpen(true)}
        className="fixed left-3 top-3 z-50 touch-manipulation rounded-lg bg-white p-2 shadow-md transition-colors hover:bg-gray-50 active:bg-gray-100 lg:hidden"
        aria-label="Open menu"
        type="button"
      >
        <Menu className="h-5 w-5 text-gray-700" />
      </button>

      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity lg:hidden"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden
        />
      )}

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-full w-64 flex-col bg-white shadow-lg transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 lg:shadow-none",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <img
              src="/icon.svg"
              alt=""
              className="h-8 w-8 rounded-lg object-contain"
            />
            <span className="text-lg font-semibold text-gray-900">CSP</span>
          </div>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="rounded-lg p-1 transition-colors hover:bg-gray-100 lg:hidden"
            aria-label="Close menu"
            type="button"
          >
            <X className="h-5 w-5 text-gray-700" />
          </button>
        </div>
        <nav className="scrollbar-none flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex touch-manipulation items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </>
  )
}
