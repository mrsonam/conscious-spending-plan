"use client"

import { Suspense } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { CommandPaletteProvider } from "@/components/command-palette"
import { ProductTourProvider } from "@/components/product-tour/product-tour-provider"
import { TOKENS } from "@/lib/wealth-console-tokens"

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <ProductTourProvider>
    <CommandPaletteProvider>
      <div
        data-dashboard-shell
        className="flex h-dvh max-h-dvh overflow-hidden"
        style={{ background: TOKENS.surface }}
      >
        <Sidebar />
        <main className="flex min-h-0 w-full flex-1 flex-col overflow-x-hidden overflow-y-auto pb-[env(safe-area-inset-bottom)] lg:ml-0">
          {children}
        </main>
      </div>
    </CommandPaletteProvider>
      </ProductTourProvider>
    </Suspense>
  )
}
