"use client"

import { useSession, signOut } from "next-auth/react"
import { ChevronDown, LogOut, User } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function Header({ title }: { title: string }) {
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

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between bg-white shadow-sm px-4 sm:px-6 lg:pl-6">
      <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate pr-2 ml-12 lg:ml-0">{title}</h1>
      <div className="relative flex-shrink-0" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 rounded-lg px-2 sm:px-3 py-2 hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
          aria-label="User menu"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-medium text-indigo-700 flex-shrink-0">
            {session?.user?.email ? getInitials(session.user.email) : "U"}
          </div>
          <span className="hidden sm:block text-sm font-medium text-gray-700 truncate max-w-[120px]">
            {session?.user?.name || session?.user?.email?.split("@")[0]}
          </span>
          <ChevronDown className="h-4 w-4 text-gray-500 flex-shrink-0" />
        </button>
        {isOpen && (
          <div className="absolute right-0 mt-2 w-56 rounded-lg border bg-white shadow-lg z-50">
            <div className="p-2">
              <div className="px-3 py-2 text-sm text-gray-700">
                <div className="font-medium truncate">{session?.user?.name || "User"}</div>
                <div className="text-xs text-gray-500 truncate">{session?.user?.email}</div>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
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
