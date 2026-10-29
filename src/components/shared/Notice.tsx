import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Сообщение на странице. error — полоса слева красная, текст обычный (поле не виновато, кричать не нужно);
 * success — полоса акцентная; info — серая подложка без рамки (как подсказка в анкете) для служебных пометок (пробный режим, демо-версия).
 */
export function Notice({ kind = "info", children, className }: { kind?: "info" | "error" | "success"; children: ReactNode; className?: string }) {
  if (kind === "info") {
    return <p className={cn("rounded-lg bg-surface px-4 py-3 type-caption text-ink-soft", className)}>{children}</p>;
  }
  return (
    <p role={kind === "error" ? "alert" : "status"} className={cn("border-l-2 pl-4 text-[0.9375rem] leading-normal", kind === "error" ? "border-destructive text-destructive" : "border-primary", className)}>
      {children}
    </p>
  );
}
