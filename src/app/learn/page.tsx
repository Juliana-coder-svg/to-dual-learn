import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { countDueFlashcards, countLessonsStartedToday, latestSubmissionsForCourse, listCoursesForStudent, listLessons } from "@/lib/db/queries";
import { joinCourseAction } from "@/lib/actions/courses";
import { setDailyEmailAction } from "@/lib/actions/auth";
import { AppShell } from "@/components/shared/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { plural } from "@/lib/utils/format";

export default async function LearnPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const [courses, due] = await Promise.all([listCoursesForStudent(user.id), countDueFlashcards(user.id)]);
  const cards = await Promise.all(
    courses.map(async (c) => {
      const [lessons, done, startedToday] = await Promise.all([
        listLessons(c.id, { publishedOnly: true }),
        latestSubmissionsForCourse(user.id, c.id),
        c.owner_id !== user.id && c.daily_limit > 0 ? countLessonsStartedToday(user.id, c.id) : Promise.resolve(0),
      ]);
      const completed = lessons.filter((l) => done.has(l.id)).length;
      const next = lessons.find((l) => !done.has(l.id));
      const limitReached = c.owner_id !== user.id && c.daily_limit > 0 && startedToday >= c.daily_limit;
      return { course: c, lessons, completed, next, limitReached };
    }),
  );

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
              {cards.map(({ course: c, lessons, completed, next, limitReached }) => {
                return (
                  <Card key={c.id}>
                    <CardHeader>
                      <CardTitle><Link href={`/learn/${c.id}`} className="hover:text-primary">{c.title}</Link></CardTitle>
                      <CardDescription>{c.description || "Без описания"}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3 text-sm">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${lessons.length ? Math.round((completed / lessons.length) * 100) : 0}%` }} /></div>
                        <span className="whitespace-nowrap text-muted-foreground">{completed}/{lessons.length}</span>
                      </div>
                      <div className="mt-4">
                        {next && limitReached ? (
                          <span className="text-sm text-muted-foreground">Сегодня пройдено. Завтра: {next.title}</span>
                        ) : next ? (
                          <Button nativeButton={false} render={<Link href={`/learn/${c.id}/lesson/${next.id}`} />} size="sm">Урок дня: {next.title}</Button>
                        ) : lessons.length === 0 ? (
                          <span className="text-sm text-muted-foreground">Преподаватель еще не опубликовал уроки.</span>
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
              <CardDescription>Код из шести символов дает преподаватель.</CardDescription>
            </CardHeader>
            <CardContent>
              {sp.error ? <p className="mb-3 text-sm text-destructive">Курс с таким кодом не найден.</p> : null}
              <form action={joinCourseAction} className="flex gap-2">
                <Input name="code" required placeholder="ABC234" className="font-mono uppercase" maxLength={6} />
                <Button type="submit">Войти</Button>
              </form>
            </CardContent>
          </Card>
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Письмо с уроком дня</CardTitle>
              <CardDescription>Каждое утро на {user.email} приходит, какой урок ждет и сколько карточек пора повторить.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={setDailyEmailAction} className="flex items-center justify-between gap-3 text-sm">
                <span>{user.daily_email ? "Включено" : "Выключено"}</span>
                <input type="hidden" name="enabled" value={user.daily_email ? "0" : "1"} />
                <Button type="submit" variant="outline" size="sm">{user.daily_email ? "Выключить" : "Включить"}</Button>
              </form>
            </CardContent>
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}
