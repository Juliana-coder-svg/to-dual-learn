import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { listCoursesByOwner, listLessons, listMaterials, listStudentsWithStats } from "@/lib/db/queries";
import { createCourseAction } from "@/lib/actions/courses";
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
  const courses = listCoursesByOwner(user.id);

  return (
    <AppShell user={user}>
      <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
        <section>
          <h1 className="text-2xl font-semibold tracking-tight">Мои курсы</h1>
          {courses.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Пока нет курсов. Создай первый справа: название, пара слов о программе, и дальше загрузишь материалы.</p>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {courses.map((c) => {
                const lessons = listLessons(c.id);
                const published = lessons.filter((l) => l.status === "published").length;
                return (
                  <Link key={c.id} href={`/teach/${c.id}`} className="block">
                    <Card className="h-full transition-colors hover:border-primary">
                      <CardHeader>
                        <CardTitle>{c.title}</CardTitle>
                        <CardDescription>{c.description || "Без описания"}</CardDescription>
                      </CardHeader>
                      <CardContent className="text-sm text-muted-foreground">
                        {plural(listMaterials(c.id).length, "материал", "материала", "материалов")} · {published}/{lessons.length} уроков опубликовано · {plural(listStudentsWithStats(c.id).length, "студент", "студента", "студентов")}
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
              <CardDescription>Потом загрузишь материалы и соберёшь уроки.</CardDescription>
            </CardHeader>
            <CardContent>
              {sp.error ? <p className="mb-3 text-sm text-destructive">Нужно название.</p> : null}
              <form action={createCourseAction} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Название</Label>
                  <Input id="title" name="title" required placeholder="Критическое мышление в эпоху AI" />
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
        </aside>
      </div>
    </AppShell>
  );
}
