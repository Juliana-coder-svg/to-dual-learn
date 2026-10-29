import Link from "next/link";
import { redirect } from "next/navigation";
import type { User } from "@/lib/db/queries";
import { logout, switchRole } from "@/lib/actions/auth";
import { currentUserConsented } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/shared/Brand";
import { SiteFooter } from "@/components/shared/SiteFooter";
import { NavLinks, type NavItem } from "@/components/shared/NavLinks";

const TEACHER_NAV: NavItem[] = [
  { href: "/teach", label: "Мои курсы", except: ["/teach/start"] },
  { href: "/teach/start", label: "Как это работает" },
];

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
      <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur-md">
        <div className="container-x flex min-h-15 items-center justify-between gap-3 lg:min-h-17">
          <div className="flex min-w-0 items-center gap-5">
            <Brand href={isTeacher ? "/teach" : "/learn"} />
            <NavLinks items={nav} className="hidden md:flex" />
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Link
              href="/account/data"
              className="hidden min-h-11 max-w-40 items-center px-2 text-[0.9375rem] text-ink-soft hover:text-foreground lg:inline-flex"
              title={`${user.name} · ${user.email}`}
            >
              <span className="truncate">{user.name}</span>
            </Link>
            <form action={switchRole}>
              <Button type="submit" variant="ghost" size="sm" title={isTeacher ? "Открыть курсы как студент" : "Открыть кабинет преподавателя"}>
                <span className="lg:hidden">{isTeacher ? "Как студент" : "Как преподаватель"}</span>
                <span className="hidden lg:inline">{isTeacher ? "Режим студента" : "Режим преподавателя"}</span>
              </Button>
            </form>
            <form action={logout}>
              <Button type="submit" variant="outline" size="sm">Выйти</Button>
            </form>
          </div>
        </div>
        <div className="md:hidden">
          <NavLinks items={nav} className="container-x overflow-x-auto" />
        </div>
      </header>
      <main id="main" className={`mx-auto w-full flex-1 px-[clamp(1.125rem,4vw,3rem)] py-6 md:py-12 ${width === "narrow" ? "max-w-[calc(46rem+2*clamp(1.125rem,4vw,3rem))]" : "max-w-[77.5rem]"}`}>{children}</main>
      <SiteFooter signedIn />
    </div>
  );
}
