import * as React from "react"
import { cn } from "@/lib/utils"

export interface RadioGroupProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  options: { value: string; label: string }[]
  value: string
  onValueChange: (value: string) => void
}

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className, options, value, onValueChange, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("flex gap-4", className)} {...props}>
        {options.map((option) => (
          <label key={option.value} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              value={option.value}
              checked={value === option.value}
              onChange={() => onValueChange(option.value)}
              className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm">{option.label}</span>
          </label>
        ))}
      </div>
    )
  }
)
RadioGroup.displayName = "RadioGroup"

export { RadioGroup }
