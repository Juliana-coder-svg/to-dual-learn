import * as React from "react"
import { cn } from "cn"

/** Многострочное поле: растёт по содержимому, минимум 72 px. Та же рамка и фокус, что у Input. */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-18 w-full rounded-lg border border-input bg-background px-3 py-2 text-base leading-relaxed transition-colors outline-none placeholder:text-muted-foreground/80 hover:border-foreground/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
