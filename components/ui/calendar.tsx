"use client"

import * as React from "react"
import { DayPicker, type DropdownProps } from "react-day-picker"
import { cn } from "@/lib/utils"
import { AppSelect, type AppSelectOption } from "@/components/ui/app-select"
import "react-day-picker/style.css"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

/** Themed replacement for react-day-picker's native `<select>` month/year dropdowns. */
function CalendarDropdown({
  options,
  value,
  onChange,
  disabled,
  "aria-label": ariaLabel,
}: DropdownProps) {
  const selectOptions: AppSelectOption[] = (options ?? []).map((opt) => ({
    value: String(opt.value),
    label: opt.label,
    disabled: opt.disabled,
  }))

  return (
    <AppSelect
      value={String(value ?? "")}
      onValueChange={(next) => {
        onChange?.({ target: { value: next } } as React.ChangeEvent<HTMLSelectElement>)
      }}
      options={selectOptions}
      disabled={disabled}
      aria-label={ariaLabel}
      triggerClassName="calendar-dropdown-trigger h-auto w-auto shrink gap-1 rounded-md border border-[rgba(218,226,253,0.15)] bg-[rgba(218,226,253,0.07)] px-2 py-0.5 text-xs font-semibold text-[#dae2fd] hover:bg-[rgba(218,226,253,0.12)]"
      contentClassName="w-auto min-w-[6rem]"
      itemClassName="py-1.5 text-xs"
    />
  )
}

function Calendar({ className, components, ...props }: CalendarProps) {
  return (
    <DayPicker
      className={cn("p-2", className)}
      components={{ Dropdown: CalendarDropdown, ...components }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
