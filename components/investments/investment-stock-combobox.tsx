"use client"

import { useCallback, useId, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { AppSelect } from "@/components/ui/app-select"
import { cn } from "@/lib/utils"
import { TOKENS } from "@/lib/wealth-console-tokens"
import {
  investmentConsoleField,
  investmentFieldAria,
  InvestmentFieldInlineError,
  investmentFieldLabelClass,
} from "@/components/investments/investment-console-ui"
import { consoleFocus } from "@/components/wealth-console/console-ui"

type StockResult = { symbol: string; name: string }

type InvestmentStockComboboxProps = {
  containerRef: React.RefObject<HTMLDivElement | null>
  investmentMarket: "all" | "AU"
  onMarketChange: (market: "all" | "AU") => void
  searchQuery: string
  displayName: string
  onQueryChange: (query: string, name: string) => void
  results: StockResult[]
  loading: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (symbol: string) => void
  fieldError?: string
}

export function InvestmentStockCombobox({
  containerRef,
  investmentMarket,
  onMarketChange,
  searchQuery,
  displayName,
  onQueryChange,
  results,
  loading,
  open,
  onOpenChange,
  onSelect,
  fieldError,
}: InvestmentStockComboboxProps) {
  const inputId = useId()
  const listboxId = useId()
  const marketId = useId()
  const [activeIndex, setActiveIndex] = useState(-1)
  const optionRefs = useRef<Array<HTMLLIElement | null>>([])

  const value = searchQuery || displayName
  const showList = open && (loading || results.length > 0 || searchQuery.trim().length > 0)

  const selectAt = useCallback(
    (index: number) => {
      const item = results[index]
      if (!item) return
      onSelect(item.symbol)
      onOpenChange(false)
      setActiveIndex(-1)
    },
    [results, onSelect, onOpenChange],
  )

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showList && event.key !== "Escape") return

    switch (event.key) {
      case "ArrowDown": {
        event.preventDefault()
        if (results.length === 0) return
        const next = activeIndex < results.length - 1 ? activeIndex + 1 : 0
        setActiveIndex(next)
        optionRefs.current[next]?.scrollIntoView({ block: "nearest" })
        break
      }
      case "ArrowUp": {
        event.preventDefault()
        if (results.length === 0) return
        const next = activeIndex > 0 ? activeIndex - 1 : results.length - 1
        setActiveIndex(next)
        optionRefs.current[next]?.scrollIntoView({ block: "nearest" })
        break
      }
      case "Enter": {
        if (activeIndex >= 0 && results[activeIndex]) {
          event.preventDefault()
          selectAt(activeIndex)
        }
        break
      }
      case "Home": {
        event.preventDefault()
        if (results.length === 0) return
        setActiveIndex(0)
        optionRefs.current[0]?.scrollIntoView({ block: "nearest" })
        break
      }
      case "End": {
        event.preventDefault()
        if (results.length === 0) return
        const last = results.length - 1
        setActiveIndex(last)
        optionRefs.current[last]?.scrollIntoView({ block: "nearest" })
        break
      }
      case "Escape":
        event.preventDefault()
        onOpenChange(false)
        setActiveIndex(-1)
        break
      default:
        break
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="mb-1 flex items-center justify-between gap-2">
        <label
          htmlFor={inputId}
          className={investmentFieldLabelClass}
          style={{ color: TOKENS.onSurfaceMuted }}
        >
          Ticker / name *
        </label>
        <label htmlFor={marketId} className="sr-only">
          Market filter
        </label>
        <AppSelect
          id={marketId}
          value={investmentMarket}
          onValueChange={(v) => {
            onMarketChange(v as "all" | "AU")
            onOpenChange(false)
            setActiveIndex(-1)
          }}
          variant="console"
          className="!h-auto min-h-11 w-auto shrink-0 rounded border px-2 py-2 text-[10px] font-semibold uppercase tracking-wide"
          style={{
            borderColor: TOKENS.outlineGhost,
            background: TOKENS.surfaceLow,
            color: TOKENS.onSurfaceMuted,
          }}
          options={[
            { value: "all", label: "All markets" },
            { value: "AU", label: "Australia (ASX)" },
          ]}
        />
      </div>
      <Input
        id={inputId}
        value={value}
        onChange={(e) => {
          const v = e.target.value
          onQueryChange(v, v)
          onOpenChange(!!v.trim())
          setActiveIndex(-1)
        }}
        onFocus={() => searchQuery.trim() && onOpenChange(true)}
        onKeyDown={handleKeyDown}
        placeholder={investmentMarket === "AU" ? "e.g. BHP, CBA" : "e.g. AAPL, TSLA"}
        className={cn(investmentConsoleField, "mt-0 border-transparent")}
        style={{
          backgroundColor: TOKENS.surfaceLow,
          borderColor: TOKENS.outlineGhost,
          color: TOKENS.onSurface,
        }}
        autoComplete="off"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={showList}
        aria-controls={showList ? listboxId : undefined}
        aria-activedescendant={
          activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
        }
        aria-autocomplete="list"
        {...investmentFieldAria(inputId, fieldError)}
      />
      <InvestmentFieldInlineError controlId={inputId} message={fieldError} />
      {loading ? (
        <div
          className="absolute right-3 top-10 text-[10px] font-semibold"
          style={{ color: TOKENS.onSurfaceMuted }}
        >
          Searching…
        </div>
      ) : null}
      {showList && results.length > 0 ? (
        <ul
          id={listboxId}
          className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-xl border py-1"
          style={{
            borderColor: TOKENS.outlineGhost,
            background: TOKENS.surfaceContainer,
            boxShadow: "0 20px 30px rgba(0,0,0,0.35)",
          }}
          role="listbox"
        >
          {results.map((item, index) => {
            const active = index === activeIndex
            return (
              <li
                key={item.symbol}
                id={`${listboxId}-option-${index}`}
                ref={(el) => {
                  optionRefs.current[index] = el
                }}
                role="option"
                aria-selected={active}
                tabIndex={-1}
                className={cn(
                  "cursor-pointer px-3 py-2 text-sm transition-colors",
                  consoleFocus,
                )}
                style={{
                  color: TOKENS.onSurface,
                  background: active ? TOKENS.surfaceHigh : undefined,
                }}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(e) => {
                  e.preventDefault()
                  selectAt(index)
                }}
              >
                <span className="font-semibold">{item.symbol}</span>
                {item.name && item.name !== item.symbol ? (
                  <span className="ml-2 text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
                    {item.name}
                  </span>
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : null}
      {showList && !loading && searchQuery.trim() && results.length === 0 ? (
        <div
          className="absolute z-30 mt-1 w-full rounded-xl border px-3 py-2 text-xs"
          style={{
            borderColor: TOKENS.outlineGhost,
            background: TOKENS.surfaceContainer,
            color: TOKENS.onSurfaceMuted,
          }}
          role="status"
        >
          No symbols found. You can still use what you typed.
        </div>
      ) : null}
    </div>
  )
}
