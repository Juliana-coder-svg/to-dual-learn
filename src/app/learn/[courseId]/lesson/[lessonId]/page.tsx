import Link from "next/link";
import { notFound } from "next/navigation";
import { studentCourse } from "@/lib/auth/access";
import { countLessonsStartedToday, getLatestSubmission, getLesson, listLessons } from "@/lib/db/queries";
import { AppShell } from "@/components/shared/AppShell";
import { LessonPlayer } from "@/components/learn/LessonPlayer";

export default async function LessonPage({ params }: { params: Promise<{ courseId: string; lessonId: string }> }) {
  const { courseId, lessonId } = await params;
  const ctx = await studentCourse(courseId);
  if (!ctx) notFound();
  const lesson = getLesson(lessonId);
  if (!lesson || lesson.course_id !== courseId) notFound();
  if (lesson.status !== "published" && ctx.course.owner_id !== ctx.user.id) notFound();
  const previous = getLatestSubmission(lesson.id, ctx.user.id);
  const isOwner = ctx.course.owner_id === ctx.user.id;
  const locked = !previous && !isOwner && ctx.course.daily_limit > 0 && countLessonsStartedToday(ctx.user.id, courseId) >= ctx.course.daily_limit;
  const published = listLessons(courseId, { publishedOnly: true });
  const idx = published.findIndex((l) => l.id === lesson.id);
  const nextLesson = idx >= 0 ? published[idx + 1] : undefined;

  return (
    <AppShell user={ctx.user}>
      <div className="mx-auto max-w-2xl">
        <Link href={`/learn/${courseId}`} className="text-sm text-muted-foreground hover:text-foreground">← {ctx.course.title}</Link>
        {locked ? (
          <div className="mt-6 rounded-md border border-dashed p-6">
            <div className="font-medium">Этот урок откроется завтра</div>
            <p className="mt-1 text-sm text-muted-foreground">Сегодняшний урок уже пройден. Один урок в день — так знания успевают осесть, а завтра придёт карточка на повторение.</p>
            <Link href={`/learn/${courseId}`} className="mt-3 inline-block text-sm text-primary">← К курсу</Link>
          </div>
        ) : (
        <LessonPlayer
          lesson={{ id: lesson.id, position: lesson.position, content: lesson.content }}
          previous={previous ? { answer: previous.answer, feedback: previous.feedback } : null}
          nextHref={nextLesson ? `/learn/${courseId}/lesson/${nextLesson.id}` : `/learn/${courseId}`}
          nextLabel={nextLesson ? `Следующий урок: ${nextLesson.title}` : "К списку уроков"}
        />
        )}
      </div>
    </AppShell>
  );
}
