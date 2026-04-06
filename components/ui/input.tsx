import * as React from "react"
import { cn } from "@/lib/utils"

/** Shared by `Input` and `DateInput` so native date fields match text/number fields. */
export const INPUT_CLASSNAME =
  "box-border flex h-10 min-h-10 w-full rounded-md border-0 bg-gray-50 px-3 py-2 text-base file:border-0 file:bg-transparent file:text-base file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-0 focus-visible:bg-white disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm sm:file:text-sm"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(INPUT_CLASSNAME, className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
