import { Switch as SwitchPrimitive } from "@base-ui/react/switch"
import { cn } from "@/lib/utils"

type SwitchProps = SwitchPrimitive.Root.Props & {
  size?: "sm" | "default"
  /** Migration compatibility: legacy Switch used onChange + label. */
  onChange?: () => void
  label?: string
}

function Switch({
  className,
  size = "default",
  onChange,
  label,
  onCheckedChange,
  ...props
}: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      aria-label={label}
      onCheckedChange={(checked, eventDetails) => {
        onChange?.()
        onCheckedChange?.(checked, eventDetails)
      }}
      className={cn(
        "peer group/switch relative inline-flex shrink-0 items-center rounded-full border-2 border-transparent shadow-sm transition-colors outline-none after:absolute after:-inset-x-3 after:-inset-y-2 hover:opacity-90 aria-invalid:border-destructive data-[size=default]:h-6 data-[size=default]:w-11 data-[size=sm]:h-4 data-[size=sm]:w-7 data-checked:border-transparent data-checked:bg-primary data-unchecked:border-input data-unchecked:bg-muted-foreground/35 data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block rounded-full bg-background shadow-sm ring-0 transition-transform group-data-[size=default]/switch:size-5 group-data-[size=sm]/switch:size-3 group-data-[size=default]/switch:data-checked:translate-x-5 group-data-[size=sm]/switch:data-checked:translate-x-3 dark:data-checked:bg-primary-foreground group-data-[size=default]/switch:data-unchecked:translate-x-0 group-data-[size=sm]/switch:data-unchecked:translate-x-0 dark:data-unchecked:bg-foreground"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
