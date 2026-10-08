import { notFound } from "next/navigation";
import { teacherCourse } from "@/lib/auth/access";
import { courseUsageByKind, listCalibrationSamples, listLessonSummaries } from "@/lib/db/queries";
import { addCalibrationSampleAction, deleteCalibrationSampleAction, updateCourseSettingsAction } from "@/lib/actions/courses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatRub, usdRubRate, usdToRub } from "@/lib/utils/money";

const KIND_LABELS: Record<string, string> = {
  extract: "Чтение PDF",
  lessons: "Сборка уроков",
  review: "Проверка уроков методистом",
  artifact: "Материалы для занятий",
  evaluate: "Оценка ответов",
  homework: "Проверка работ",
  chat: "Вопросы по материалам",
};

export default async function SettingsPage({ params, searchParams }: { params: Promise<{ courseId: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const { courseId } = await params;
  const [sp, ctx, lessons, samples, usage] = await Promise.all([
    searchParams,
    teacherCourse(courseId),
    listLessonSummaries(courseId),
    listCalibrationSamples(courseId),
    courseUsageByKind(courseId),
  ]);
  if (!ctx) notFound();
  const { course } = ctx;
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Курс</CardTitle>
          <CardDescription>ИИ учитывает образовательные результаты и обращение везде: когда собирает уроки, проверяет их и оценивает ответы.</CardDescription>
        </CardHeader>
        <CardContent>
          {sp.saved ? <p className="mb-3 text-sm text-primary">Сохранено.</p> : null}
          {sp.error === "title" ? <p className="mb-3 text-sm text-destructive">Нужно название.</p> : null}
          <form action={updateCourseSettingsAction.bind(null, courseId)} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="title">Название</Label><Input id="title" name="title" defaultValue={course.title} required /></div>
            <div className="space-y-2"><Label htmlFor="description">О чём курс</Label><Textarea id="description" name="description" rows={2} defaultValue={course.description} /></div>
            <div className="space-y-2"><Label htmlFor="audience">Аудитория</Label><Input id="audience" name="audience" defaultValue={course.audience} /></div>
            <div className="space-y-2">
              <Label htmlFor="outcomes">Образовательные результаты</Label>
              <Textarea id="outcomes" name="outcomes" rows={5} defaultValue={course.outcomes} placeholder={"По одному на строку, например:\nОтличает проверяемое утверждение от мнения\nНаходит первоисточник за 2 минуты"} />
            </div>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Обращение к студенту</legend>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm has-[:checked]:border-primary"><input type="radio" name="tone" value="ty" defaultChecked={course.tone === "ty"} /> На «ты»</label>
                <label className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm has-[:checked]:border-primary"><input type="radio" name="tone" value="vy" defaultChecked={course.tone === "vy"} /> На «вы»</label>
              </div>
            </fieldset>
            <div className="space-y-2">
              <Label htmlFor="daily_limit">Новых уроков в день</Label>
              <select id="daily_limit" name="daily_limit" defaultValue={course.daily_limit} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                <option value={0}>Без лимита</option>
                {[1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <p className="text-xs text-muted-foreground">Один в день держит интервал повторения. Без лимита студент может пройти всё за вечер.</p>
            </div>
            <Button type="submit">Сохранить</Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Приглашение</CardTitle>
            <CardDescription>Ссылка ведёт на вход и сразу записывает на курс.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>Код: <span className="font-mono font-semibold">{course.join_code}</span></div>
            <div className="break-all font-mono text-xs">{site}/join/{course.join_code}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Образцы оценок</CardTitle>
            <CardDescription>Покажите наставнику, что для вас «5» и что «2». ИИ сверяется с образцами, когда оценивает ответы.</CardDescription>
          </CardHeader>
          <CardContent>
            {sp.error === "sample" ? <p className="mb-3 text-sm text-destructive">Нужен ответ длиннее 10 символов и балл от 1 до 5.</p> : null}
            {samples.length > 0 ? (
              <ul className="mb-4 space-y-2">
                {samples.map((s) => (
                  <li key={s.id} className="rounded-md border p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2"><Badge>{s.score}/5</Badge><span className="text-xs text-muted-foreground">{s.lesson_id ? lessons.find((l) => l.id === s.lesson_id)?.title ?? "Урок удалён" : "Весь курс"}</span></div>
                      <form action={deleteCalibrationSampleAction.bind(null, courseId, s.id)}><Button type="submit" variant="ghost" size="sm">Удалить</Button></form>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap">{s.answer}</p>
                    {s.comment ? <p className="mt-1 text-muted-foreground">{s.comment}</p> : null}
                  </li>
                ))}
              </ul>
            ) : null}
            <form action={addCalibrationSampleAction.bind(null, courseId)} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <select name="lessonId" defaultValue="" className="h-9 rounded-md border bg-background px-3 text-sm">
                  <option value="">Весь курс</option>
                  {lessons.map((l) => <option key={l.id} value={l.id}>Урок {l.position}: {l.title}</option>)}
                </select>
                <select name="score" defaultValue="4" className="h-9 rounded-md border bg-background px-3 text-sm">
                  {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}/5</option>)}
                </select>
              </div>
              <Textarea name="answer" rows={3} required placeholder="Ответ студента-образец" />
              <Input name="comment" placeholder="Почему такой балл (необязательно)" />
              <Button type="submit" variant="outline">Добавить образец</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Расход по курсу</CardTitle>
            <CardDescription>Оценка в рублях по курсу {usdRubRate()} ₽ за доллар (переменная USD_RUB_RATE). Точная сумма: в кабинете поставщика модели.</CardDescription>
          </CardHeader>
          <CardContent>
            {usage.length === 0 ? <p className="text-sm text-muted-foreground">Запросов к ИИ пока не было.</p> : (
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground"><tr className="border-b"><th className="py-1 font-medium">Операция</th><th className="py-1 font-medium">Запросов</th><th className="py-1 font-medium">Токены, тыс. (вход / выход)</th><th className="py-1 text-right font-medium">Рубли</th></tr></thead>
                <tbody>{usage.map((u) => (
                  <tr key={u.kind} className="border-b"><td className="py-1">{KIND_LABELS[u.kind] ?? u.kind}</td><td className="py-1">{u.calls}</td><td className="py-1">{Math.round(u.input_tokens / 1000)}k / {Math.round(u.output_tokens / 1000)}k</td><td className="py-1 text-right" title={`$${u.cost_usd.toFixed(3)}`}>{formatRub(usdToRub(u.cost_usd))}</td></tr>
                ))}</tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
