import Link from "next/link";
import { notFound } from "next/navigation";
import { studentCourse } from "@/lib/auth/access";
import { countLessonsStartedToday, latestSubmissionsForCourse, listLessons } from "@/lib/db/queries";
import { AppShell } from "@/components/shared/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function CoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const ctx = await studentCourse(courseId);
  if (!ctx) notFound();
  const { user, course } = ctx;
  const lessons = await listLessons(courseId, { publishedOnly: true });
  const done = await latestSubmissionsForCourse(user.id, courseId);
  const next = lessons.find((l) => !done.has(l.id));
  const isOwner = course.owner_id === user.id;
  const limitReached = !isOwner && course.daily_limit > 0 && await countLessonsStartedToday(user.id, courseId) >= course.daily_limit;

  return (
    <AppShell user={user}>
      <Link href="/learn" className="text-sm text-muted-foreground hover:text-foreground">← Мои курсы</Link>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{course.title}</h1>
      {course.description ? <p className="mt-1 text-sm text-muted-foreground">{course.description}</p> : null}
      {next && limitReached ? (
        <div className="mt-6 rounded-md border border-dashed p-4">
          <div className="text-xs text-muted-foreground">На сегодня все</div>
          <div className="font-medium">Следующий урок откроется завтра: {next.title}</div>
          <div className="mt-1 text-sm text-muted-foreground">Пока можно повторить карточки или перечитать фидбек по пройденным урокам.</div>
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
        {lessons.length === 0 ? <p className="text-sm text-muted-foreground">Уроки еще не опубликованы.</p> : null}
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
