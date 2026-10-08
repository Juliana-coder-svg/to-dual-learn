import Link from "next/link";
import { notFound } from "next/navigation";
import { teacherCourse } from "@/lib/auth/access";
import { listLessons, listMaterials } from "@/lib/db/queries";
import { deleteLessonAction, moveLessonAction, publishAllAction, setLessonStatusAction } from "@/lib/actions/courses";
import { LessonsGenerator } from "@/components/teach/LessonsGenerator";
import { ReviewButton } from "@/components/teach/ReviewButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AiNote } from "@/components/shared/AiNote";
import { formatDateTime } from "@/lib/utils/format";

export default async function LessonsPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const ctx = await teacherCourse(courseId);
  if (!ctx) notFound();
  const lessons = await listLessons(courseId);
  const hasMaterials = (await listMaterials(courseId)).length > 0;
  const drafts = lessons.filter((l) => l.status === "draft").length;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <section>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Уроки</h2>
            <p className="mt-1 text-sm text-muted-foreground">Короткие уроки по 5 минут. Студенты видят только опубликованные.</p>
          </div>
          <div className="flex gap-2">
            {lessons.length > 0 && hasMaterials ? <ReviewButton courseId={courseId} /> : null}
            {drafts > 0 ? (
              <form action={publishAllAction.bind(null, courseId)}>
                <Button type="submit" size="sm">Опубликовать все ({drafts})</Button>
              </form>
            ) : null}
          </div>
        </div>
        {lessons.length === 0 ? (
          <p className="mt-6 rounded-md border border-dashed p-6 text-sm text-muted-foreground">
            Уроков пока нет. {hasMaterials ? "Соберите первые уроки справа." : "Сначала загрузите материалы на вкладке «Материалы»."}
          </p>
        ) : (
          <ol className="mt-6 space-y-3">
            {lessons.map((l, i) => (
              <li key={l.id} className="rounded-md border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">Урок {l.position}</div>
                    <div className="font-medium">{l.title}</div>
                    <div className="text-sm text-muted-foreground">{l.concept}</div>
                    {l.reviewed_at ? null : <AiNote kind="teacherDraft" className="mt-1" />}
                    {l.review ? (
                      l.review.flags.length > 0 ? (
                        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                          {l.review.flags.map((f, j) => <li key={j} className="flex gap-2"><span className="text-primary">!</span><span>{f}</span></li>)}
                        </ul>
                      ) : (
                        <div className="mt-2 text-xs text-muted-foreground">Методист: замечаний нет{l.review.changed ? ", текст подправлен" : ""}.</div>
                      )
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    <Badge variant={l.status === "published" ? "default" : "secondary"}>{l.status === "published" ? "Опубликован" : "Черновик"}</Badge>
                    <Badge variant="outline" title={l.reviewed_at ? "Вы сохранили урок в редакторе. Студенты видят, что урок проверен." : "Урок собрала модель. Чтобы отметить его проверенным, нажмите «Править» и сохраните."}>{l.reviewed_at ? `Проверен ${formatDateTime(l.reviewed_at)}` : "Не проверен"}</Badge>
                    <form action={moveLessonAction.bind(null, courseId, l.id, -1)}><Button type="submit" variant="ghost" size="sm" disabled={i === 0} aria-label="Выше">↑</Button></form>
                    <form action={moveLessonAction.bind(null, courseId, l.id, 1)}><Button type="submit" variant="ghost" size="sm" disabled={i === lessons.length - 1} aria-label="Ниже">↓</Button></form>
                    <Button nativeButton={false} render={<Link href={`/teach/${courseId}/lessons/${l.id}/edit`} />} variant="outline" size="sm">Править</Button>
                    <form action={setLessonStatusAction.bind(null, courseId, l.id, l.status === "published" ? "draft" : "published")}>
                      <Button type="submit" variant="outline" size="sm">{l.status === "published" ? "Снять с публикации" : "Опубликовать"}</Button>
                    </form>
                    <form action={deleteLessonAction.bind(null, courseId, l.id)}>
                      <Button type="submit" variant="ghost" size="sm">Удалить</Button>
                    </form>
                  </div>
                </div>
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer text-muted-foreground">Содержимое урока</summary>
                  <div className="mt-3 space-y-3">
                    <p><span className="font-medium">Зачем:</span> {l.content.intro}</p>
                    <p><span className="font-medium">Ключевая идея:</span> {l.content.keyIdea}</p>
                    <div><span className="font-medium">Признаки:</span><ul className="mt-1 list-disc pl-5">{l.content.signals.map((s, j) => <li key={j}>{s}</li>)}</ul></div>
                    <p><span className="font-medium">Задача:</span> {l.content.task}</p>
                    {l.content.sample ? <blockquote className="whitespace-pre-wrap border-l-2 pl-3 text-muted-foreground">{l.content.sample}</blockquote> : null}
                    <div><span className="font-medium">Критерии:</span><ul className="mt-1 list-disc pl-5">{l.content.rubricCriteria.map((s, j) => <li key={j}>{s}</li>)}</ul></div>
                    <p><span className="font-medium">Вывод:</span> {l.content.keyTakeaway}</p>
                    <div><span className="font-medium">Карточки для повторения:</span><ul className="mt-1 list-disc pl-5">{l.content.flashcards.map((f, j) => <li key={j}>{f.question} — <span className="text-muted-foreground">{f.answer}</span></li>)}</ul></div>
                  </div>
                </details>
              </li>
            ))}
          </ol>
        )}
      </section>
      <aside>
        <LessonsGenerator courseId={courseId} disabled={!hasMaterials} />
      </aside>
    </div>
  );
}
