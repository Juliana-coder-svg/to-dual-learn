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
import { Notice } from "@/components/shared/Notice";
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

const SELECT = "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40";
const TILE = "flex cursor-pointer items-center gap-3 rounded-lg border border-input px-3 py-2.5 text-sm transition-colors hover:border-foreground/40 has-[:checked]:border-primary has-[:checked]:bg-primary-soft";

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
  const totalRub = usage.reduce((s, u) => s + usdToRub(u.cost_usd), 0);

  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Курс</CardTitle>
          <CardDescription>ИИ учитывает образовательные результаты и обращение везде: когда собирает уроки, проверяет их и оценивает ответы.</CardDescription>
        </CardHeader>
        <CardContent>
          {sp.saved ? <Notice kind="success" className="mb-4">Сохранено.</Notice> : null}
          {sp.error === "title" ? <Notice kind="error" className="mb-4">Нужно название.</Notice> : null}
          <form action={updateCourseSettingsAction.bind(null, courseId)} className="space-y-5">
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
                <label className={TILE}><input type="radio" name="tone" value="ty" defaultChecked={course.tone === "ty"} /> На «ты»</label>
                <label className={TILE}><input type="radio" name="tone" value="vy" defaultChecked={course.tone === "vy"} /> На «вы»</label>
              </div>
            </fieldset>
            <div className="space-y-2">
              <Label htmlFor="daily_limit">Новых уроков в день</Label>
              <select id="daily_limit" name="daily_limit" defaultValue={course.daily_limit} className={SELECT}>
                <option value={0}>Без лимита</option>
                {[1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <p className="type-caption text-muted-foreground">Один в день держит интервал повторения. Без лимита студент может пройти всё за вечер.</p>
            </div>
            <Button type="submit">Сохранить</Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Приглашение</CardTitle>
            <CardDescription>Ссылка ведёт на вход и сразу записывает на курс.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm">
              <div className="flex items-center justify-between gap-3 rounded-lg bg-surface px-3 py-2">
                <dt className="text-muted-foreground">Код курса</dt>
                <dd className="font-mono text-base font-semibold tracking-widest">{course.join_code}</dd>
              </div>
              <div className="rounded-lg bg-surface px-3 py-2">
                <dt className="text-muted-foreground">Ссылка</dt>
                <dd className="mt-0.5 break-all font-mono type-caption">{site}/join/{course.join_code}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Образцы оценок</CardTitle>
            <CardDescription>Покажите наставнику, что для вас «5» и что «2». ИИ сверяется с образцами, когда оценивает ответы.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {sp.error === "sample" ? <Notice kind="error">Нужен ответ длиннее 10 символов и балл от 1 до 5.</Notice> : null}
            {samples.length > 0 ? (
              <ul className="divide-y rounded-lg border">
                {samples.map((s) => (
                  <li key={s.id} className="p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2"><Badge>{s.score}/5</Badge><span className="type-caption text-muted-foreground">{s.lesson_id ? lessons.find((l) => l.id === s.lesson_id)?.title ?? "Урок удалён" : "Весь курс"}</span></div>
                      <form action={deleteCalibrationSampleAction.bind(null, courseId, s.id)}><Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">Удалить</Button></form>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap">{s.answer}</p>
                    {s.comment ? <p className="mt-1 text-muted-foreground">{s.comment}</p> : null}
                  </li>
                ))}
              </ul>
            ) : null}
            <form action={addCalibrationSampleAction.bind(null, courseId)} className="space-y-3">
              <div className="grid grid-cols-[1fr_96px] gap-2">
                <select name="lessonId" defaultValue="" aria-label="Урок" className={SELECT}>
                  <option value="">Весь курс</option>
                  {lessons.map((l) => <option key={l.id} value={l.id}>Урок {l.position}: {l.title}</option>)}
                </select>
                <select name="score" defaultValue="4" aria-label="Балл" className={SELECT}>
                  {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}/5</option>)}
                </select>
              </div>
              <Textarea name="answer" rows={3} required placeholder="Ответ студента-образец" aria-label="Ответ-образец" />
              <Input name="comment" placeholder="Почему такой балл (необязательно)" aria-label="Комментарий к баллу" />
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
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead><tr><th>Операция</th><th className="text-right">Запросов</th><th className="text-right">Токены, тыс.</th><th className="pr-0 text-right">Рубли</th></tr></thead>
                  <tbody>{usage.map((u) => (
                    <tr key={u.kind}>
                      <td>{KIND_LABELS[u.kind] ?? u.kind}</td>
                      <td className="text-right">{u.calls}</td>
                      <td className="text-right text-muted-foreground">{Math.round(u.input_tokens / 1000)} / {Math.round(u.output_tokens / 1000)}</td>
                      <td className="pr-0 text-right" title={`$${u.cost_usd.toFixed(3)}`}>{formatRub(usdToRub(u.cost_usd))}</td>
                    </tr>
                  ))}</tbody>
                  <tfoot><tr><td className="border-b-0 pt-3 font-medium" colSpan={3}>Всего</td><td className="border-b-0 pr-0 pt-3 text-right font-semibold">{formatRub(totalRub)}</td></tr></tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
