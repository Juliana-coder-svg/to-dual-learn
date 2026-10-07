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
          Из методички преподавателя — в&nbsp;курс по&nbsp;5&nbsp;минут в&nbsp;день
        </h1>
        <p className="mt-6 text-lg text-muted-foreground">
          Преподаватель загружает программу и материалы. Сервис собирает из них короткие уроки с задачами и разбирает ответы студентов.
          Студент проходит по одному уроку в день, получает разбор от наставника и возвращается к повторению через день, неделю и месяц.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <div className="rounded-lg border p-5">
            <div className="text-sm font-medium text-primary">Преподавателю</div>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>Материалы в PDF или текстом</li>
              <li>Уроки, задания, конспекты, планы занятий</li>
              <li>Ответы на вопросы по своим материалам</li>
              <li>Проверка домашних работ по критериям</li>
            </ul>
          </div>
          <div className="rounded-lg border p-5">
            <div className="text-sm font-medium text-primary">Студенту</div>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>Один урок в день, 5 минут</li>
              <li>Открытая задача и разбор ответа</li>
              <li>Серия дней и баллы</li>
              <li>Карточки для повторения</li>
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
