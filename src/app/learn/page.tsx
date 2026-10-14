import Link from "next/link";
import { requireUser, requireUserId } from "@/lib/auth/session";
import { countDueFlashcards, countLessonsStartedToday, latestScoresByCourse, listCoursesForStudentWithLessons, listOwnedCoursesWithLessons } from "@/lib/db/queries";
import { joinCourseAction } from "@/lib/actions/courses";
import { DailyEmailCard } from "@/components/shared/DailyEmailCard";
import { AppShell } from "@/components/shared/AppShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { Notice } from "@/components/shared/Notice";
import { StepMarks } from "@/components/shared/StepMarks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEFAULT_TRY_SLUG } from "@/lib/try/catalog";
import { plural } from "@/lib/utils/format";

/** Показатель-счётчик: подпись сверху, число крупными табличными цифрами. Ссылка, когда за числом стоит действие. */
function Stat({ label, value, hint, href, accent }: { label: string; value: string; hint?: string; href?: string; accent?: boolean }) {
  const body = (
    <>
      <div className="eyebrow">{label}</div>
      <div className={`mt-3 type-counter ${accent ? "text-primary" : ""}`}>{value}</div>
      {hint ? <div className="mt-2 type-caption text-muted-foreground">{hint}</div> : null}
    </>
  );
  const cls = "block border-t-2 pt-4";
  return href ? (
    <Link href={href} className={`${cls} border-primary transition-colors outline-none hover:text-primary-strong focus-visible:ring-3 focus-visible:ring-ring/40`}>{body}</Link>
  ) : (
    <div className={`${cls} border-foreground`}>{body}</div>
  );
}

export default async function LearnPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  // Четыре независимых запроса одним кругом до базы: профиль, курсы с уроками, карточки, баллы по всем курсам.
  const userId = await requireUserId();
  const [user, sp, joined, owned, due, scores] = await Promise.all([
    requireUser(),
    searchParams,
    listCoursesForStudentWithLessons(userId),
    listOwnedCoursesWithLessons(userId),
    countDueFlashcards(userId),
    latestScoresByCourse(userId),
  ]);
  // Свои курсы преподаватель видит здесь без записи кодом: страница курса и урок ему и так открыты.
  const joinedIds = new Set(joined.map((e) => e.course.id));
  const enrolled = [...joined, ...owned.filter((o) => !joinedIds.has(o.course.id))];
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
    const nextIndex = next ? lessons.indexOf(next) : lessons.length;
    const limitReached = c.owner_id !== user.id && c.daily_limit > 0 && startedToday[i] >= c.daily_limit;
    return { course: c, lessons, completed, next, nextIndex, limitReached };
  });
  // Урок дня: первый курс, где есть непройденный урок и не исчерпан дневной лимит. Остальные курсы ждут в списке.
  const joinForm = (
    <form action={joinCourseAction} className="mt-4 flex gap-2">
      <Input name="code" required placeholder="ABC234" aria-label="Код курса" className="font-mono uppercase tracking-widest" maxLength={6} />
      <Button type="submit">Записаться</Button>
    </form>
  );
  const today = cards.find((card) => card.next && !card.limitReached);
  const paused = !today ? cards.find((card) => card.next && card.limitReached) : undefined;

  return (
    <AppShell user={user}>
      <PageHeader title={`Привет, ${user.name}`} description="Один урок в день и карточки на повторение. Пять минут, и свободны." />

      <div className="mt-10 grid grid-cols-3 gap-4 sm:gap-8">
        <Stat label="Дней подряд" value={String(user.streak)} hint={user.streak > 0 ? "не прерывайте серию" : "начните сегодня"} />
        <Stat label="Баллы" value={String(user.xp)} hint="за уроки и повторение" />
        <Stat label="Повторение" value={String(due)} hint={due > 0 ? `${plural(due, "карточка ждёт", "карточки ждут", "карточек ждут")} · открыть` : "на сегодня пусто"} href="/learn/review" accent={due > 0} />
      </div>

      {today?.next ? (
        <section aria-labelledby="today-title" className="accent-panel mt-12">
          <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-8">
            <div className="min-w-0 max-w-xl">
              <p className="eyebrow">Урок дня · {today.course.title}</p>
              <div className="mt-5 flex items-start gap-5">
                <span className="type-counter shrink-0">{String(today.next.position).padStart(2, "0")}</span>
                <div className="min-w-0 pt-1">
                  <h2 id="today-title" className="text-balance type-title">{today.next.title}</h2>
                  <p className="mt-2 type-body accent-panel-muted">{today.next.concept} · 5 минут</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-start gap-4">
              <StepMarks total={3} filled={0} size="md" tone="inverse" labels={["Идея", "Задача", "Разбор"]} />
              <Button nativeButton={false} render={<Link href={`/learn/${today.course.id}/lesson/${today.next.id}`} />} size="lg" variant="inverse">Начать урок</Button>
            </div>
          </div>
        </section>
      ) : paused?.next ? (
        <section className="callout mt-12 md:p-6">
          <div className="callout-label">На сегодня всё</div>
          <p className="mt-2 type-heading">Следующий урок откроется завтра: {paused.next.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">Пока можно повторить карточки или перечитать разбор пройденных уроков.</p>
        </section>
      ) : null}

      <div className="mt-14 grid gap-12 lg:grid-cols-[1fr_320px] lg:gap-16">
        <section>
          <h2 className="type-heading">Мои курсы</h2>
          {courses.length === 0 ? (
            <div className="mt-5 space-y-4">
              <p className="text-muted-foreground">Курсы появятся здесь. Что вам подходит?</p>
              <div className="grid gap-3 md:grid-cols-2">
                <section className="rounded-lg border border-primary p-5">
                  <h3 className="type-heading">У меня есть код</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Шесть символов или ссылка от преподавателя. Ссылку достаточно открыть, код введите здесь.</p>
                  {sp.error ? <Notice kind="error" className="mt-4">Курс с таким кодом не найден. Проверьте код или попросите преподавателя прислать ссылку.</Notice> : null}
                  {joinForm}
                </section>
                <section className="rounded-lg border p-5">
                  <h3 className="type-heading">Кода нет</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Пройдите первый урок примера: идея, задача, разбор. Это пять минут и ничего не нужно настраивать.</p>
                  <Button nativeButton={false} render={<Link href={`/try/${DEFAULT_TRY_SLUG}/1?from=learn`} />} variant="outline" className="mt-4">Попробовать урок</Button>
                </section>
              </div>
            </div>
          ) : (
            <ul className="mt-5 space-y-3">
              {cards.map(({ course: c, lessons, completed, next, nextIndex, limitReached }) => (
                <li key={c.id}>
                  <Link href={`/learn/${c.id}`} className="card-link block rounded-lg border p-5 outline-none">
                    <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
                      <div className="min-w-0 max-w-xl">
                        <h3 className="text-balance type-heading">{c.title}{c.owner_id === user.id ? <span className="ml-2 align-middle type-caption font-normal text-muted-foreground">ваш курс</span> : null}</h3>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.description || "Без описания"}</p>
                      </div>
                      <span className="shrink-0 text-2xl font-semibold tracking-tight tabular-nums">
                        {completed}<span className="text-muted-foreground">/{lessons.length}</span>
                      </span>
                    </div>
                    <StepMarks total={lessons.length} filled={nextIndex} current={next ? nextIndex + 1 : undefined} size="sm" className="mt-4" />
                    <p className="mt-3 text-sm text-muted-foreground">
                      {next && limitReached ? (
                        <>Сегодня пройдено. Завтра: <span className="text-foreground">{next.title}</span></>
                      ) : next ? (
                        <>Дальше: <span className="text-foreground">{next.title}</span></>
                      ) : lessons.length === 0 ? (
                        "Преподаватель ещё не опубликовал уроки."
                      ) : (
                        "Все уроки пройдены. Загляните в повторение."
                      )}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <aside className="space-y-10">
          {courses.length > 0 ? (
            <section>
              <h2 className="type-heading">Записаться на курс</h2>
              <p className="mt-1 text-sm text-muted-foreground">Код из шести символов даёт преподаватель.</p>
              {sp.error ? <Notice kind="error" className="mt-4">Курс с таким кодом не найден.</Notice> : null}
              {joinForm}
            </section>
          ) : null}
          <DailyEmailCard user={user} next="/learn" />
          <p className="px-1 type-caption text-muted-foreground">
            <Link href="/account/data" className="underline underline-offset-4 hover:text-foreground">Мои данные</Link>: скачать всё, что мы храним о вас, или удалить аккаунт.
          </p>
        </aside>
      </div>
    </AppShell>
  );
}
