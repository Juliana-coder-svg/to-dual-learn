import Link from "next/link";
import { requireUser, requireUserId } from "@/lib/auth/session";
import { countDueFlashcards, countLessonsStartedToday, latestScoresByCourse, listCoursesForStudentWithLessons } from "@/lib/db/queries";
import { joinCourseAction } from "@/lib/actions/courses";
import { setDailyEmailAction } from "@/lib/actions/auth";
import { AppShell } from "@/components/shared/AppShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Notice } from "@/components/shared/Notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { plural } from "@/lib/utils/format";

/** Плитка показателя: подпись сверху, число крупно. Ссылка, когда за числом стоит действие. */
function Stat({ label, value, hint, href, accent }: { label: string; value: string; hint?: string; href?: string; accent?: boolean }) {
  const body = (
    <>
      <div className="type-caption text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tracking-tight tabular-nums ${accent ? "text-primary-strong" : ""}`}>{value}</div>
      {hint ? <div className="mt-1 type-caption text-muted-foreground">{hint}</div> : null}
    </>
  );
  const cls = "block rounded-lg border p-4";
  return href ? <Link href={href} className={`${cls} transition-colors hover:border-foreground/40 focus-visible:ring-3 focus-visible:ring-ring/40`}>{body}</Link> : <div className={cls}>{body}</div>;
}

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
      <PageHeader title={`Привет, ${user.name}`} description="Один урок в день и карточки на повторение. Пять минут, и свободны." />

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <Stat label="Дней подряд" value={String(user.streak)} hint={plural(user.streak, "день", "дня", "дней").replace(/^\d+\s/, "") === "" ? undefined : user.streak > 0 ? "не прерывайте серию" : "начните сегодня"} />
        <Stat label="Баллы" value={String(user.xp)} hint="за уроки и повторение" />
        <Stat label="Повторение" value={due > 0 ? String(due) : "0"} hint={due > 0 ? `${plural(due, "карточка ждёт", "карточки ждут", "карточек ждут")} · открыть` : "на сегодня пусто"} href="/learn/review" accent={due > 0} />
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_340px]">
        <section>
          <h2 className="type-heading">Мои курсы</h2>
          {courses.length === 0 ? (
            <EmptyState className="mt-4" title="Пока нет курсов" description="Введите код от преподавателя справа, и курс появится здесь." />
          ) : (
            <div className="mt-4 space-y-4">
              {cards.map(({ course: c, lessons, completed, next, limitReached }) => {
                const pct = lessons.length ? Math.round((completed / lessons.length) * 100) : 0;
                return (
                  <Card key={c.id}>
                    <CardHeader>
                      <CardTitle className="text-balance"><Link href={`/learn/${c.id}`} className="hover:text-primary-strong">{c.title}</Link></CardTitle>
                      <CardDescription className="line-clamp-2">{c.description || "Без описания"}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3 text-sm">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={completed} aria-valuemin={0} aria-valuemax={lessons.length} aria-label="Пройдено уроков">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="whitespace-nowrap tabular-nums text-muted-foreground">{completed}/{lessons.length}</span>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        {next && limitReached ? (
                          <p className="text-sm text-muted-foreground">Сегодня пройдено. Завтра: <span className="text-foreground">{next.title}</span></p>
                        ) : next ? (
                          <>
                            <div className="min-w-0 text-sm">
                              <div className="eyebrow text-primary-strong">Урок дня</div>
                              <div className="mt-0.5 font-medium">{next.title}</div>
                            </div>
                            <Button nativeButton={false} render={<Link href={`/learn/${c.id}/lesson/${next.id}`} />}>Начать</Button>
                          </>
                        ) : lessons.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Преподаватель ещё не опубликовал уроки.</p>
                        ) : (
                          <p className="text-sm text-muted-foreground">Все уроки пройдены. Загляните в повторение.</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Записаться на курс</CardTitle>
              <CardDescription>Код из шести символов даёт преподаватель.</CardDescription>
            </CardHeader>
            <CardContent>
              {sp.error ? <Notice kind="error" className="mb-3">Курс с таким кодом не найден.</Notice> : null}
              <form action={joinCourseAction} className="flex gap-2">
                <Input name="code" required placeholder="ABC234" aria-label="Код курса" className="font-mono uppercase tracking-widest" maxLength={6} />
                <Button type="submit">Записаться</Button>
              </form>
            </CardContent>
          </Card>
          <Card size="sm" className="bg-surface">
            <CardHeader>
              <CardTitle>Письмо с уроком дня</CardTitle>
              <CardDescription>Каждое утро на {user.email}: какой урок ждёт и сколько карточек пора повторить.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={setDailyEmailAction} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2">
                  <span aria-hidden className={`size-2 rounded-full ${user.daily_email ? "bg-primary" : "bg-border"}`} />
                  {user.daily_email ? "Включено" : "Выключено"}
                </span>
                <input type="hidden" name="enabled" value={user.daily_email ? "0" : "1"} />
                <Button type="submit" variant="outline" size="sm">{user.daily_email ? "Выключить" : "Включить"}</Button>
              </form>
            </CardContent>
          </Card>
          <p className="px-1 type-caption text-muted-foreground">
            <Link href="/account/data" className="underline underline-offset-4 hover:text-foreground">Мои данные</Link>: скачать всё, что мы храним о вас, или удалить аккаунт.
          </p>
        </aside>
      </div>
    </AppShell>
  );
}
