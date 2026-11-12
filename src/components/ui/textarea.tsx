import * as React from "react"
import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-field border border-input bg-card px-4 py-3 text-sm transition-colors outline-none placeholder:text-muted-foreground/80 hover:border-muted-foreground/40 disabled:cursor-not-allowed disabled:bg-muted disabled:text-foreground disabled:opacity-100 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
