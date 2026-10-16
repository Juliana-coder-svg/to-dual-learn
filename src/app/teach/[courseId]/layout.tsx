import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { teacherCourse, noCourseAccess } from "@/lib/auth/access";
import { getCurrentUserId } from "@/lib/auth/session";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
  const ctx = await teacherCourse(courseId);
  if (!ctx) return noCourseAccess(`/teach/${courseId}`);
  const { user, course } = ctx;

  return (
    <AppShell user={user}>
      <PageHeader
        back={{ href: "/teach", label: "Мои курсы" }}
        title={course.title}
        description={course.description || undefined}
        actions={
          <div className="flex flex-wrap items-center gap-2">
          <Button nativeButton={false} render={<Link href={`/teach/${course.id}/share`} />} size="lg">Отправить студентам</Button>
          <dl className="flex flex-wrap gap-2 text-sm">
            <div className="chip">
              <dt className="text-muted-foreground">Код для студентов</dt>
              <dd className="font-mono font-semibold tracking-wider">{course.join_code}</dd>
            </div>
            <Suspense fallback={<UsageBadge />}>
              <CourseUsage courseId={course.id} />
            </Suspense>
          </dl>
          </div>
        }
      />
      {isDemoMode() ? (
        <Notice className="mt-5">
          Пробный режим: ключ модели не задан, поэтому вместо ответов ИИ сервис показывает примеры. Добавьте ключ в .env.local и перезапустите сервер.
        </Notice>
      ) : null}
      <CourseTabs courseId={course.id} showSignals={process.env.CONCEPT_SIGNALS === "1"} />
      <div className="mt-8">{children}</div>
    </AppShell>
  );
}

/** Расход на ИИ считает отдельный запрос (RPC с проверкой владельца). Он не нужен для первой отрисовки:
 *  страница отдаётся сразу, плашка подгружается потоком. Проверка владельца уже сделана в layout. */
async function CourseUsage({ courseId }: { courseId: string }) {
  const usage = await courseUsage(courseId);
  return <UsageBadge usage={usage} />;
}

function UsageBadge({ usage }: { usage?: Awaited<ReturnType<typeof courseUsage>> }) {
  return (
    <div
      className="chip"
      title={usage ? `Модель: ${providerLabel()}. Сумма оценочная, в долларах: $${usage.cost_usd.toFixed(2)}` : undefined}
    >
      <dt className="text-muted-foreground">Расход на ИИ</dt>
      <dd className="font-semibold tabular-nums">
        {usage ? (
          <>
            ≈ {formatRub(usdToRub(usage.cost_usd))} <span className="font-normal text-muted-foreground">· {plural(usage.calls, "запрос", "запроса", "запросов")}</span>
          </>
        ) : (
          <span role="status" aria-label="Считаем расход" className="inline-block h-4 w-24 animate-pulse rounded-sm bg-muted align-middle" />
        )}
      </dd>
    </div>
  );
}
