import Link from "next/link";
import { notFound } from "next/navigation";
import { studentCourse, noCourseAccess } from "@/lib/auth/access";
import { requireUserId } from "@/lib/auth/session";
import { countLessonsStartedToday, latestSubmissionsForCourse, listLessonSummaries } from "@/lib/db/queries";
import { AppShell } from "@/components/shared/AppShell";
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
  if (!ctx) return noCourseAccess(`/learn/${courseId}`);
  const { user, course } = ctx;
  const next = lessons.find((l) => !done.has(l.id));
  const isOwner = course.owner_id === user.id;
  const limitReached = !isOwner && course.daily_limit > 0 && startedToday >= course.daily_limit;

  return (
    <AppShell user={user}>
      <Link href="/learn" className="text-sm text-muted-foreground hover:text-foreground">← Мои курсы</Link>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{course.title}</h1>
      {course.description ? <p className="mt-1 text-sm text-muted-foreground">{course.description}</p> : null}
      {next && limitReached ? (
        <div className="mt-6 rounded-md border border-dashed p-4">
          <div className="text-xs text-muted-foreground">На сегодня всё</div>
          <div className="font-medium">Следующий урок откроется завтра: {next.title}</div>
          <div className="mt-1 text-sm text-muted-foreground">Пока можно повторить карточки или перечитать разбор пройденных уроков.</div>
          <Button nativeButton={false} render={<Link href="/learn/review" />} variant="outline" size="sm" className="mt-3">К повторению</Button>
        </div>
      ) : next ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-primary p-4">
          <div>
            <div className="text-xs text-primary">Урок дня</div>
            <div className="font-medium">{next.title}</div>
            <div className="text-sm text-muted-foreground">{next.concept} · 5 минут</div>
          </div>
          <Button nativeButton={false} render={<Link href={`/learn/${courseId}/lesson/${next.id}`} />}>Начать</Button>
        </div>
      ) : null}
      <ol className="mt-8 space-y-2">
        {lessons.length === 0 ? <p className="text-sm text-muted-foreground">Преподаватель ещё не опубликовал уроки.</p> : null}
        {lessons.map((l) => {
          const sub = done.get(l.id);
          const isNext = next?.id === l.id;
          const locked = !sub && limitReached;
          return (
            <li key={l.id}>
              <Link href={locked ? `/learn/${courseId}` : `/learn/${courseId}/lesson/${l.id}`} aria-disabled={locked} className={`flex items-center justify-between gap-4 rounded-md border px-4 py-3 transition-colors ${locked ? "opacity-60" : "hover:border-primary"}`}>
                <div className="flex items-center gap-4">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${sub ? "bg-primary text-primary-foreground" : isNext ? "border border-primary text-primary" : "border text-muted-foreground"}`}>{l.position}</span>
                  <div>
                    <div className="font-medium">{l.title}</div>
                    <div className="text-sm text-muted-foreground">{l.concept}</div>
                  </div>
                </div>
                {sub ? <Badge variant="secondary">{sub.score}/5</Badge> : locked ? <Badge variant="outline">Завтра</Badge> : isNext ? <Badge>Сегодня</Badge> : null}
              </Link>
            </li>
          );
        })}
      </ol>
    </AppShell>
  );
}
