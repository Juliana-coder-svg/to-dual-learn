import Link from "next/link";
import { notFound } from "next/navigation";
import { studentCourse } from "@/lib/auth/access";
import { requireUserId } from "@/lib/auth/session";
import { countLessonsStartedToday, getLatestSubmission, getLesson, listLessonSummaries } from "@/lib/db/queries";
import { AppShell } from "@/components/shared/AppShell";
import { LessonPlayer } from "@/components/learn/LessonPlayer";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { isUuid } from "@/lib/utils/ids";

export default async function LessonPage({ params }: { params: Promise<{ courseId: string; lessonId: string }> }) {
  const { courseId, lessonId } = await params;
  if (!isUuid(courseId) || !isUuid(lessonId)) notFound();
  const userId = await requireUserId();
  // Всё одним кругом до базы; лимит считает та же RPC, что и /api/evaluate.
  const [ctx, lesson, previous, startedToday, published] = await Promise.all([
    studentCourse(courseId),
    getLesson(lessonId),
    getLatestSubmission(lessonId, userId),
    countLessonsStartedToday(userId, courseId),
    listLessonSummaries(courseId, { publishedOnly: true }),
  ]);
  if (!ctx) notFound();
  if (!lesson || lesson.course_id !== courseId) notFound();
  if (lesson.status !== "published" && ctx.course.owner_id !== ctx.user.id) notFound();
  const isOwner = ctx.course.owner_id === ctx.user.id;
  const locked = !previous && !isOwner && ctx.course.daily_limit > 0 && startedToday >= ctx.course.daily_limit;
  const idx = published.findIndex((l) => l.id === lesson.id);
  const nextLesson = idx >= 0 ? published[idx + 1] : undefined;

  return (
    <AppShell user={ctx.user} width="narrow">
      <div>
        <Link href={`/learn/${courseId}`} className="inline-flex min-h-6 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><span aria-hidden>←</span> {ctx.course.title}</Link>
        {locked ? (
          <div className="mt-6">
            <EmptyState
              title="Этот урок откроется завтра"
              description="Сегодняшний урок уже пройден. Один урок в день: так знания успевают осесть. Завтра придёт карточка на повторение."
              action={<Button nativeButton={false} render={<Link href="/learn/review" />} variant="outline">К повторению</Button>}
            />
          </div>
        ) : (
        <div className="mt-6"><LessonPlayer
          lesson={{ id: lesson.id, position: lesson.position, content: lesson.content }}
          reviewed={Boolean(lesson.reviewed_at)}
          previous={previous ? { answer: previous.answer, feedback: previous.feedback } : null}
          nextHref={nextLesson ? `/learn/${courseId}/lesson/${nextLesson.id}` : `/learn/${courseId}`}
          tone={ctx.course.tone}
          nextLabel={nextLesson ? `Следующий урок: ${nextLesson.title}` : "К списку уроков"}
        /></div>
        )}
      </div>
    </AppShell>
  );
}
