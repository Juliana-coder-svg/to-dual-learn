import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Пустое состояние: что здесь будет и что сделать, чтобы оно появилось. Действие внутри, а не где-то рядом. */
export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("empty-state", className)}>
      <p className="type-heading">{title}</p>
      {description ? <p className="max-w-md text-sm text-ink-soft">{description}</p> : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
