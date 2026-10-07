import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, homeFor } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user));

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
          <span className="whitespace-nowrap text-base font-semibold tracking-tight"><span className="text-primary">To Dual</span> Learn</span>
          <Button nativeButton={false} render={<Link href="/login" />} size="sm">Войти</Button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16">
        <h1 className="text-4xl font-semibold leading-tight tracking-tight">
          Из методички преподавателя в&nbsp;курс по&nbsp;5&nbsp;минут в&nbsp;день
        </h1>
        <p className="mt-6 text-lg text-muted-foreground">
          Преподаватель загружает программу и материалы, модель собирает из них короткие уроки с задачами и проверяет ответы.
          Студент проходит по уроку в день и получает разбор своего ответа, а через день карточка возвращает его к теме.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <div className="rounded-lg border p-5">
            <div className="text-sm font-medium text-primary">Преподавателю</div>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>Материалы в PDF, TXT, MD</li>
              <li>Уроки и задания по своим материалам</li>
              <li>Чат по своим материалам</li>
              <li>Проверка домашек по критериям</li>
            </ul>
          </div>
          <div className="rounded-lg border p-5">
            <div className="text-sm font-medium text-primary">Студенту</div>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>Один урок в день, 5 минут</li>
              <li>Открытая задача и разбор ответа от ментора</li>
              <li>Streak и очки</li>
              <li>Флешкарты для повторения</li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex gap-3">
          <Button nativeButton={false} render={<Link href="/login?role=teacher" />} size="lg">Я преподаватель</Button>
          <Button nativeButton={false} render={<Link href="/login?role=student" />} size="lg" variant="outline">Я студент</Button>
        </div>
      </main>
    </div>
  );
}
