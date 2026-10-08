import Link from "next/link";
import { requireUser, requireUserId } from "@/lib/auth/session";
import { listCourseSummariesByOwner } from "@/lib/db/queries";
import { createCourseAction } from "@/lib/actions/courses";
import { createDemoCourseAction } from "@/lib/actions/seed";
import { AppShell } from "@/components/shared/AppShell";
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
      <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
        <section>
          <h1 className="text-2xl font-semibold tracking-tight">Мои курсы</h1>
          {courses.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Пока нет курсов. Создайте первый справа: название, пара слов о программе, а потом загрузите материалы.</p>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {cards.map(({ course: c, lessons, published, materials, students }) => {
                return (
                  <Link key={c.id} href={`/teach/${c.id}`} className="block">
                    <Card className="h-full transition-colors hover:border-primary">
                      <CardHeader>
                        <CardTitle>{c.title}</CardTitle>
                        <CardDescription>{c.description || "Без описания"}</CardDescription>
                      </CardHeader>
                      <CardContent className="text-sm text-muted-foreground">
                        {plural(materials, "материал", "материала", "материалов")} · {published}/{lessons} уроков опубликовано · {plural(students, "студент", "студента", "студентов")}
                        <div className="mt-2 font-mono text-xs">Код: {c.join_code}</div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
        <aside>
          <Card>
            <CardHeader>
              <CardTitle>Новый курс</CardTitle>
              <CardDescription>Потом загрузите материалы и соберёте уроки.</CardDescription>
            </CardHeader>
            <CardContent>
              {sp.error === "title" ? <p className="mb-3 text-sm text-destructive">Нужно название.</p> : null}
              {sp.error === "seed" ? <p className="mb-3 text-sm text-destructive">Файл курса-примера не найден.</p> : null}
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
                <Button type="submit" className="w-full">Создать</Button>
              </form>
            </CardContent>
          </Card>
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Готовые курсы для примера</CardTitle>
              <CardDescription>Методичка и уроки с задачами, сразу опубликованы. Для показа и как образец формата.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {DEMO_COURSES.map((d) => (
                <div key={d.slug} className="space-y-2">
                  <p className="text-sm">
                    <span className="font-medium">{d.title}</span>
                    <span className="text-muted-foreground"> — {d.note}</span>
                  </p>
                  <form action={createDemoCourseAction.bind(null, d.slug)}>
                    <Button type="submit" variant="outline" className="w-full">Добавить «{d.short}»</Button>
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
