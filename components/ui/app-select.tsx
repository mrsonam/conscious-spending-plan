"use client"

import * as React from "react"
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
  variant?: "classic" | "console"
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
  variant = "classic",
  style,
  disabled,
  required,
  "aria-labelledby": ariaLabelledBy,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: AppSelectProps) {
  const inner = toInner(value)

  return (
    <SelectPrimitive.Root
      value={inner}
      onValueChange={(v) => onValueChange(toOuter(v))}
      disabled={disabled}
      required={required}
      name={name}
    >
      <SelectPrimitive.Trigger
        id={id}
        className={cn(
          "flex h-10 w-full shrink-0 items-center justify-between gap-2 rounded-md border-0 bg-gray-50 px-3 py-2 text-left text-base outline-none sm:text-sm",
          "focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-0",
          "disabled:cursor-not-allowed disabled:opacity-50",
          variant === "console" &&
            "rounded-xl border font-medium tabular-nums transition-[box-shadow] focus:outline-none focus:ring-2 focus:ring-[#4edea3]/45 [color-scheme:dark]",
          triggerClassName,
          className
        )}
        style={style}
        aria-required={required}
        aria-labelledby={ariaLabelledBy}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="app-select-chevron h-4 w-4 shrink-0 opacity-70" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        {/* z-[310]: above app Dialog (z 300–302); content is portaled to body */}
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          className={cn(
            "z-[310] max-h-[min(320px,70dvh)] w-[var(--radix-select-trigger-width)] overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 text-gray-900 shadow-lg",
            variant === "console" &&
              "border-[rgba(218,226,253,0.12)] bg-[#131b2e] text-[#dae2fd]"
          )}
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.map((opt) => (
              <SelectPrimitive.Item
                key={opt.value === "" ? APP_SELECT_EMPTY : opt.value}
                value={toInner(opt.value)}
                className={cn(
                  "relative flex cursor-pointer select-none items-center rounded-md py-2 pl-8 pr-3 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                  variant === "classic" &&
                    "text-gray-900 data-[highlighted]:bg-gray-100",
                  variant === "console" &&
                    "text-[#dae2fd] data-[highlighted]:bg-white/10"
                )}
              >
                <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                  <SelectPrimitive.ItemIndicator>
                    <Check
                      className={cn(
                        "h-4 w-4",
                        variant === "console" ? "text-[#4edea3]" : "text-indigo-600"
                      )}
                    />
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
