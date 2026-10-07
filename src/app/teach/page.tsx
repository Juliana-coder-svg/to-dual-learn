import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { listCoursesByOwner, listLessons, listMaterials, listStudentsWithStats } from "@/lib/db/queries";
import { createCourseAction } from "@/lib/actions/courses";
import { createDemoCourseAction } from "@/lib/actions/seed";
import { AppShell } from "@/components/shared/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { plural } from "@/lib/utils/format";

export default async function TeachPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const courses = await listCoursesByOwner(user.id);
  const cards = await Promise.all(
    courses.map(async (c) => {
      const [lessons, materials, students] = await Promise.all([await listLessons(c.id), await listMaterials(c.id), await listStudentsWithStats(c.id)]);
      return { course: c, lessons, published: lessons.filter((l) => l.status === "published").length, materials: materials.length, students: students.length };
    }),
  );

  return (
    <AppShell user={user}>
      <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
        <section>
          <h1 className="text-2xl font-semibold tracking-tight">Мои курсы</h1>
          {courses.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Пока нет курсов. Создай первый справа, потом загрузишь материалы.</p>
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
                        {plural(materials, "материал", "материала", "материалов")} · {published}/{lessons.length} уроков опубликовано · {plural(students, "студент", "студента", "студентов")}
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
              <CardDescription>Потом загрузишь материалы и соберешь уроки.</CardDescription>
            </CardHeader>
            <CardContent>
              {sp.error === "title" ? <p className="mb-3 text-sm text-destructive">Нужно название.</p> : null}
              {sp.error === "seed" ? <p className="mb-3 text-sm text-destructive">Файл демо-курса не найден.</p> : null}
              <form action={createCourseAction} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Название</Label>
                  <Input id="title" name="title" required placeholder="Критическое мышление в эпоху AI" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">О чем курс</Label>
                  <Textarea id="description" name="description" rows={3} placeholder="Чему научатся и зачем" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="audience">Аудитория</Label>
                  <Input id="audience" name="audience" placeholder="Маркетологи и продакты 25-40 лет" />
                </div>
                <Button type="submit" className="w-full">Создать</Button>
              </form>
            </CardContent>
          </Card>
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Готовый демо-курс</CardTitle>
              <CardDescription>Курс «Критическое мышление в эпоху AI» с методичкой и пятью уроками, уроки сразу опубликованы. Подходит для показа и как образец формата.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createDemoCourseAction.bind(null, "critical-thinking-ai")}>
                <Button type="submit" variant="outline" className="w-full">Добавить демо-курс</Button>
              </form>
            </CardContent>
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}
