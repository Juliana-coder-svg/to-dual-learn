import Link from "next/link";
import { cookies } from "next/headers";
import { requireUser, requireUserId } from "@/lib/auth/session";
import { listCourseSummariesByOwner } from "@/lib/db/queries";
import { createCourseAction } from "@/lib/actions/courses";
import { createDemoCourseAction } from "@/lib/actions/seed";
import { AppShell } from "@/components/shared/AppShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { NewCourseDialog } from "@/components/teach/NewCourseDialog";
import { StepMarks } from "@/components/shared/StepMarks";
import { StartSteps } from "@/components/onboarding/StartSteps";
import { DailyEmailCard } from "@/components/shared/DailyEmailCard";
import { hideStartPanelAction } from "@/lib/actions/onboarding";
import { START_HIDDEN_COOKIE, allStepsDone, teacherSteps } from "@/lib/onboarding/teacher-steps";
import { plural } from "@/lib/utils/format";

/** Курсы-примеры из content/courses/<slug>.json. */
const DEMO_COURSES = [
  // text-lint-ignore: название курса-примера
  { slug: "critical-thinking-ai", title: "Критическое мышление в эпоху ИИ", short: "Критическое мышление", note: "пять уроков для маркетологов и продактов, обращение на «ты»" },
  { slug: "ai-grading", title: "Как проверять работы студентов с помощью ИИ", short: "Проверка работ с ИИ", note: "шесть уроков для преподавателей, обращение на «вы»" },
];

export const metadata = { title: "Мои курсы" };

export default async function TeachPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  // Профиль и курсы со счётчиками грузятся параллельно: id берём из JWT без похода за профилем.
  const userId = await requireUserId();
  const [user, sp, cards] = await Promise.all([requireUser(), searchParams, listCourseSummariesByOwner(userId)]);
  const courses = cards.map((c) => c.course);
  const demos = DEMO_COURSES.map((d) => ({ ...d, action: createDemoCourseAction.bind(null, d.slug) }));
  // Панель «С чего начать» живёт, пока не пройдены все шаги, и уходит по «Скрыть». «Как это работает» в шапке открывает её снова.
  const steps = teacherSteps(cards);
  const showStart = !allStepsDone(steps) && !(await cookies()).has(START_HIDDEN_COOKIE);

  return (
    <AppShell user={user}>
      <PageHeader
        title="Мои курсы"
        description={courses.length > 0 ? `${plural(courses.length, "курс", "курса", "курсов")}. Откройте курс, чтобы загрузить материалы, собрать уроки и посмотреть ответы.` : undefined}
        actions={<NewCourseDialog createAction={createCourseAction} demos={demos} error={sp.error} />}
      />
      {showStart ? (
        <section aria-labelledby="start-title" className="mt-8">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <h2 id="start-title" className="type-heading">С чего начать</h2>
            <form action={hideStartPanelAction} className="flex items-center gap-4 text-sm">
              <Link href="/teach/start" className="inline-flex min-h-11 items-center text-muted-foreground underline underline-offset-4 hover:text-foreground">Что увидит студент</Link>
              <Button type="submit" variant="ghost" size="lg" title="Вернуть панель можно через «Как это работает» в шапке">Скрыть</Button>
            </form>
          </div>
          <StartSteps steps={steps} className="mt-4" />
        </section>
      ) : null}
      <div className="mt-10">
        <section>
          {courses.length === 0 ? (
            <EmptyState
              title="Пока нет курсов"
              description="Нажмите «Создать курс»: название и пара слов о нём, материалы загрузите после. Если материалов нет, в том же окне есть готовый курс-пример."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cards.map(({ course: c, lessons, published, materials, students }) => {
                const ready = lessons > 0 && published === lessons;
                return (
                  <Link key={c.id} href={`/teach/${c.id}`} className="card-link group flex flex-col rounded-xl p-5 outline-none">
                    <StepMarks total={lessons} filled={published} size="sm" />
                    <h3 className="mt-4 text-balance type-heading group-hover:text-primary-strong">{c.title}</h3>
                    <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{c.description || "Без описания"}</p>
                    <dl className="mt-5 grid grid-cols-3 gap-3 border-t pt-4">
                      <div>
                        <dt className="type-caption text-muted-foreground">Уроков</dt>
                        <dd className={`mt-1 text-2xl font-semibold tracking-tight tabular-nums ${ready ? "text-primary-strong" : ""}`}>{published}<span className="text-muted-foreground">/{lessons}</span></dd>
                      </div>
                      <div>
                        <dt className="type-caption text-muted-foreground">Материалы</dt>
                        <dd className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{materials}</dd>
                      </div>
                      <div>
                        <dt className="type-caption text-muted-foreground">Студенты</dt>
                        <dd className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{students}</dd>
                      </div>
                    </dl>
                    <div className="mt-3 type-caption text-muted-foreground">
                      Код <span className="font-mono font-semibold tracking-wider text-foreground">{c.join_code}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
      <div className="mt-12 max-w-md">
        <DailyEmailCard user={user} next="/teach" />
      </div>
    </AppShell>
  );
}
