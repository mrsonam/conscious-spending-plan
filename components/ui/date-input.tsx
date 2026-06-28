"use client"

import * as React from "react"
import { format, isValid, parseISO, startOfDay } from "date-fns"
import { Calendar as CalendarLucide, X } from "lucide-react"
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
  /** Earliest year shown in the year dropdown (default: current year − 10) */
  fromYear?: number
  /** Latest year shown in the year dropdown (default: current year + 5) */
  toYear?: number
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
      fromYear,
      toYear,
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false)
    const hiddenRef = React.useRef<HTMLInputElement | null>(null)

    React.useImperativeHandle(ref, () => hiddenRef.current as HTMLInputElement)

    const now = new Date()
    const yearFrom = fromYear ?? now.getFullYear() - 10
    const yearTo = toYear ?? now.getFullYear() + 5

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

    const handleToday = () => {
      const d = new Date()
      const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      emit(todayStr)
      setOpen(false)
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
    const hasValue = !!selectedDate && !disabled

    return (
      <div className={cn("relative w-full min-w-0", wrapperClassName)}>
        <input
          ref={hiddenRef}
          type="hidden"
          name={name}
          value={value ?? ""}
          readOnly
          disabled={disabled}
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
              aria-label={selectedDate ? `${display} — click to change` : "Pick a date"}
              onFocus={onFocus as React.FocusEventHandler<HTMLButtonElement>}
              onBlur={onBlur as React.FocusEventHandler<HTMLButtonElement>}
              style={style}
              className={cn(
                INPUT_CLASSNAME,
                "date-input-trigger relative text-left tabular-nums",
                hasValue ? "pr-16" : "pr-10",
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
              <CalendarLucide className="date-input-calendar-icon pointer-events-none absolute right-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 opacity-50 text-current" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className={cn("date-input-popover-content w-auto p-0 shadow-xl", popoverClassName)}
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
              captionLayout="dropdown"
              startMonth={new Date(yearFrom, 0)}
              endMonth={new Date(yearTo, 11)}
              initialFocus
            />
            <div className="flex items-center justify-between border-t border-black/10 px-3 py-2">
              <button
                type="button"
                onClick={handleToday}
                className="rounded px-1.5 py-1 text-xs font-semibold opacity-50 transition-opacity hover:opacity-100"
              >
                Today
              </button>
              {hasValue && (
                <button
                  type="button"
                  onClick={() => { emit(""); setOpen(false) }}
                  className="rounded px-1.5 py-1 text-xs opacity-40 transition-opacity hover:opacity-70"
                >
                  Clear
                </button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* × quick-clear — sits outside the trigger to avoid invalid button-in-button nesting */}
        {hasValue && (
          <button
            type="button"
            aria-label="Clear date"
            tabIndex={-1}
            onClick={(e) => { e.preventDefault(); emit("") }}
            className="date-input-clear absolute right-8 top-1/2 z-10 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full opacity-40 transition-opacity hover:opacity-90 text-current"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    )
  }
)
DateInput.displayName = "DateInput"

export { DateInput }
