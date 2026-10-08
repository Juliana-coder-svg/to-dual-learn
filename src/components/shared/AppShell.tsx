import Link from "next/link";
import { redirect } from "next/navigation";
import type { User } from "@/lib/db/queries";
import { logout, switchRole } from "@/lib/actions/auth";
import { currentUserConsented } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/shared/Brand";
import { NavLinks, type NavItem } from "@/components/shared/NavLinks";

const TEACHER_NAV: NavItem[] = [{ href: "/teach", label: "Мои курсы" }];

const STUDENT_NAV: NavItem[] = [
  { href: "/learn", label: "Учиться", exact: true },
  { href: "/learn/review", label: "Повторение" },
  { href: "/learn/history", label: "Мои ответы" },
];

/** Каркас страниц с сессией. Без действующего согласия на обработку данных (старая сессия,
 *  новая версия документов) уводит на /consent; requireConsent={false} только для «Моих данных»,
 *  где человек без согласия должен иметь возможность удалить аккаунт. */
export async function AppShell({
  user,
  requireConsent = true,
  width = "default",
  children,
}: {
  user: User;
  requireConsent?: boolean;
  /** narrow — тексты и формы (урок, история, настройки аккаунта); default — рабочие экраны с колонками. */
  width?: "default" | "narrow";
  children: React.ReactNode;
}) {
  if (requireConsent && !(await currentUserConsented())) redirect("/consent");
  const isTeacher = user.role === "teacher";
  const nav = isTeacher ? TEACHER_NAV : STUDENT_NAV;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4">
          <div className="flex min-w-0 items-center gap-5">
            <Brand href={isTeacher ? "/teach" : "/learn"} />
            <NavLinks items={nav} className="hidden sm:flex" />
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Link
              href="/account/data"
              className="hidden h-9 items-center rounded-lg px-3 text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground md:inline-flex"
              title={`${user.name} · ${user.email}`}
            >
              {user.name}
            </Link>
            <form action={switchRole}>
              <Button type="submit" variant="ghost" size="sm">
                {isTeacher ? "Режим студента" : "Режим преподавателя"}
              </Button>
            </form>
            <form action={logout}>
              <Button type="submit" variant="outline" size="sm">Выйти</Button>
            </form>
          </div>
        </div>
        <div className="border-t sm:hidden">
          <NavLinks items={nav} className="mx-auto w-full max-w-5xl overflow-x-auto px-3 py-1.5" />
        </div>
      </header>
      <main className={`mx-auto w-full flex-1 px-4 py-8 md:py-10 ${width === "narrow" ? "max-w-2xl" : "max-w-5xl"}`}>{children}</main>
      <footer className="border-t py-5 type-caption text-muted-foreground">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 px-4">
          <span className="font-medium text-foreground/70">To Dual Education</span>
          <Link href="/legal/privacy" className="hover:text-foreground">Политика</Link>
          <Link href="/legal/terms" className="hover:text-foreground">Соглашение</Link>
          <Link href="/legal/consent" className="hover:text-foreground">Согласие</Link>
          <Link href="/account/data" className="hover:text-foreground">Мои данные</Link>
        </div>
      </footer>
    </div>
  );
}
