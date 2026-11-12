import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap transition-colors has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 aria-invalid:border-destructive [&>svg]:pointer-events-none [&>svg]:size-3.5!",
  {
    variants: {
      variant: {
        default: "bg-muted text-foreground [a]:hover:bg-muted/80",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/10 text-destructive dark:bg-destructive/20 [a]:hover:bg-destructive/20",
        outline:
          "border-border bg-card text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        success:
          "bg-pastel-mint text-pastel-mint-foreground",
        info:
          "bg-pastel-blue text-pastel-blue-foreground",
        warning:
          "bg-pastel-yellow text-pastel-yellow-foreground",
        violet:
          "bg-pastel-violet text-pastel-violet-foreground",
        rose:
          "bg-pastel-rose text-pastel-rose-foreground",
        orange:
          "bg-pastel-orange text-pastel-orange-foreground",
        teal:
          "bg-pastel-teal text-pastel-teal-foreground",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-foreground underline underline-offset-4 hover:text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
