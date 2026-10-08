import Link from "next/link";
import { notFound } from "next/navigation";
import { teacherCourse } from "@/lib/auth/access";
import { countMaterials, listLessons } from "@/lib/db/queries";
import {
  acceptProposalAction,
  decideAllProposalsAction,
  deleteLessonAction,
  moveLessonAction,
  publishAllAction,
  rejectProposalAction,
  setLessonStatusAction,
} from "@/lib/actions/courses";
import { lessonContentChanges } from "@/lib/lessons/diff";
import { plural } from "@/lib/utils/format";
import { LessonsGenerator } from "@/components/teach/LessonsGenerator";
import { ReviewButton } from "@/components/teach/ReviewButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function LessonsPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const [ctx, lessons, materialsCount] = await Promise.all([teacherCourse(courseId), listLessons(courseId), countMaterials(courseId)]);
  if (!ctx) notFound();
  const hasMaterials = materialsCount > 0;
  const drafts = lessons.filter((l) => l.status === "draft").length;
  const proposals = lessons.filter((l) => l.review?.proposal).length;

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
        {proposals > 0 ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-primary/40 p-3 text-sm">
            <span>Методист предлагает правки в {plural(proposals, "уроке", "уроках", "уроках")}. Посмотрите под каждым уроком, что меняется и почему.</span>
            <div className="flex gap-2">
              <form action={decideAllProposalsAction.bind(null, courseId, "accepted")}><Button type="submit" size="sm">Принять все</Button></form>
              <form action={decideAllProposalsAction.bind(null, courseId, "rejected")}><Button type="submit" size="sm" variant="outline">Оставить всё как есть</Button></form>
            </div>
          </div>
        ) : null}
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
                    {l.review && !l.review.proposal ? (
                      l.review.flags.length > 0 ? (
                        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                          {l.review.flags.map((f, j) => <li key={j} className="flex gap-2"><span className="text-primary">!</span><span>{f}</span></li>)}
                          {l.review.decision ? <li>{l.review.decision === "accepted" ? "Правки методиста приняты." : "Правки методиста отклонены, оставлен ваш текст."}</li> : null}
                        </ul>
                      ) : (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Методист: замечаний нет{l.review.decision === "accepted" ? ", правки приняты" : l.review.decision === "rejected" ? ", правки отклонены" : l.review.changed ? ", текст подправлен при сборке" : ""}.
                        </div>
                      )
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    <Badge variant={l.status === "published" ? "default" : "secondary"}>{l.status === "published" ? "Опубликован" : "Черновик"}</Badge>
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
                {l.review?.proposal ? (
                  <div className="mt-3 rounded-md border border-primary/40 p-3 text-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">Методист предлагает правки</div>
                        {l.review.flags.length > 0 ? (
                          <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                            {l.review.flags.map((f, j) => <li key={j} className="flex gap-2"><span className="text-primary">!</span><span>{f}</span></li>)}
                          </ul>
                        ) : null}
                      </div>
                      <div className="flex gap-2">
                        <form action={acceptProposalAction.bind(null, courseId, l.id)}><Button type="submit" size="sm">Принять</Button></form>
                        <form action={rejectProposalAction.bind(null, courseId, l.id)}><Button type="submit" size="sm" variant="outline">Оставить как есть</Button></form>
                      </div>
                    </div>
                    <dl className="mt-3 space-y-3">
                      {lessonContentChanges(l.content, l.review.proposal).map((c) => (
                        <div key={c.key}>
                          <dt className="font-medium">{c.label}</dt>
                          <dd className="mt-1 grid gap-2 sm:grid-cols-2">
                            <div className="whitespace-pre-wrap rounded-md bg-muted p-2 text-muted-foreground"><span className="text-xs uppercase">Сейчас</span><br />{c.before || "—"}</div>
                            <div className="whitespace-pre-wrap rounded-md border border-primary/40 p-2"><span className="text-xs uppercase">Предлагается</span><br />{c.after || "—"}</div>
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ) : null}
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
