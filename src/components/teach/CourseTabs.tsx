"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "", label: "Материалы" },
  { href: "/lessons", label: "Уроки" },
  { href: "/generate", label: "Для занятий" },
  { href: "/chat", label: "Вопросы" },
  { href: "/homework", label: "Проверка работ" },
  { href: "/students", label: "Студенты" },
  { href: "/settings", label: "Настройки" },
];

/** Вкладки курса: подчёркивание акцентом, на телефоне прокручиваются в край экрана. Высота 44 px под палец. */
export function CourseTabs({ courseId, showSignals = false }: { courseId: string; showSignals?: boolean }) {
  const pathname = usePathname();
  const base = `/teach/${courseId}`;
  const activeRef = useRef<HTMLAnchorElement>(null);
  // Вкладки не помещаются на узком окне и прокручиваются: открытая вкладка не должна оставаться за краем.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [pathname]);
  return (
    <nav aria-label="Разделы курса" className="-mx-4 mt-6 overflow-x-auto border-b px-4 md:mx-0 md:px-0">
      <ul className="flex gap-0 lg:gap-1">
        {(showSignals ? [...TABS.slice(0, 5), { href: "/signals", label: "Сигналы" }, ...TABS.slice(5)] : TABS).map((t) => {
          const href = base + t.href;
          const active = t.href === "" ? pathname === base : pathname.startsWith(href);
          return (
            <li key={t.href}>
              <Link
                ref={active ? activeRef : undefined}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px inline-flex h-11 items-center whitespace-nowrap border-b-2 px-2.5 text-sm lg:px-3 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
                  active ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
                )}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
