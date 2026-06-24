"use client"

import { Suspense } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { CommandPaletteProvider } from "@/components/command-palette"
import { ProductTourProvider } from "@/components/product-tour/product-tour-provider"
import { TOKENS } from "@/lib/wealth-console-tokens"
import { DashboardConsoleWarmup } from "@/components/layout/dashboard-console-warmup"
import { QuickExpenseProvider } from "@/components/layout/quick-expense-provider"
import { AiChatButton } from "@/components/ai-chat/ai-chat-button"
import { Toaster } from "@/components/ui/sonner"

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <ProductTourProvider>
    <CommandPaletteProvider>
      <QuickExpenseProvider>
      <DashboardConsoleWarmup />
      <div
        data-dashboard-shell
        className="flex h-dvh max-h-dvh overflow-hidden"
        style={{ background: TOKENS.surface }}
      >
        <Toaster />
        <Sidebar />
        <main className="flex min-h-0 w-full flex-1 flex-col overflow-x-hidden overflow-y-auto pb-[env(safe-area-inset-bottom)] lg:ml-0">
          {children}
        </main>
      </div>
      <AiChatButton />
      </QuickExpenseProvider>
    </CommandPaletteProvider>
      </ProductTourProvider>
    </Suspense>
  )
}
