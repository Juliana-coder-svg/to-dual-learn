import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { countDueFlashcards, latestSubmissionsForCourse, listCoursesForStudent, listLessons } from "@/lib/db/queries";
import { joinCourseAction } from "@/lib/actions/courses";
import { AppShell } from "@/components/shared/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { plural } from "@/lib/utils/format";

export default async function LearnPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const courses = listCoursesForStudent(user.id);
  const due = countDueFlashcards(user.id);

  return (
    <AppShell user={user}>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border p-4"><div className="text-xs text-muted-foreground">Streak</div><div className="mt-1 text-2xl font-semibold">{plural(user.streak, "день", "дня", "дней")}</div></div>
        <div className="rounded-md border p-4"><div className="text-xs text-muted-foreground">Очки</div><div className="mt-1 text-2xl font-semibold">{user.xp} XP</div></div>
        <Link href="/learn/review" className="rounded-md border p-4 transition-colors hover:border-primary">
          <div className="text-xs text-muted-foreground">Повторение</div>
          <div className="mt-1 text-2xl font-semibold">{due > 0 ? plural(due, "карточка", "карточки", "карточек") : "Пусто"}</div>
        </Link>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_340px]">
        <section>
          <h1 className="text-2xl font-semibold tracking-tight">Мои курсы</h1>
          {courses.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Пока нет курсов. Введи код от преподавателя справа.</p>
          ) : (
            <div className="mt-6 space-y-4">
              {courses.map((c) => {
                const lessons = listLessons(c.id, { publishedOnly: true });
                const done = latestSubmissionsForCourse(user.id, c.id);
                const completed = lessons.filter((l) => done.has(l.id)).length;
                const next = lessons.find((l) => !done.has(l.id));
                return (
                  <Card key={c.id}>
                    <CardHeader>
                      <CardTitle><Link href={`/learn/${c.id}`} className="hover:text-primary">{c.title}</Link></CardTitle>
                      <CardDescription>{c.description || "Без описания"}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3 text-sm">
                        <Progress value={lessons.length ? (completed / lessons.length) * 100 : 0} className="h-2" />
                        <span className="whitespace-nowrap text-muted-foreground">{completed}/{lessons.length}</span>
                      </div>
                      <div className="mt-4">
                        {next ? (
                          <Button nativeButton={false} render={<Link href={`/learn/${c.id}/lesson/${next.id}`} />} size="sm">Урок дня: {next.title}</Button>
                        ) : lessons.length === 0 ? (
                          <span className="text-sm text-muted-foreground">Преподаватель ещё не опубликовал уроки.</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">Все уроки пройдены. Загляни в повторение.</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
        <aside>
          <Card>
            <CardHeader>
              <CardTitle>Записаться на курс</CardTitle>
              <CardDescription>Код из шести символов даёт преподаватель.</CardDescription>
            </CardHeader>
            <CardContent>
              {sp.error ? <p className="mb-3 text-sm text-destructive">Курс с таким кодом не найден.</p> : null}
              <form action={joinCourseAction} className="flex gap-2">
                <Input name="code" required placeholder="ABC234" className="font-mono uppercase" maxLength={6} />
                <Button type="submit">Войти</Button>
              </form>
            </CardContent>
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}
