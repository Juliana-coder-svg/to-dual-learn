"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
  /** Подсвечивать только при точном совпадении пути (для корня раздела). */
  exact?: boolean;
  /** Пути, на которых пункт не подсвечивается, хотя они внутри его раздела (у «Мои курсы» это /teach/start). */
  except?: string[];
}

/** Ссылки разделов с подсветкой текущего. На десктопе в шапке, на телефоне строкой под ней. */
export function NavLinks({ items, className }: { items: NavItem[]; className?: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Разделы" className={cn("flex items-center gap-5 lg:gap-7", className)}>
      {items.map((item) => {
        const active = !item.except?.some((e) => pathname === e || pathname.startsWith(e + "/")) && (item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/"));
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 items-center rounded-lg text-[0.9375rem] whitespace-nowrap transition-colors",
              active ? "text-foreground underline decoration-1 underline-offset-[6px]" : "text-ink-soft hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
