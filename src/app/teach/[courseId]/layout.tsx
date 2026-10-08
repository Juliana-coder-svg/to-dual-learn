import Link from "next/link";
import { notFound } from "next/navigation";
import { teacherCourse } from "@/lib/auth/access";
import { AppShell } from "@/components/shared/AppShell";
import { CourseTabs } from "@/components/teach/CourseTabs";
import { isDemoMode, providerLabel } from "@/lib/ai";
import { courseUsage } from "@/lib/db/queries";
import { formatRub, usdToRub } from "@/lib/utils/money";

export default async function CourseLayout({ children, params }: { children: React.ReactNode; params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  // Расход считает RPC с проверкой владельца, поэтому его можно запрашивать параллельно с проверкой доступа.
  const [ctx, usage] = await Promise.all([teacherCourse(courseId), courseUsage(courseId)]);
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
        <div className="flex flex-wrap gap-2 text-sm">
          <div className="rounded-md border px-3 py-2">
            Код для студентов: <span className="font-mono font-semibold">{course.join_code}</span>
          </div>
          <div className="rounded-md border px-3 py-2 text-muted-foreground" title={`Модель: ${providerLabel()}. Сумма оценочная, в долларах: $${usage.cost_usd.toFixed(2)}`}>
            Расход на ИИ: <span className="font-semibold text-foreground">≈ {formatRub(usdToRub(usage.cost_usd))}</span> · {usage.calls} запросов
          </div>
        </div>
      </div>
      {isDemoMode() ? (
        <p className="mt-4 rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
          Пробный режим: ключ модели не задан, вместо ответов ИИ показываются примеры. Добавьте ключ в .env.local и перезапустите сервер.
        </p>
      ) : null}
      <CourseTabs courseId={course.id} />
      <div className="mt-6">{children}</div>
    </AppShell>
  );
}
