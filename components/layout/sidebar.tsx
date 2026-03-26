"use client"

import { useSession } from "next-auth/react"
import { SidebarClassic } from "@/components/layout/sidebar-classic"
import { SidebarBento } from "@/components/layout/sidebar-bento"

export function Sidebar() {
  const { data: session, status } = useSession()
  const isConsole =
    status === "authenticated" &&
    session?.user?.dashboardTheme === "console"

  if (isConsole) {
    return <SidebarBento />
  }
  return <SidebarClassic />
}
