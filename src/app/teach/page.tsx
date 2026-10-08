import Link from "next/link";
import { requireUser, requireUserId } from "@/lib/auth/session";
import { listCourseSummariesByOwner } from "@/lib/db/queries";
import { createCourseAction } from "@/lib/actions/courses";
import { createDemoCourseAction } from "@/lib/actions/seed";
import { AppShell } from "@/components/shared/AppShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Notice } from "@/components/shared/Notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { plural } from "@/lib/utils/format";

/** Курсы-примеры из content/courses/<slug>.json. */
const DEMO_COURSES = [
  { slug: "critical-thinking-ai", title: "Критическое мышление в эпоху ИИ", short: "Критическое мышление", note: "пять уроков для маркетологов и продактов, обращение на «ты»" },
  { slug: "ai-grading", title: "Как проверять работы студентов с помощью ИИ", short: "Проверка работ с ИИ", note: "шесть уроков для преподавателей, обращение на «вы»" },
];

export default async function TeachPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  // Профиль и курсы со счётчиками грузятся параллельно: id берём из JWT без похода за профилем.
  const userId = await requireUserId();
  const [user, sp, cards] = await Promise.all([requireUser(), searchParams, listCourseSummariesByOwner(userId)]);
  const courses = cards.map((c) => c.course);

  return (
    <AppShell user={user}>
      <PageHeader title="Мои курсы" description={courses.length > 0 ? `${plural(courses.length, "курс", "курса", "курсов")}. Откройте курс, чтобы загрузить материалы, собрать уроки и посмотреть ответы.` : undefined} />
      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
        <section>
          {courses.length === 0 ? (
            <EmptyState
              title="Пока нет курсов"
              description="Создайте первый справа: название, пара слов о программе, а потом загрузите материалы. Или добавьте готовый курс-пример, чтобы посмотреть формат."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {cards.map(({ course: c, lessons, published, materials, students }) => {
                const ready = lessons > 0 && published === lessons;
                return (
                  <Link key={c.id} href={`/teach/${c.id}`} className="group block rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/40">
                    <Card className="h-full transition-colors group-hover:border-foreground/40">
                      <CardHeader>
                        <CardTitle className="text-balance">{c.title}</CardTitle>
                        <CardDescription className="line-clamp-3">{c.description || "Без описания"}</CardDescription>
                      </CardHeader>
                      <CardContent className="mt-auto">
                        <dl className="grid grid-cols-3 gap-3 border-t pt-4">
                          <div>
                            <dt className="type-caption text-muted-foreground">Материалы</dt>
                            <dd className="mt-0.5 font-semibold tabular-nums">{materials}</dd>
                          </div>
                          <div>
                            <dt className="type-caption text-muted-foreground">Опубликовано</dt>
                            <dd className={`mt-0.5 font-semibold tabular-nums ${ready ? "text-primary-strong" : ""}`}>{published}/{lessons}</dd>
                          </div>
                          <div>
                            <dt className="type-caption text-muted-foreground">Студенты</dt>
                            <dd className="mt-0.5 font-semibold tabular-nums">{students}</dd>
                          </div>
                        </dl>
                        <div className="mt-3 type-caption text-muted-foreground">
                          Код <span className="font-mono font-semibold tracking-wider text-foreground">{c.join_code}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Новый курс</CardTitle>
              <CardDescription>Потом загрузите материалы и соберёте уроки.</CardDescription>
            </CardHeader>
            <CardContent>
              {sp.error === "title" ? <Notice kind="error" className="mb-4">Нужно название.</Notice> : null}
              {sp.error === "seed" ? <Notice kind="error" className="mb-4">Файл курса-примера не найден.</Notice> : null}
              <form action={createCourseAction} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Название</Label>
                  <Input id="title" name="title" required placeholder="Критическое мышление в эпоху ИИ" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">О чём курс</Label>
                  <Textarea id="description" name="description" rows={3} placeholder="Чему научатся и зачем" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="audience">Аудитория</Label>
                  <Input id="audience" name="audience" placeholder="Маркетологи и продакты 25–40 лет" />
                </div>
                <Button type="submit" className="w-full">Создать курс</Button>
              </form>
            </CardContent>
          </Card>
          <Card size="sm" className="bg-surface">
            <CardHeader>
              <CardTitle>Готовые курсы для примера</CardTitle>
              <CardDescription>Методичка и уроки с задачами, уже опубликованы. Чтобы показать формат студентам и коллегам.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {DEMO_COURSES.map((d) => (
                <div key={d.slug} className="space-y-2">
                  <p className="text-sm">
                    <span className="font-medium">{d.title}</span>
                    <span className="text-muted-foreground">: {d.note}</span>
                  </p>
                  <form action={createDemoCourseAction.bind(null, d.slug)}>
                    <Button type="submit" variant="outline" size="sm" className="w-full">Добавить «{d.short}»</Button>
                  </form>
                </div>
              ))}
            </CardContent>
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}
