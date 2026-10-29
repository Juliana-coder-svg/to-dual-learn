import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

/**
 * Кнопки в стиле опроса: пилюли, текст 500. Размеры: default 44 px (формы и действия в карточках, цель нажатия
 * не меньше 44), sm 44 px с меньшим кеглем (действия в строках и шапке), lg 52 px (главный шаг экрана, как «Далее» в анкете).
 * Основная — графитовая (default). Оранжевая заливка (accent) одна на экран: главный вход, как «Пройти опрос»;
 * текст на ней графитовый, белый не проходит AA. Остальные outline или ghost. Красная только для необратимого.
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-full border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-foreground text-background hover:bg-black",
        accent: "bg-primary text-primary-foreground hover:bg-primary-strong hover:text-white",
        outline:
          "border-border bg-background text-foreground hover:border-foreground aria-expanded:bg-muted",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-accent aria-expanded:bg-secondary",
        ghost:
          "text-foreground hover:bg-muted aria-expanded:bg-muted",
        destructive:
          "bg-destructive text-white hover:bg-[color-mix(in_oklch,var(--destructive),black_12%)] focus-visible:ring-destructive/30",
        link: "h-auto rounded-none px-0 text-foreground underline underline-offset-[3px] hover:text-primary-strong",
        /** Графитовая кнопка на светлой акцентной плашке (.accent-panel): главное действие внутри фирменного блока. */
        inverse: "bg-foreground text-background hover:bg-black",
        /** Белая кнопка с рамкой на акцентной плашке: второе действие рядом с inverse. */
        "inverse-outline": "border-border bg-background text-foreground hover:border-foreground",
      },
      size: {
        default: "h-11 gap-2 px-5 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        xs: "h-7 gap-1 px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-11 gap-1.5 px-4 text-[0.8125rem] has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-13 gap-2 px-6 text-[1.0625rem] has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5",
        icon: "size-11",
        "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-9",
        "icon-lg": "size-13",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
