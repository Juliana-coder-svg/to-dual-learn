import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

/**
 * Плашка статуса: пилюля, 22 px. default — светло-оранжевая подложка и тёмно-оранжевый текст, как «.soon» опроса (опубликовано, балл, «сегодня»),
 * secondary — серая заливка (черновик, пройдено), outline — рамка (справочное: «не проверен», «завтра»),
 * soft — светло-оранжевая подложка с тёмным текстом (отметки, которые не должны кричать).
 */
const badgeVariants = cva(
  "group/badge inline-flex h-[22px] w-fit shrink-0 items-center justify-center gap-1 rounded-full border border-transparent px-2.5 text-xs font-medium whitespace-nowrap tabular-nums transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary-soft text-primary-strong [a]:hover:bg-[color-mix(in_oklch,var(--primary-soft),var(--primary)_12%)]",
        secondary: "bg-secondary text-secondary-foreground [a]:hover:bg-muted",
        soft: "bg-primary-soft text-primary-strong",
        destructive: "bg-destructive/10 text-destructive",
        outline: "border-border text-muted-foreground [a]:hover:bg-muted",
        ghost: "hover:bg-muted",
        link: "text-primary-strong underline-offset-4 hover:underline",
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
