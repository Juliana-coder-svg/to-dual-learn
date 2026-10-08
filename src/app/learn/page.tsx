import Link from "next/link";
import { requireUser, requireUserId } from "@/lib/auth/session";
import { countDueFlashcards, countLessonsStartedToday, latestScoresByCourse, listCoursesForStudentWithLessons } from "@/lib/db/queries";
import { joinCourseAction } from "@/lib/actions/courses";
import { setDailyEmailAction } from "@/lib/actions/auth";
import { AppShell } from "@/components/shared/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { plural } from "@/lib/utils/format";

export default async function LearnPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  // Четыре независимых запроса одним кругом до базы: профиль, курсы с уроками, карточки, баллы по всем курсам.
  const userId = await requireUserId();
  const [user, sp, enrolled, due, scores] = await Promise.all([
    requireUser(),
    searchParams,
    listCoursesForStudentWithLessons(userId),
    countDueFlashcards(userId),
    latestScoresByCourse(userId),
  ]);
  // Дневной лимит считает та же RPC, что и /api/evaluate, чтобы страница и проверка ответа не расходились.
  // Второй круг до базы только для курсов с лимитом, параллельно по курсам.
  const startedToday = await Promise.all(
    enrolled.map(({ course: c }) => (c.owner_id !== user.id && c.daily_limit > 0 ? countLessonsStartedToday(userId, c.id) : Promise.resolve(0))),
  );
  const courses = enrolled.map((e) => e.course);
  const cards = enrolled.map(({ course: c, lessons }, i) => {
    const done = scores.get(c.id) ?? new Map<string, number>();
    const completed = lessons.filter((l) => done.has(l.id)).length;
    const next = lessons.find((l) => !done.has(l.id));
    const limitReached = c.owner_id !== user.id && c.daily_limit > 0 && startedToday[i] >= c.daily_limit;
    return { course: c, lessons, completed, next, limitReached };
  });

  return (
    <AppShell user={user}>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border p-4"><div className="text-xs text-muted-foreground">Дней подряд</div><div className="mt-1 text-2xl font-semibold">{plural(user.streak, "день", "дня", "дней")}</div></div>
        <div className="rounded-md border p-4"><div className="text-xs text-muted-foreground">Баллы</div><div className="mt-1 text-2xl font-semibold">{user.xp}</div></div>
        <Link href="/learn/review" className="rounded-md border p-4 transition-colors hover:border-primary">
          <div className="text-xs text-muted-foreground">Повторение</div>
          <div className="mt-1 text-2xl font-semibold">{due > 0 ? plural(due, "карточка", "карточки", "карточек") : "Пусто"}</div>
        </Link>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_340px]">
        <section>
          <h1 className="text-2xl font-semibold tracking-tight">Мои курсы</h1>
          {courses.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Пока нет курсов. Введите код от преподавателя справа.</p>
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
                          <span className="text-sm text-muted-foreground">Преподаватель ещё не опубликовал уроки.</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">Все уроки пройдены. Загляните в повторение.</span>
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
                <Button type="submit">Записаться</Button>
              </form>
            </CardContent>
          </Card>
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Письмо с уроком дня</CardTitle>
              <CardDescription>Каждое утро на {user.email}: какой урок ждёт и сколько карточек пора повторить.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={setDailyEmailAction} className="flex items-center justify-between gap-3 text-sm">
                <span>{user.daily_email ? "Включено" : "Выключено"}</span>
                <input type="hidden" name="enabled" value={user.daily_email ? "0" : "1"} />
                <Button type="submit" variant="outline" size="sm">{user.daily_email ? "Выключить" : "Включить"}</Button>
              </form>
            </CardContent>
          </Card>
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Мои данные</CardTitle>
              <CardDescription>Скачать всё, что мы храним о вас, или удалить аккаунт.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button nativeButton={false} render={<Link href="/account/data" />} variant="outline" size="sm">Открыть</Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}
