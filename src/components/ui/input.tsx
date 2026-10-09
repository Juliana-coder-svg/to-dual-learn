import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "cn"

/** Поле ввода 36 px, в один ряд с кнопкой default. На телефоне 16 px текста, чтобы iOS не увеличивал страницу. */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-lg border border-input bg-background px-3 py-1 text-base transition-colors outline-none file:mr-3 file:inline-flex file:h-7 file:rounded-md file:border-0 file:bg-muted file:px-3 file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/80 hover:border-foreground/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
