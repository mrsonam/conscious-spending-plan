"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type ClassicPaginationBarProps = {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  className?: string
}

export function ClassicPaginationBar({
  page,
  pageSize,
  total,
  onPageChange,
  className,
}: ClassicPaginationBarProps) {
  if (total <= 0) return null

  const maxPage = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(Math.max(1, page), maxPage)
  const pageStart = total === 0 ? 0 : (safePage - 1) * pageSize + 1
  const pageEnd = Math.min(total, safePage * pageSize)

  return (
    <div
      className={cn(
        "mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 pt-4",
        className,
      )}
    >
      <p className="text-sm text-gray-500">
        Showing {pageStart}–{pageEnd} of {total}
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={safePage <= 1}
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          aria-label="Previous page"
          className="h-9 w-9 shrink-0 border border-gray-200 bg-white shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 hover:shadow-md active:scale-[0.97] disabled:hover:border-gray-200 disabled:hover:bg-white disabled:hover:shadow-sm"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={safePage >= maxPage}
          onClick={() => onPageChange(Math.min(maxPage, safePage + 1))}
          aria-label="Next page"
          className="h-9 w-9 shrink-0 border border-gray-200 bg-white shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 hover:shadow-md active:scale-[0.97] disabled:hover:border-gray-200 disabled:hover:bg-white disabled:hover:shadow-sm"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
