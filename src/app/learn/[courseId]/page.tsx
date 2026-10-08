import Link from "next/link";
import { notFound } from "next/navigation";
import { studentCourse } from "@/lib/auth/access";
import { requireUserId } from "@/lib/auth/session";
import { countLessonsStartedToday, latestSubmissionsForCourse, listLessonSummaries } from "@/lib/db/queries";
import { AppShell } from "@/components/shared/AppShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { StepMarks } from "@/components/shared/StepMarks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isUuid } from "@/lib/utils/ids";

export default async function CoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  if (!isUuid(courseId)) notFound();
  const userId = await requireUserId();
  // Всё одним кругом до базы; лимит считает та же RPC, что и /api/evaluate.
  const [ctx, lessons, done, startedToday] = await Promise.all([
    studentCourse(courseId),
    listLessonSummaries(courseId, { publishedOnly: true }),
    latestSubmissionsForCourse(userId, courseId),
    countLessonsStartedToday(userId, courseId),
  ]);
  if (!ctx) notFound();
  const { user, course } = ctx;
  const next = lessons.find((l) => !done.has(l.id));
  const isOwner = course.owner_id === user.id;
  const limitReached = !isOwner && course.daily_limit > 0 && startedToday >= course.daily_limit;
  const completed = lessons.filter((l) => done.has(l.id)).length;

  return (
    <AppShell user={user} width="narrow">
      <PageHeader
        back={{ href: "/learn", label: "Мои курсы" }}
        title={course.title}
        description={course.description || undefined}
      />
      {lessons.length > 0 ? (
        <div className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <span className="eyebrow">Пройдено</span>
            <span className="text-2xl font-semibold tracking-tight tabular-nums">
              {completed}<span className="text-muted-foreground">/{lessons.length}</span>
            </span>
          </div>
          <StepMarks total={lessons.length} filled={completed} current={next?.position} size="lg" label="Пройдено уроков" className="mt-2" />
        </div>
      ) : null}

      {next && limitReached ? (
        <div className="callout mt-8 md:p-6">
          <div className="callout-label">На сегодня всё</div>
          <p className="mt-2 type-heading">Следующий урок откроется завтра: {next.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">Пока можно повторить карточки или перечитать разбор пройденных уроков.</p>
          <Button nativeButton={false} render={<Link href="/learn/review" />} variant="outline" className="mt-4">К повторению</Button>
        </div>
      ) : next ? (
        <section aria-labelledby="today-title" className="accent-panel mt-8">
          <p className="eyebrow">Урок дня</p>
          <div className="mt-4 flex items-start gap-5">
            <span className="type-counter shrink-0">{String(next.position).padStart(2, "0")}</span>
            <div className="min-w-0 pt-1">
              <h2 id="today-title" className="text-balance type-title">{next.title}</h2>
              <p className="mt-2 type-body accent-panel-muted">{next.concept} · 5 минут</p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <Button nativeButton={false} render={<Link href={`/learn/${courseId}/lesson/${next.id}`} />} size="lg" variant="inverse">Начать урок</Button>
            <StepMarks total={3} filled={0} size="md" tone="inverse" labels={["Идея", "Задача", "Разбор"]} />
          </div>
        </section>
      ) : null}

      {lessons.length === 0 ? (
        <EmptyState className="mt-8" title="Уроков пока нет" description="Преподаватель ещё не опубликовал уроки. Загляните позже." />
      ) : (
        <ol className="mt-10 divide-y border-t">
          {lessons.map((l) => {
            const sub = done.get(l.id);
            const isNext = next?.id === l.id;
            const locked = !sub && limitReached;
            const number = sub ? "text-primary" : isNext ? "text-foreground" : "text-muted-foreground/60";
            return (
              <li key={l.id}>
                <Link
                  href={locked ? `/learn/${courseId}` : `/learn/${courseId}/lesson/${l.id}`}
                  aria-disabled={locked}
                  className={`group flex items-center justify-between gap-4 py-4 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40 ${locked ? "opacity-60" : ""}`}
                >
                  <div className="flex min-w-0 items-start gap-4">
                    <span className={`w-10 shrink-0 text-2xl font-semibold tracking-tight tabular-nums ${number}`}>{String(l.position).padStart(2, "0")}</span>
                    <div className="min-w-0 pt-0.5">
                      <div className={`font-medium ${locked ? "" : "group-hover:text-primary-strong"}`}>{l.title}</div>
                      <div className="truncate text-sm text-muted-foreground">{l.concept}</div>
                    </div>
                  </div>
                  {sub ? <Badge variant="secondary">{sub.score}/5</Badge> : locked ? <Badge variant="outline">Завтра</Badge> : isNext ? <Badge>Сегодня</Badge> : null}
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </AppShell>
  );
}
