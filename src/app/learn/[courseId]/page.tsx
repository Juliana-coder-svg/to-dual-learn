import Link from "next/link";
import { notFound } from "next/navigation";
import { studentCourse, noCourseAccess } from "@/lib/auth/access";
import { requireUserId } from "@/lib/auth/session";
import { countLessonsStartedToday, latestSubmissionsForCourse, listLessonSummaries } from "@/lib/db/queries";
import { AppShell } from "@/components/shared/AppShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isUuid } from "@/lib/utils/ids";
import { plural } from "@/lib/utils/format";

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
  if (!ctx) return noCourseAccess(`/learn/${courseId}`);
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
        <p className="mt-4 type-caption text-muted-foreground tabular-nums">Пройдено {completed} из {plural(lessons.length, "урока", "уроков", "уроков")}</p>
      ) : null}

      {next && limitReached ? (
        <div className="callout mt-6">
          <div className="callout-label">На сегодня всё</div>
          <p className="mt-2 font-medium">Следующий урок откроется завтра: {next.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">Пока можно повторить карточки или перечитать разбор пройденных уроков.</p>
          <Button nativeButton={false} render={<Link href="/learn/review" />} variant="outline" className="mt-4">К повторению</Button>
        </div>
      ) : next ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-primary p-5">
          <div className="min-w-0">
            <div className="eyebrow text-primary-strong">Урок дня</div>
            <div className="mt-1 text-base font-semibold">{next.title}</div>
            <div className="mt-0.5 text-sm text-muted-foreground">{next.concept} · 5 минут</div>
          </div>
          <Button nativeButton={false} render={<Link href={`/learn/${courseId}/lesson/${next.id}`} />} size="lg">Начать</Button>
        </div>
      ) : null}

      {lessons.length === 0 ? (
        <EmptyState className="mt-8" title="Уроков пока нет" description="Преподаватель ещё не опубликовал уроки. Загляните позже." />
      ) : (
        <ol className="mt-8 space-y-2">
          {lessons.map((l) => {
            const sub = done.get(l.id);
            const isNext = next?.id === l.id;
            const locked = !sub && limitReached;
            const circle = sub
              ? "bg-primary text-primary-foreground"
              : isNext
                ? "border-2 border-primary text-primary-strong"
                : "border text-muted-foreground";
            return (
              <li key={l.id}>
                <Link
                  href={locked ? `/learn/${courseId}` : `/learn/${courseId}/lesson/${l.id}`}
                  aria-disabled={locked}
                  className={`flex items-center justify-between gap-4 rounded-lg border px-4 py-3 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40 ${locked ? "opacity-60" : "hover:border-foreground/40"}`}
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <span className={`flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-medium tabular-nums ${circle}`}>{sub ? "✓" : l.position}</span>
                    <div className="min-w-0">
                      <div className="font-medium">{l.title}</div>
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
