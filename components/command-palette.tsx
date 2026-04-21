"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Search } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { TOKENS } from "@/lib/wealth-console-tokens"
import { isDashboardTheme, type DashboardTheme } from "@/lib/dashboard-theme"
import {
  filterCommandPaletteItems,
  getCommandPaletteItems,
  type CommandPaletteItem,
} from "@/lib/command-palette-nav"

type CommandPaletteContextValue = {
  open: () => void
  close: () => void
  toggle: () => void
}

const CommandPaletteContext =
  React.createContext<CommandPaletteContextValue | null>(null)

export function useCommandPalette() {
  const ctx = React.useContext(CommandPaletteContext)
  if (!ctx) {
    throw new Error("useCommandPalette must be used within CommandPaletteProvider")
  }
  return ctx
}

function shouldIgnoreCmdKTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const el = target
  if (el.closest("[data-command-palette-input]")) return false
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    return true
  }
  if (el.isContentEditable) return true
  return false
}

function shellFromSession(theme: string | undefined): DashboardTheme {
  return isDashboardTheme(theme) ? theme : "console"
}

export function CommandPaletteProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [open, setOpen] = React.useState(false)

  const openPalette = React.useCallback(() => setOpen(true), [])
  const closePalette = React.useCallback(() => setOpen(false), [])
  const togglePalette = React.useCallback(() => setOpen((o) => !o), [])

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "k") return
      if (shouldIgnoreCmdKTarget(e.target)) return
      e.preventDefault()
      setOpen((o) => !o)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  const value = React.useMemo(
    () => ({
      open: openPalette,
      close: closePalette,
      toggle: togglePalette,
    }),
    [openPalette, closePalette, togglePalette]
  )

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
      <CommandPaletteDialog open={open} onOpenChange={setOpen} />
    </CommandPaletteContext.Provider>
  )
}

function CommandPaletteDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const { data: session } = useSession()
  const shell = shellFromSession(session?.user?.dashboardTheme)
  const isConsole = shell === "console"

  const items = React.useMemo(
    () => getCommandPaletteItems(shell),
    [shell]
  )

  const [query, setQuery] = React.useState("")
  const filtered = React.useMemo(
    () => filterCommandPaletteItems(items, query),
    [items, query]
  )

  const [selectedIndex, setSelectedIndex] = React.useState(0)
  React.useEffect(() => {
    setSelectedIndex(0)
  }, [query, items])

  React.useEffect(() => {
    if (!open) {
      setQuery("")
      setSelectedIndex(0)
    }
  }, [open])

  const inputRef = React.useRef<HTMLInputElement>(null)
  React.useEffect(() => {
    if (!open) return
    const id = window.requestAnimationFrame(() => inputRef.current?.focus())
    return () => window.cancelAnimationFrame(id)
  }, [open])

  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onOpenChange])

  const listRef = React.useRef<HTMLUListElement>(null)
  React.useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-index="${selectedIndex}"]`
    )
    el?.scrollIntoView({ block: "nearest" })
  }, [selectedIndex, filtered])

  const navigateTo = React.useCallback(
    (item: CommandPaletteItem) => {
      onOpenChange(false)
      router.push(item.href)
    },
    [onOpenChange, router]
  )

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      if (filtered.length === 0) return
      setSelectedIndex((i) => (i + 1) % filtered.length)
      return
    }
    if (e.key === "ArrowUp") {
      e.preventDefault()
      if (filtered.length === 0) return
      setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length)
      return
    }
    if (e.key === "Enter") {
      e.preventDefault()
      const item = filtered[selectedIndex]
      if (item) navigateTo(item)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "p-0 gap-0 overflow-hidden shadow-2xl border",
          isConsole ? "rounded-xl" : "border-gray-200"
        )}
        style={
          isConsole
            ? {
                background: TOKENS.surfaceHigh,
                borderColor: TOKENS.outlineGhost,
              }
            : undefined
        }
        data-command-palette
      >
        <DialogHeader className="sr-only">
          <DialogTitle id="command-palette-title">Search pages</DialogTitle>
          <DialogDescription>
            Type to filter dashboard pages. Use arrow keys and Enter to open.
          </DialogDescription>
        </DialogHeader>

        <div
          className={cn(
            "flex items-center gap-2 border-b px-3 py-2.5 sm:px-4",
            isConsole ? "" : "border-gray-100 bg-white"
          )}
          style={
            isConsole
              ? { borderColor: TOKENS.outlineGhost, background: TOKENS.surface }
              : undefined
          }
        >
          <Search
            className="h-4 w-4 shrink-0 opacity-60"
            style={isConsole ? { color: TOKENS.onSurfaceMuted } : undefined}
            aria-hidden
          />
          <input
            ref={inputRef}
            type="search"
            role="combobox"
            aria-expanded
            aria-controls="command-palette-list"
            aria-activedescendant={
              filtered[selectedIndex]
                ? `command-palette-option-${filtered[selectedIndex].id}`
                : undefined
            }
            aria-autocomplete="list"
            data-command-palette-input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="Search pages…"
            className={cn(
              "min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:opacity-50",
              isConsole ? "" : "text-gray-900 placeholder:text-gray-400"
            )}
            style={
              isConsole
                ? { color: TOKENS.onSurface, caretColor: TOKENS.primary }
                : undefined
            }
          />
        </div>

        <ul
          ref={listRef}
          id="command-palette-list"
          role="listbox"
          aria-label="Pages"
          className="scrollbar-none max-h-[min(60vh,420px)] overflow-y-auto py-1"
          style={
            isConsole ? { background: TOKENS.surfaceHigh } : undefined
          }
        >
          {filtered.length === 0 ? (
            <li
              className={cn(
                "px-4 py-8 text-center text-sm",
                isConsole ? "" : "text-gray-500"
              )}
              style={isConsole ? { color: TOKENS.onSurfaceMuted } : undefined}
            >
              No pages match your search.
            </li>
          ) : (
            filtered.map((item, index) => {
              const selected = index === selectedIndex
              return (
                <li key={item.id} role="presentation" data-index={index}>
                  <button
                    type="button"
                    role="option"
                    id={`command-palette-option-${item.id}`}
                    aria-selected={selected}
                    data-index={index}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition-colors sm:px-4",
                      isConsole ? "" : "text-gray-900",
                      !isConsole && selected && "bg-indigo-50",
                      !isConsole && !selected && "hover:bg-gray-50"
                    )}
                    style={
                      isConsole
                        ? {
                            background: selected
                              ? `color-mix(in srgb, ${TOKENS.primary} 18%, transparent)`
                              : undefined,
                            color: TOKENS.onSurface,
                          }
                        : undefined
                    }
                    onMouseEnter={() => setSelectedIndex(index)}
                    onClick={() => navigateTo(item)}
                  >
                    <span className="min-w-0 font-medium">{item.title}</span>
                    <span
                      className={cn(
                        "shrink-0 text-[11px] uppercase tracking-wide",
                        isConsole ? "" : "text-gray-400"
                      )}
                      style={
                        isConsole ? { color: TOKENS.onSurfaceMuted } : undefined
                      }
                    >
                      {item.group}
                    </span>
                  </button>
                </li>
              )
            })
          )}
        </ul>

        <div
          className={cn(
            "flex flex-wrap items-center gap-x-3 gap-y-1 border-t px-3 py-2 text-[11px] sm:px-4",
            isConsole ? "" : "border-gray-100 bg-gray-50/80 text-gray-500"
          )}
          style={
            isConsole
              ? {
                  borderColor: TOKENS.outlineGhost,
                  background: `color-mix(in srgb, ${TOKENS.surface} 88%, transparent)`,
                  color: TOKENS.onSurfaceMuted,
                }
              : undefined
          }
        >
          <span>
            <kbd className="rounded border px-1 py-px font-mono text-[10px] opacity-90">
              ↑↓
            </kbd>{" "}
            navigate
          </span>
          <span>
            <kbd className="rounded border px-1 py-px font-mono text-[10px] opacity-90">
              ↵
            </kbd>{" "}
            open
          </span>
          <span>
            <kbd className="rounded border px-1 py-px font-mono text-[10px] opacity-90">
              esc
            </kbd>{" "}
            close
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
