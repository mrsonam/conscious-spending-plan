"use client"

import { Sidebar } from "@/components/layout/sidebar"
import { CommandPaletteProvider } from "@/components/command-palette"
import { TOKENS } from "@/lib/wealth-console-tokens"

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <CommandPaletteProvider>
      <div
        className="flex h-screen overflow-hidden"
        style={{ background: TOKENS.surface }}
      >
        <Sidebar />
        <main className="flex-1 overflow-y-auto lg:ml-0 w-full">
          <div className="min-h-full">{children}</div>
        </main>
      </div>
    </CommandPaletteProvider>
  )
}
