"use client"

import type { MouseEvent } from "react"
import { cn } from "@/lib/utils"
import { TOKENS } from "@/lib/wealth-console-tokens"
import { consoleFocus } from "@/components/wealth-console/console-ui"

const JUMP_LINKS = [
  { href: "#console-overview", label: "Overview" },
  { href: "#console-quick-actions", label: "Quick actions" },
  { href: "#console-pulse", label: "Pulse" },
  { href: "#console-spending", label: "Spending" },
  { href: "#console-accounts", label: "Accounts" },
] as const

/** The dashboard shell scrolls inside `<main overflow-y-auto>`, not the window. */
function getScrollParent(node: HTMLElement): HTMLElement {
  let el = node.parentElement
  while (el) {
    const { overflowY } = getComputedStyle(el)
    if (
      (overflowY === "auto" || overflowY === "scroll") &&
      el.scrollHeight > el.clientHeight
    ) {
      return el
    }
    el = el.parentElement
  }
  return (document.scrollingElement as HTMLElement | null) ?? document.documentElement
}

/**
 * Native anchor scroll pins the target to scroll-margin-top from the
 * viewport top, which leaves a blank strip below short trailing sections
 * (e.g. Accounts, the last one, is shorter than the scroll container).
 * Clamp to the container's actual max scroll position instead.
 *
 * Deliberately does NOT touch `history` here: Next's App Router patches
 * pushState/replaceState to track its own navigation state, and calling
 * them directly desyncs it (compounding on repeated clicks).
 */
function handleJumpClick(e: MouseEvent<HTMLAnchorElement>, href: string) {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  const target = document.getElementById(href.slice(1))
  if (!target) return
  e.preventDefault()

  const container = getScrollParent(target)
  const scrollMarginTop =
    parseFloat(getComputedStyle(target).scrollMarginTop) || 0
  const desiredTop =
    container.scrollTop +
    (target.getBoundingClientRect().top - container.getBoundingClientRect().top) -
    scrollMarginTop
  const maxTop = container.scrollHeight - container.clientHeight
  const top = Math.max(0, Math.min(desiredTop, maxTop))

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches
  container.scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" })
}

/** Jump nav for the console's own scroll-mt-28 section anchors (page is long). */
export function ConsoleJumpNav({ className }: { className?: string }) {
  return (
    <nav
      aria-label="Jump to section"
      className={cn(
        "overflow-x-auto pb-0.5 scrollbar-none sm:overflow-visible",
        className,
      )}
    >
      <div className="flex min-w-max items-center gap-2 sm:min-w-0 sm:flex-wrap">
        {JUMP_LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            onClick={(e) => handleJumpClick(e, link.href)}
            className={cn(
              consoleFocus,
              "inline-flex min-h-9 shrink-0 items-center rounded-full border px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition-colors duration-200 hover:text-white motion-reduce:transition-none",
            )}
            style={{
              borderColor: TOKENS.outlineGhost,
              background: TOKENS.surfaceLow,
              color: TOKENS.onSurfaceMutedElevated,
            }}
          >
            {link.label}
          </a>
        ))}
      </div>
    </nav>
  )
}
