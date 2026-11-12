import * as React from "react"
import { ChevronDownIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type NativeSelectProps = Omit<React.ComponentProps<"select">, "size"> & {
  size?: "sm" | "default"
  wrapperClassName?: string
}

function NativeSelect({
  className,
  wrapperClassName,
  size = "default",
  ...props
}: NativeSelectProps) {
  const fullWidth = typeof className === "string" && /(^|\s)w-full(\s|$)/.test(className)
  const flexible = typeof className === "string" && /(^|\s)flex-1(\s|$)/.test(className)

  return (
    <div
      className={cn(
        "group/native-select relative",
        flexible ? "flex-1" : fullWidth ? "w-full" : "w-fit",
        wrapperClassName
      )}
      data-slot="native-select-wrapper"
      data-size={size}
    >
      <select
        data-slot="native-select"
        data-size={size}
        className={cn(
          "h-12 w-full min-w-0 appearance-none rounded-field border border-input bg-card py-2 pl-4 text-sm transition-colors outline-none select-none placeholder:text-muted-foreground hover:border-muted-foreground/40 disabled:pointer-events-none disabled:cursor-not-allowed aria-invalid:border-destructive data-[size=sm]:h-10 data-[size=sm]:rounded-field data-[size=sm]:py-1 data-[size=sm]:text-sm",
          className,
          size === "sm" ? "pr-8" : "pr-9"
        )}
        {...props}
      />
      <ChevronDownIcon
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground select-none"
        aria-hidden="true"
        data-slot="native-select-icon"
      />
    </div>
  )
}

function NativeSelectOption({
  className,
  ...props
}: React.ComponentProps<"option">) {
  return (
    <option
      data-slot="native-select-option"
      className={cn("bg-background text-foreground", className)}
      {...props}
    />
  )
}

function NativeSelectOptGroup({
  className,
  ...props
}: React.ComponentProps<"optgroup">) {
  return (
    <optgroup
      data-slot="native-select-optgroup"
      className={cn("bg-background text-foreground", className)}
      {...props}
    />
  )
}

export { NativeSelect, NativeSelectOptGroup, NativeSelectOption }
