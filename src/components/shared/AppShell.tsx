import Link from "next/link";
import type { User } from "@/lib/db/queries";
import { logout, switchRole } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

export function AppShell({ user, children }: { user: User; children: React.ReactNode }) {
  const isTeacher = user.role === "teacher";
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href={isTeacher ? "/teach" : "/learn"} className="whitespace-nowrap text-base font-semibold tracking-tight">
              <span className="text-primary">To Dual</span> Learn
            </Link>
            <nav className="hidden gap-4 text-sm text-muted-foreground sm:flex">
              {isTeacher ? (
                <Link href="/teach" className="hover:text-foreground">Мои курсы</Link>
              ) : (
                <>
                  <Link href="/learn" className="hover:text-foreground">Учиться</Link>
                  <Link href="/learn/review" className="hover:text-foreground">Повторение</Link>
                  <Link href="/learn/history" className="hover:text-foreground">Мои ответы</Link>
                </>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="hidden text-muted-foreground sm:inline">{user.name}</span>
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
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap justify-center gap-x-4 gap-y-1 px-4">
          <span>To Dual Education</span>
          <Link href="/legal/privacy" className="hover:text-foreground">Политика</Link>
          <Link href="/legal/terms" className="hover:text-foreground">Соглашение</Link>
          <Link href="/legal/consent" className="hover:text-foreground">Согласие</Link>
        </div>
      </footer>
    </div>
  );
}
