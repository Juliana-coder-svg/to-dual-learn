"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "", label: "Материалы" },
  { href: "/lessons", label: "Уроки" },
  { href: "/generate", label: "Генерация" },
  { href: "/chat", label: "Чат" },
  { href: "/homework", label: "Проверка ДЗ" },
  { href: "/students", label: "Студенты" },
];

export function CourseTabs({ courseId }: { courseId: string }) {
  const pathname = usePathname();
  const base = `/teach/${courseId}`;
  return (
    <nav className="mt-6 flex gap-1 overflow-x-auto border-b">
      {TABS.map((t) => {
        const href = base + t.href;
        const active = t.href === "" ? pathname === base : pathname.startsWith(href);
        return (
          <Link
            key={t.href}
            href={href}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm",
              active ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
