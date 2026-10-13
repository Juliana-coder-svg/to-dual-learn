import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, homeFor } from "@/lib/auth/session";
import { getTryLesson } from "@/lib/try/catalog";
import { PublicShell } from "@/components/shared/PublicShell";
import { LessonPlayer } from "@/components/learn/LessonPlayer";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Пробный урок", robots: { index: false } };

/** Первый урок курса-примера без регистрации. Остальные уроки гостю не открываются. */
export default async function TryLessonPage({ params }: { params: Promise<{ courseSlug: string; lessonIndex: string }> }) {
  const { courseSlug, lessonIndex } = await params;
  const index = Number(lessonIndex);
  const lesson = getTryLesson(courseSlug, index);
  if (!lesson) notFound();
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user));

  return (
    <PublicShell width="wide" action={<Button nativeButton={false} render={<Link href="/login" />} size="sm" variant="outline">Войти</Button>}>
      <div className="mx-auto w-full max-w-2xl py-8 md:py-10">
        <Link href="/" className="inline-flex min-h-6 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><span aria-hidden>←</span> {lesson.courseTitle}</Link>
        <div className="mt-6">
          <LessonPlayer
            lesson={{ id: `try-${lesson.slug}-${index}`, position: index, content: lesson.content }}
            reviewed
            previous={null}
            nextHref="/"
            nextLabel=""
            tone={lesson.tone}
            guest={{ slug: lesson.slug, lessonIndex: index }}
          />
        </div>
      </div>
    </PublicShell>
  );
}
