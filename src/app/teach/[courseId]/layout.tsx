import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { teacherCourse, noCourseAccess } from "@/lib/auth/access";
import { getCurrentUserId } from "@/lib/auth/session";
import { AppShell } from "@/components/shared/AppShell";
import { CourseTabs } from "@/components/teach/CourseTabs";
import { isDemoMode, providerLabel } from "@/lib/ai";
import { courseUsage } from "@/lib/db/queries";
import { formatRub, usdToRub } from "@/lib/utils/money";
import { isUuid } from "@/lib/utils/ids";

export default async function CourseLayout({ children, params }: { children: React.ReactNode; params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  if (!isUuid(courseId)) notFound();
  // Без сессии запрос ушёл бы под ролью anon, у которой нет права вызывать course_usage: вместо
  // страницы входа была бы ошибка. Проверка по JWT из cookie локальная, круга до базы не добавляет.
  if (!(await getCurrentUserId())) redirect(`/login?role=teacher&next=${encodeURIComponent(`/teach/${courseId}`)}`);
  // Расход считает RPC с проверкой владельца, поэтому его можно запрашивать параллельно с проверкой доступа.
  const [ctx, usage] = await Promise.all([teacherCourse(courseId), courseUsage(courseId)]);
  if (!ctx) return noCourseAccess(`/teach/${courseId}`);
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
          Пробный режим: ключ модели не задан, поэтому вместо ответов ИИ сервис показывает примеры. Добавьте ключ в .env.local и перезапустите сервер.
        </p>
      ) : null}
      <CourseTabs courseId={course.id} />
      <div className="mt-6">{children}</div>
    </AppShell>
  );
}
