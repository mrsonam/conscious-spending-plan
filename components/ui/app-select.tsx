"use client"

import * as React from "react"
import { useEffect, useRef, useState } from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

/** Sentinel for Radix Select (cannot use "" as value reliably). */
export const APP_SELECT_EMPTY = "__csp_empty__"

export type AppSelectOption = { value: string; label: React.ReactNode }

function toInner(v: string) {
  return v === "" ? APP_SELECT_EMPTY : v
}

function toOuter(v: string) {
  return v === APP_SELECT_EMPTY ? "" : v
}

export interface AppSelectProps {
  id?: string
  name?: string
  value: string
  onValueChange: (value: string) => void
  options: AppSelectOption[]
  placeholder?: string
  className?: string
  triggerClassName?: string
  style?: React.CSSProperties
  disabled?: boolean
  required?: boolean
  "aria-labelledby"?: string
  "aria-invalid"?: boolean
  "aria-describedby"?: string
}

export function AppSelect({
  id,
  name,
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  className,
  triggerClassName,
  style,
  disabled,
  required,
  "aria-labelledby": ariaLabelledBy,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: AppSelectProps) {
  const inner = toInner(value)
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // Use a native capture-phase listener so it fires before any React stopPropagation
  // calls on parent elements (e.g. the custom Dialog sheet's onClick handler).
  useEffect(() => {
    if (!open) return

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (triggerRef.current?.contains(target)) return
      if (contentRef.current?.contains(target)) return
      setOpen(false)
    }

    document.addEventListener("pointerdown", handlePointerDown, { capture: true })
    return () => document.removeEventListener("pointerdown", handlePointerDown, { capture: true })
  }, [open])

  return (
    <SelectPrimitive.Root
      open={open}
      onOpenChange={setOpen}
      value={inner}
      onValueChange={(v) => onValueChange(toOuter(v))}
      disabled={disabled}
      name={name}
      modal={false}
    >
      <SelectPrimitive.Trigger
        ref={triggerRef}
        id={id}
        className={cn(
          "flex h-10 w-full shrink-0 items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-base font-medium tabular-nums outline-none transition-[box-shadow] [color-scheme:dark] sm:text-sm",
          "focus:outline-none focus:ring-2 focus:ring-[#4edea3]/45 focus-visible:ring-2 focus-visible:ring-[#4edea3]/45",
          "disabled:cursor-not-allowed disabled:opacity-50",
          triggerClassName,
          className,
        )}
        style={style}
        aria-required={required}
        aria-labelledby={ariaLabelledBy}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="app-select-chevron h-4 w-4 shrink-0 text-[#dae2fd] opacity-100" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          ref={contentRef}
          position="popper"
          sideOffset={4}
          className="z-[310] max-h-[min(320px,70dvh)] w-[var(--radix-select-trigger-width)] overflow-y-auto rounded-xl border border-[rgba(218,226,253,0.12)] bg-[#131b2e] py-1 text-[#dae2fd] shadow-lg"
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.map((opt) => (
              <SelectPrimitive.Item
                key={opt.value === "" ? APP_SELECT_EMPTY : opt.value}
                value={toInner(opt.value)}
                className="relative flex cursor-pointer select-none items-center rounded-md py-2 pl-8 pr-3 text-sm text-[#dae2fd] outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-white/10"
              >
                <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                  <SelectPrimitive.ItemIndicator>
                    <Check className="h-4 w-4 text-[#4edea3]" />
                  </SelectPrimitive.ItemIndicator>
                </span>
                <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
