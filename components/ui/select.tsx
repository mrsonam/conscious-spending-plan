import * as React from "react"
import { cn } from "@/lib/utils"

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        className={cn(
          "flex h-10 w-full rounded-md border-0 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    )
  }
)
Select.displayName = "Select"

export { Select }
