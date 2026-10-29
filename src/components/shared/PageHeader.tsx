import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Шапка страницы: ссылка назад или подпись сверху, заголовок, абзац-пояснение, действия справа.
 * Одна на все экраны: так заголовки одинакового веса, а действия всегда в одном месте.
 */
export function PageHeader({
  back,
  eyebrow,
  title,
  description,
  actions,
  size = "default",
  className,
}: {
  back?: { href: string; label: string };
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  size?: "default" | "lg";
  className?: string;
}) {
  return (
    <header className={cn("flex flex-wrap items-end justify-between gap-x-6 gap-y-4", className)}>
      <div className="min-w-0 max-w-3xl">
        {back ? (
          <Link href={back.href} className="inline-flex min-h-11 items-center gap-1 text-[0.9375rem] text-ink-soft hover:text-foreground">
            <span aria-hidden>←</span> {back.label}
          </Link>
        ) : null}
        {eyebrow ? <div className={cn("eyebrow", back ? "mt-3" : "")}>{eyebrow}</div> : null}
        <h1 className={cn("text-balance", size === "lg" ? "type-title" : "type-page", back || eyebrow ? "mt-2" : "")}>{title}</h1>
        {description ? <p className="mt-3 max-w-prose type-body text-ink-soft">{description}</p> : null}
      </div>
      {/* Без shrink-0: на телефоне блок действий должен переноситься, а не вылезать за экран. */}
      {actions ? <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

/** Заголовок раздела внутри страницы. */
export function SectionHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-x-6 gap-y-3", className)}>
      <div className="min-w-0 max-w-2xl">
        <h2 className="type-heading">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-relaxed text-ink-soft">{description}</p> : null}
      </div>
      {actions ? <div className="flex min-w-0 max-w-full shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
