import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Сообщение на странице. error — полоса слева красная, текст обычный (поле не виновато, кричать не нужно);
 * success — полоса акцентная; info — рамка пунктиром для служебных пометок (пробный режим, демо-версия).
 */
export function Notice({ kind = "info", children, className }: { kind?: "info" | "error" | "success"; children: ReactNode; className?: string }) {
  if (kind === "info") {
    return <p className={cn("rounded-lg border border-dashed px-3 py-2 type-caption text-muted-foreground", className)}>{children}</p>;
  }
  return (
    <p role={kind === "error" ? "alert" : "status"} className={cn("border-l-2 pl-3 text-sm", kind === "error" ? "border-destructive" : "border-primary", className)}>
      {children}
    </p>
  );
}
