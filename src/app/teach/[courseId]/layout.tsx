import Link from "next/link";
import { notFound } from "next/navigation";
import { teacherCourse } from "@/lib/auth/access";
import { AppShell } from "@/components/shared/AppShell";
import { CourseTabs } from "@/components/teach/CourseTabs";
import { isDemoMode } from "@/lib/ai/claude";

export default async function CourseLayout({ children, params }: { children: React.ReactNode; params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const ctx = await teacherCourse(courseId);
  if (!ctx) notFound();
  const { user, course } = ctx;

  return (
    <AppShell user={user}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/teach" className="text-sm text-muted-foreground hover:text-foreground">← Мои курсы</Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{course.title}</h1>
          {course.description ? <p className="mt-1 text-sm text-muted-foreground">{course.description}</p> : null}
        </div>
        <div className="rounded-md border px-3 py-2 text-sm">
          Код для студентов: <span className="font-mono font-semibold">{course.join_code}</span>
        </div>
      </div>
      {isDemoMode() ? (
        <p className="mt-4 rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
          Демо-режим: переменная ANTHROPIC_API_KEY не задана, AI отвечает заглушками. Добавь ключ в .env.local и перезапусти сервер.
        </p>
      ) : null}
      <CourseTabs courseId={course.id} />
      <div className="mt-6">{children}</div>
    </AppShell>
  );
}
