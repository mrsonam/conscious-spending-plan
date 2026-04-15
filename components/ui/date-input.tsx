"use client"

import * as React from "react"
import { format, isValid, parseISO, startOfDay } from "date-fns"
import { Calendar as CalendarLucide } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { INPUT_CLASSNAME } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export interface DateInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "type" | "value" | "onChange"
  > {
  value?: string
  onChange?: React.ChangeEventHandler<HTMLInputElement>
  wrapperClassName?: string
  popoverClassName?: string
  popoverStyle?: React.CSSProperties
}

const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  (
    {
      className,
      wrapperClassName,
      id,
      name,
      value,
      onChange,
      disabled,
      required,
      min,
      max,
      onFocus,
      onBlur,
      style,
      popoverClassName,
      popoverStyle,
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false)
    const hiddenRef = React.useRef<HTMLInputElement | null>(null)

    React.useImperativeHandle(ref, () => hiddenRef.current as HTMLInputElement)

    const selectedDate = React.useMemo(() => {
      if (!value) return undefined
      const d = parseISO(value.includes("T") ? value : `${value}T12:00:00`)
      return isValid(d) ? d : undefined
    }, [value])

    const emit = (next: string) => {
      if (onChange) {
        onChange({
          target: { value: next },
          currentTarget: { value: next },
        } as React.ChangeEvent<HTMLInputElement>)
      }
    }

    const disabledDays = React.useMemo(() => {
      return (date: Date) => {
        if (min != null && min !== "") {
          const ms = String(min)
          const m = parseISO(ms.includes("T") ? ms : `${ms}T12:00:00`)
          if (isValid(m) && startOfDay(date) < startOfDay(m)) return true
        }
        if (max != null && max !== "") {
          const xs = String(max)
          const x = parseISO(xs.includes("T") ? xs : `${xs}T12:00:00`)
          if (isValid(x) && startOfDay(date) > startOfDay(x)) return true
        }
        return false
      }
    }, [min, max])

    const display = selectedDate ? format(selectedDate, "MMM d, yyyy") : ""

    return (
      <div className={cn("relative w-full min-w-0", wrapperClassName)}>
        <input
          ref={hiddenRef}
          type="hidden"
          name={name}
          value={value ?? ""}
          readOnly
          disabled={disabled}
          required={required}
          aria-hidden
          tabIndex={-1}
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              id={id}
              type="button"
              disabled={disabled}
              aria-required={required}
              aria-expanded={open}
              aria-haspopup="dialog"
              onFocus={onFocus as React.FocusEventHandler<HTMLButtonElement>}
              onBlur={onBlur as React.FocusEventHandler<HTMLButtonElement>}
              style={style}
              className={cn(
                INPUT_CLASSNAME,
                "date-input-trigger relative pr-10 text-left tabular-nums",
                disabled && "cursor-not-allowed opacity-50",
                className
              )}
            >
              <span
                className={cn(
                  "block min-w-0 flex-1 truncate",
                  !selectedDate && "text-gray-400 date-input-placeholder"
                )}
              >
                {selectedDate ? display : "Pick a date"}
              </span>
              <CalendarLucide className="date-input-calendar-icon pointer-events-none absolute right-2 top-1/2 z-2 h-4 w-4 -translate-y-1/2 opacity-70 text-current" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className={cn(
              "date-input-popover-content w-auto border-gray-200 p-0 shadow-lg",
              popoverClassName,
            )}
            style={popoverStyle}
            data-date-input-popover="true"
          >
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => {
                emit(d ? format(d, "yyyy-MM-dd") : "")
                setOpen(false)
              }}
              defaultMonth={selectedDate ?? new Date()}
              disabled={disabledDays}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    )
  }
)
DateInput.displayName = "DateInput"

export { DateInput }
