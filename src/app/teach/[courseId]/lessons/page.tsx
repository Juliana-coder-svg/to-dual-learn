import { notFound } from "next/navigation";
import { teacherCourse } from "@/lib/auth/access";
import { listLessons, listMaterials } from "@/lib/db/queries";
import { deleteLessonAction, publishAllAction, setLessonStatusAction } from "@/lib/actions/courses";
import { LessonsGenerator } from "@/components/teach/LessonsGenerator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function LessonsPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const ctx = await teacherCourse(courseId);
  if (!ctx) notFound();
  const lessons = listLessons(courseId);
  const hasMaterials = listMaterials(courseId).length > 0;
  const drafts = lessons.filter((l) => l.status === "draft").length;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <section>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Уроки</h2>
            <p className="mt-1 text-sm text-muted-foreground">Микроуроки по 5 минут. Студенты видят только опубликованные, по одному в день.</p>
          </div>
          {drafts > 0 ? (
            <form action={publishAllAction.bind(null, courseId)}>
              <Button type="submit" size="sm">Опубликовать все ({drafts})</Button>
            </form>
          ) : null}
        </div>
        {lessons.length === 0 ? (
          <p className="mt-6 rounded-md border border-dashed p-6 text-sm text-muted-foreground">
            Уроков пока нет. {hasMaterials ? "Собери первые уроки справа." : "Сначала загрузи материалы на вкладке «Материалы»."}
          </p>
        ) : (
          <ol className="mt-6 space-y-3">
            {lessons.map((l) => (
              <li key={l.id} className="rounded-md border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Урок {l.position}</div>
                    <div className="font-medium">{l.title}</div>
                    <div className="text-sm text-muted-foreground">{l.concept}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={l.status === "published" ? "default" : "secondary"}>{l.status === "published" ? "Опубликован" : "Черновик"}</Badge>
                    <form action={setLessonStatusAction.bind(null, courseId, l.id, l.status === "published" ? "draft" : "published")}>
                      <Button type="submit" variant="outline" size="sm">{l.status === "published" ? "Снять" : "Опубликовать"}</Button>
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
                    <div><span className="font-medium">Признаки:</span><ul className="mt-1 list-disc pl-5">{l.content.signals.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
                    <p><span className="font-medium">Задача:</span> {l.content.task}</p>
                    {l.content.sample ? <blockquote className="border-l-2 pl-3 text-muted-foreground">{l.content.sample}</blockquote> : null}
                    <div><span className="font-medium">Критерии:</span><ul className="mt-1 list-disc pl-5">{l.content.rubricCriteria.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
                    <p><span className="font-medium">Вывод:</span> {l.content.keyTakeaway}</p>
                    <p><span className="font-medium">Флешкарта:</span> {l.content.flashcardQuestion} — <span className="text-muted-foreground">{l.content.flashcardAnswer}</span></p>
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
