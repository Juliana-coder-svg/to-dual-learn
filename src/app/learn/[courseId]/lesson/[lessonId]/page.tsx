import Link from "next/link";
import { notFound } from "next/navigation";
import { studentCourse } from "@/lib/auth/access";
import { getLatestSubmission, getLesson, listLessons } from "@/lib/db/queries";
import { AppShell } from "@/components/shared/AppShell";
import { LessonPlayer } from "@/components/learn/LessonPlayer";

export default async function LessonPage({ params }: { params: Promise<{ courseId: string; lessonId: string }> }) {
  const { courseId, lessonId } = await params;
  const ctx = await studentCourse(courseId);
  if (!ctx) notFound();
  const lesson = await getLesson(lessonId);
  if (!lesson || lesson.course_id !== courseId) notFound();
  if (lesson.status !== "published" && ctx.course.owner_id !== ctx.user.id) notFound();
  const previous = await getLatestSubmission(lesson.id, ctx.user.id);
  const published = await listLessons(courseId, { publishedOnly: true });
  const idx = published.findIndex((l) => l.id === lesson.id);
  const nextLesson = idx >= 0 ? published[idx + 1] : undefined;

  return (
    <AppShell user={ctx.user}>
      <div className="mx-auto max-w-2xl">
        <Link href={`/learn/${courseId}`} className="text-sm text-muted-foreground hover:text-foreground">← {ctx.course.title}</Link>
        <LessonPlayer
          lesson={{ id: lesson.id, position: lesson.position, content: lesson.content }}
          previous={previous ? { answer: previous.answer, feedback: previous.feedback } : null}
          nextHref={nextLesson ? `/learn/${courseId}/lesson/${nextLesson.id}` : `/learn/${courseId}`}
          nextLabel={nextLesson ? `Следующий урок: ${nextLesson.title}` : "К списку уроков"}
        />
      </div>
    </AppShell>
  );
}
