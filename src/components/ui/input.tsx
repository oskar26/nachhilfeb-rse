import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "@/lib/utils"
import { triggerHaptic } from "@/lib/haptics"

type InputProps = React.ComponentProps<"input"> & {
  haptic?: boolean
}

function Input({ className, type, haptic = true, onFocus, ...props }: InputProps) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-12 w-full min-w-0 rounded-field border border-input bg-card px-4 py-2 text-sm transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/80 hover:border-muted-foreground/40 disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-border disabled:bg-muted disabled:text-foreground disabled:opacity-100 aria-invalid:border-destructive",
        className
      )}
      onFocus={(event) => {
        if (haptic) triggerHaptic("light")
        onFocus?.(event)
      }}
      {...props}
    />
  )
}

export { Input }
