import Link from "next/link";
import { requireUser, requireUserId } from "@/lib/auth/session";
import { countDueFlashcardsByCourse, countLessonsStartedToday, latestScoresByCourse, listCoursesForStudentWithLessons, listOwnedCoursesWithLessons } from "@/lib/db/queries";
import { joinCourseAction } from "@/lib/actions/courses";
import { DailyEmailCard } from "@/components/shared/DailyEmailCard";
import { AppShell } from "@/components/shared/AppShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { Notice } from "@/components/shared/Notice";
import { ProgressAsterisk } from "@/components/shared/ProgressAsterisk";
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
      <div className={`mt-3 type-counter ${accent ? "text-primary-strong" : ""}`}>{value}</div>
      {hint ? <div className="mt-2 type-caption text-muted-foreground">{hint}</div> : null}
    </>
  );
  const cls = "block border-t-2 pt-4";
  return href ? (
    <Link href={href} className={`${cls} border-primary transition-colors outline-none hover:text-primary-strong focus-visible:ring-3 focus-visible:ring-ring`}>{body}</Link>
  ) : (
    <div className={`${cls} border-foreground`}>{body}</div>
  );
}

export const metadata = { title: "Сегодня" };

export default async function LearnPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  // Четыре независимых запроса одним кругом до базы: профиль, курсы с уроками, карточки, баллы по всем курсам.
  const userId = await requireUserId();
  const [user, sp, joined, owned, dueByCourse, scores] = await Promise.all([
    requireUser(),
    searchParams,
    listCoursesForStudentWithLessons(userId),
    listOwnedCoursesWithLessons(userId),
    countDueFlashcardsByCourse(userId),
    latestScoresByCourse(userId),
  ]);
  // Свои курсы преподаватель видит здесь без записи кодом: страница курса и урок ему и так открыты.
  const joinedIds = new Set(joined.map((e) => e.course.id));
  const enrolled = [...joined, ...owned.filter((o) => !joinedIds.has(o.course.id))];
  // Общий счётчик повторения складывается из карточек по курсам: один запрос вместо двух.
  const due = Array.from(dueByCourse.values()).reduce((a, b) => a + b, 0);
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
    return { course: c, lessons, completed, next, nextIndex, limitReached, dueCards: dueByCourse.get(c.id) ?? 0 };
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
      <PageHeader title="Сегодня" description="Один урок в день и карточки на повторение. Это пять минут." />

      {courses.length > 0 || user.streak > 0 || user.xp > 0 || due > 0 ? (
      <div className="mt-10 grid grid-cols-3 gap-4 sm:gap-8">
        <Stat label="Дней подряд" value={String(user.streak)} hint={user.streak > 0 ? "считается по урокам" : "начните сегодня"} />
        <Stat label="Баллы" value={String(user.xp)} hint="за уроки и повторение" />
        <Stat label="Повторение" value={String(due)} hint={due > 0 ? `${plural(due, "карточка ждёт", "карточки ждут", "карточек ждут")} · открыть` : "на сегодня карточек нет"} href="/learn/review" accent={due > 0} />
      </div>
      ) : null}

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
              <p className="text-muted-foreground">Курсы появятся здесь. Выберите, как начать.</p>
              <div className="grid gap-3 md:grid-cols-2">
                <section className="panel border-primary">
                  <h3 className="type-heading">У меня есть код</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Если у вас ссылка, откройте её. Если код из шести символов, введите его ниже.</p>
                  {sp.error ? <Notice kind="error" className="mt-4">Курс с таким кодом не найден. Проверьте код или попросите преподавателя прислать ссылку.</Notice> : null}
                  {joinForm}
                </section>
                <section className="panel">
                  <h3 className="type-heading">Кода нет</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Пройдите первый урок примера: идея, задача, разбор. Это пять минут, настраивать ничего не нужно.</p>
                  <Button nativeButton={false} render={<Link href={`/try/${DEFAULT_TRY_SLUG}/1?from=learn`} />} variant="outline" className="mt-4">Попробовать урок</Button>
                </section>
              </div>
            </div>
          ) : (
            <ul className="mt-5 space-y-3">
              {cards.map(({ course: c, lessons, completed, next, limitReached, dueCards }) => (
                <li key={c.id}>
                  <Link href={`/learn/${c.id}`} className="card-link block rounded-xl p-5">
                    <div className="min-w-0 max-w-xl">
                      <h3 className="text-balance type-heading">{c.title}{c.owner_id === user.id ? <span className="ml-2 align-middle type-caption font-normal text-muted-foreground">ваш курс</span> : null}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.description || "Без описания"}</p>
                    </div>
                    {/* Звёздочка-прогресс на месте бывшей полосы, всегда с числом; лучи точками, если по курсу ждут карточки. Без уроков считать нечего. */}
                    {lessons.length > 0 ? <ProgressAsterisk
                      size={24}
                      value={{ done: completed, total: lessons.length }}
                      due={dueCards > 0}
                      label={`Пройдено ${completed} из ${lessons.length}${dueCards > 0 ? `, ${plural(dueCards, "карточка ждёт", "карточки ждут", "карточек ждут")} повторения` : ""}`}
                      count={`${completed} из ${lessons.length}`}
                      countClassName="text-2xl font-semibold tracking-tight"
                      className="mt-4"
                    /> : null}
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
