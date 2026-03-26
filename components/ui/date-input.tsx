import * as React from "react"
import { Calendar } from "lucide-react"
import { cn } from "@/lib/utils"

export interface DateInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  wrapperClassName?: string
}

function openNativePicker(input: HTMLInputElement | null) {
  if (!input) return
  // Chromium supports showPicker(); other browsers will just focus.
  // We also click to trigger some native UIs.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyInput = input as any
  if (typeof anyInput.showPicker === "function") {
    anyInput.showPicker()
  } else {
    input.focus()
    input.click()
  }
}

const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ className, wrapperClassName, onMouseDown, onClick, ...props }, ref) => {
    const innerRef = React.useRef<HTMLInputElement | null>(null)

    React.useImperativeHandle(ref, () => innerRef.current as HTMLInputElement)

    return (
      <div
        className={cn("relative", wrapperClassName)}
        onMouseDown={(e) => {
          onMouseDown?.(e as any)
          // Allow clicking anywhere to open without selecting text first.
          // Prevent default so the click doesn't get "eaten" by focus changes.
          if (e.button === 0) e.preventDefault()
          openNativePicker(innerRef.current)
        }}
        onClick={(e) => {
          onClick?.(e as any)
        }}
      >
        <input
          ref={(node) => {
            innerRef.current = node
          }}
          type="date"
          className={cn("pr-10", className)}
          {...props}
        />
        <button
          type="button"
          aria-label="Open date picker"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
          onMouseDown={(e) => {
            e.preventDefault()
            openNativePicker(innerRef.current)
          }}
          tabIndex={-1}
        >
          <Calendar className="h-4 w-4 opacity-70" />
        </button>
      </div>
    )
  },
)
DateInput.displayName = "DateInput"

export { DateInput }

