import { notFound, redirect } from "next/navigation";
import { teacherCourse } from "@/lib/auth/access";
import { getCurrentUserId } from "@/lib/auth/session";
import { AppShell } from "@/components/shared/AppShell";
import { CourseTabs } from "@/components/teach/CourseTabs";
import { PageHeader } from "@/components/shared/PageHeader";
import { Notice } from "@/components/shared/Notice";
import { isDemoMode, providerLabel } from "@/lib/ai";
import { courseUsage } from "@/lib/db/queries";
import { formatRub, usdToRub } from "@/lib/utils/money";
import { isUuid } from "@/lib/utils/ids";
import { plural } from "@/lib/utils/format";

export default async function CourseLayout({ children, params }: { children: React.ReactNode; params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  if (!isUuid(courseId)) notFound();
  // Без сессии запрос ушёл бы под ролью anon, у которой нет права вызывать course_usage: вместо
  // страницы входа была бы ошибка. Проверка по JWT из cookie локальная, круга до базы не добавляет.
  if (!(await getCurrentUserId())) redirect(`/login?role=teacher&next=${encodeURIComponent(`/teach/${courseId}`)}`);
  // Расход считает RPC с проверкой владельца, поэтому его можно запрашивать параллельно с проверкой доступа.
  const [ctx, usage] = await Promise.all([teacherCourse(courseId), courseUsage(courseId)]);
  if (!ctx) notFound();
  const { user, course } = ctx;

  return (
    <AppShell user={user}>
      <PageHeader
        back={{ href: "/teach", label: "Мои курсы" }}
        title={course.title}
        description={course.description || undefined}
        actions={
          <dl className="flex flex-wrap gap-2 text-sm">
            <div className="flex items-center gap-2 rounded-lg border px-3 py-1.5">
              <dt className="text-muted-foreground">Код для студентов</dt>
              <dd className="font-mono font-semibold tracking-wider">{course.join_code}</dd>
            </div>
            <div
              className="flex items-center gap-2 rounded-lg border px-3 py-1.5"
              title={`Модель: ${providerLabel()}. Сумма оценочная, в долларах: $${usage.cost_usd.toFixed(2)}`}
            >
              <dt className="text-muted-foreground">Расход на ИИ</dt>
              <dd className="font-semibold tabular-nums">
                ≈ {formatRub(usdToRub(usage.cost_usd))} <span className="font-normal text-muted-foreground">· {plural(usage.calls, "запрос", "запроса", "запросов")}</span>
              </dd>
            </div>
          </dl>
        }
      />
      {isDemoMode() ? (
        <Notice className="mt-5">
          Пробный режим: ключ модели не задан, поэтому вместо ответов ИИ сервис показывает примеры. Добавьте ключ в .env.local и перезапустите сервер.
        </Notice>
      ) : null}
      <CourseTabs courseId={course.id} />
      <div className="mt-8">{children}</div>
    </AppShell>
  );
}
