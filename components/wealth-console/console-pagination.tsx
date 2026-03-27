"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { TOKENS } from "@/lib/wealth-console-tokens"

export type ConsolePaginationBarProps = {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  className?: string
}

export function ConsolePaginationBar({
  page,
  pageSize,
  total,
  onPageChange,
  className,
}: ConsolePaginationBarProps) {
  if (total <= 0) return null

  const maxPage = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(Math.max(1, page), maxPage)
  const pageStart = total === 0 ? 0 : (safePage - 1) * pageSize + 1
  const pageEnd = Math.min(total, safePage * pageSize)

  return (
    <div
      className={cn(
        "mt-6 flex flex-wrap items-center justify-between gap-4 border-t pt-4",
        className,
      )}
      style={{ borderColor: TOKENS.outlineGhost }}
    >
      <p
        className="text-[10px] font-semibold uppercase tracking-[0.2em]"
        style={{ color: TOKENS.onSurfaceMuted }}
      >
        Showing {pageStart}–{pageEnd} of {total}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          aria-label="Previous page"
          className={cn(
            "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-[color,background-color,border-color,transform,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4edea3]/40",
            safePage <= 1
              ? "cursor-not-allowed opacity-35"
              : "hover:bg-white/6 hover:shadow-[inset_0_1px_0_0_rgba(218,226,253,0.08)] active:scale-[0.97]",
          )}
          style={{
            borderColor: TOKENS.outlineGhost,
            color:
              safePage <= 1 ? TOKENS.onSurfaceMuted : TOKENS.onSurface,
          }}
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        </button>
        <button
          type="button"
          disabled={safePage >= maxPage}
          onClick={() => onPageChange(Math.min(maxPage, safePage + 1))}
          aria-label="Next page"
          className={cn(
            "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-[color,background-color,border-color,transform,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4edea3]/40",
            safePage >= maxPage
              ? "cursor-not-allowed opacity-35"
              : "hover:bg-white/6 hover:shadow-[inset_0_1px_0_0_rgba(218,226,253,0.08)] active:scale-[0.97]",
          )}
          style={{
            borderColor: TOKENS.outlineGhost,
            color:
              safePage >= maxPage ? TOKENS.onSurfaceMuted : TOKENS.onSurface,
          }}
        >
          <ChevronRight className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}
