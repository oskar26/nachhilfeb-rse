import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2Icon } from "lucide-react"
import { cn } from "@/lib/utils"
import { triggerHaptic, type HapticStyle } from "@/lib/haptics"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-full border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out outline-none select-none active:not-aria-[haspopup]:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-soft hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-card",
        primary:
          "bg-primary text-primary-foreground shadow-soft hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-card",
        outline:
          "border-border bg-card text-foreground shadow-soft hover:-translate-y-0.5 hover:border-border hover:bg-muted hover:text-foreground hover:shadow-card aria-expanded:bg-muted aria-expanded:text-foreground dark:border-border dark:bg-card dark:hover:bg-muted",
        secondary:
          "bg-muted text-secondary-foreground hover:-translate-y-0.5 hover:bg-secondary aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/70",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/15 dark:bg-destructive/20 dark:hover:bg-destructive/30",
        link: "text-foreground underline underline-offset-4 hover:text-muted-foreground",
        unstyled:
          "rounded-none border-0 bg-transparent p-0 font-[inherit] font-normal leading-[inherit] text-inherit whitespace-normal shadow-none hover:bg-transparent hover:opacity-90 active:translate-y-0 active:scale-100",
      },
      size: {
        default:
          "h-12 gap-2 px-6 has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5",
        xs: "h-8 gap-1 rounded-full px-2.5 text-xs in-data-[slot=button-group]:rounded-full has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-12 gap-1.5 rounded-full px-4 text-sm in-data-[slot=button-group]:rounded-full has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3 [&_svg:not([class*='size-'])]:size-4",
        md: "h-12 gap-2 px-6 has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5",
        lg: "h-14 gap-2.5 px-8 has-data-[icon=inline-end]:pr-7 has-data-[icon=inline-start]:pl-7",
        unstyled: "",
        icon: "size-12 rounded-full",
        "icon-xs": "size-8 rounded-full in-data-[slot=button-group]:rounded-full [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-10 rounded-full in-data-[slot=button-group]:rounded-full",
        "icon-lg": "size-12 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

type ButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    isLoading?: boolean
    hapticStyle?: HapticStyle | false
  }

function Button({
  className,
  variant = "default",
  size = "default",
  isLoading = false,
  hapticStyle,
  onClick,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || isLoading

  const handleClick: NonNullable<ButtonPrimitive.Props["onClick"]> = (event) => {
    if (isDisabled) return
    if (hapticStyle !== false) {
      triggerHaptic(hapticStyle ?? (variant === "default" || variant === "primary" || variant === "destructive" ? "medium" : "light"))
    }
    onClick?.(event)
  }

  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={isDisabled}
      onClick={handleClick}
      {...props}
    >
      {isLoading ? <Loader2Icon className="size-4 animate-spin" aria-hidden="true" /> : null}
      {children}
    </ButtonPrimitive>
  )
}

export { Button, buttonVariants }
