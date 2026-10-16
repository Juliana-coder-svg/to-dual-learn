import Link from "next/link";
import { teacherCourse, noCourseAccess } from "@/lib/auth/access";
import { countMaterials, listLessonBuilds, listLessons } from "@/lib/db/queries";
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
import { LessonsGenerator } from "@/components/teach/LessonsGenerator";
import { ReviewButton } from "@/components/teach/ReviewButton";
import { SectionHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmSubmitButton } from "@/components/teach/ConfirmSubmitButton";
import { formatDateTime, plural } from "@/lib/utils/format";

export default async function LessonsPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const [ctx, lessons, materialsCount, builds] = await Promise.all([teacherCourse(courseId), listLessons(courseId), countMaterials(courseId), listLessonBuilds(courseId)]);
  if (!ctx) return noCourseAccess(`/teach/${courseId}/lessons`);
  const hasMaterials = materialsCount > 0;
  const drafts = lessons.filter((l) => l.status === "draft").length;
  const published = lessons.length - drafts;
  const proposals = lessons.filter((l) => l.review?.proposal).length;
  const draftsWithProposal = lessons.filter((l) => l.status === "draft" && l.review?.proposal).length;

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
      <section className="min-w-0">
        <SectionHeader
          title="Уроки"
          description={
            lessons.length > 0
              ? `Опубликовано ${published} из ${plural(lessons.length, "урока", "уроков", "уроков")}. Студенты видят только опубликованные.`
              : "Короткие уроки по 5 минут. Студенты видят только опубликованные."
          }
          actions={
            <>
              {lessons.length > 0 && hasMaterials ? <ReviewButton courseId={courseId} /> : null}
              {drafts > 0 ? (
                <form action={publishAllAction.bind(null, courseId)}>
                  <ConfirmSubmitButton
                    size="sm"
                    message={draftsWithProposal > 0 ? `В ${plural(draftsWithProposal, "уроке", "уроках", "уроках")} из ${drafts} есть правки проверки, которые вы не приняли и не отклонили. Студенты увидят эти уроки без правок. Опубликовать все ${drafts}?` : undefined}
                  >
                    Опубликовать все ({drafts})
                  </ConfirmSubmitButton>
                </form>
              ) : null}
            </>
          }
        />
        {proposals > 0 ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary px-4 py-3 text-sm">
            <span>Проверка предлагает правки в {plural(proposals, "уроке", "уроках", "уроках")}. Под каждым уроком видно, что меняется и почему.</span>
            <div className="flex gap-2">
              <form action={decideAllProposalsAction.bind(null, courseId, "accepted")}><Button type="submit" size="sm">Принять все</Button></form>
              <form action={decideAllProposalsAction.bind(null, courseId, "rejected")}><Button type="submit" size="sm" variant="outline">Оставить всё как есть</Button></form>
            </div>
          </div>
        ) : null}
        {lessons.length === 0 ? (
          <EmptyState
            className="mt-6"
            title="Уроков пока нет"
            description={hasMaterials ? "Соберите первые уроки в блоке «Собрать уроки»: ИИ прочитает материалы и предложит последовательность." : "Сначала загрузите материалы на вкладке «Материалы», потом соберите уроки."}
            action={!hasMaterials ? <Button nativeButton={false} render={<Link href={`/teach/${courseId}`} />} variant="outline">К материалам</Button> : undefined}
          />
        ) : (
          <ol className="mt-6 space-y-3">
            {lessons.map((l, i) => (
              <li key={l.id} className="rounded-lg border p-4 md:p-5">
                <div className="grid gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="type-counter text-primary"><span className="sr-only">Урок </span>{String(l.position).padStart(2, "0")}</span>
                      <Badge variant={l.status === "published" ? "default" : "secondary"}>{l.status === "published" ? "Опубликован" : "Черновик"}</Badge>
                      <span
                        className="type-caption text-muted-foreground"
                        title={l.reviewed_at ? "Вы сохранили урок в редакторе. Студенты видят, что урок проверен." : "Урок собрал ИИ. Откройте «Править» и сохраните: тогда он отметится как проверенный, и студенты это увидят."}
                      >
                        {l.reviewed_at ? `Проверен ${formatDateTime(l.reviewed_at)}` : "Черновик ИИ, вы его ещё не правили"}
                      </span>
                    </div>
                    <h3 className="mt-3 type-heading">{l.title}</h3>
                    <p className="text-sm text-muted-foreground">{l.concept}</p>
                    {l.review && !l.review.proposal ? (
                      l.review.decision && l.review.flags.length > 0 ? (
                        // Решение принято: замечания прячем под раскрывашку, иначе «предлагаю…» читается как ещё не решённое.
                        <details className="mt-3 type-caption text-muted-foreground">
                          <summary className="cursor-pointer list-none">
                            {l.review.decision === "accepted" ? "Правки проверки приняты" : "Правки проверки отклонены, оставлен ваш текст"} · что предлагалось
                          </summary>
                          <ul className="mt-2 space-y-1">
                            {l.review.flags.map((f, j) => <li key={j} className="flex gap-2"><span aria-hidden className="font-semibold text-primary-strong">!</span><span>{f}</span></li>)}
                          </ul>
                        </details>
                      ) : l.review.flags.length > 0 ? (
                        <ul className="mt-3 space-y-1 type-caption text-muted-foreground">
                          {l.review.flags.map((f, j) => <li key={j} className="flex gap-2"><span aria-hidden className="font-semibold text-primary-strong">!</span><span>{f}</span></li>)}
                        </ul>
                      ) : (
                        <p className="mt-3 type-caption text-muted-foreground">
                          Проверка: замечаний нет{l.review.decision === "accepted" ? ", правки приняты" : l.review.decision === "rejected" ? ", правки отклонены" : l.review.changed ? ", текст подправлен" : ""}.
                        </p>
                      )
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-1 border-t pt-3">
                    <form action={moveLessonAction.bind(null, courseId, l.id, -1)}><Button type="submit" variant="ghost" size="icon-sm" disabled={i === 0} aria-label="Выше">↑</Button></form>
                    <form action={moveLessonAction.bind(null, courseId, l.id, 1)}><Button type="submit" variant="ghost" size="icon-sm" disabled={i === lessons.length - 1} aria-label="Ниже">↓</Button></form>
                    <Button nativeButton={false} render={<Link href={`/teach/${courseId}/lessons/${l.id}/edit`} />} variant="outline" size="sm">Править</Button>
                    <form action={setLessonStatusAction.bind(null, courseId, l.id, l.status === "published" ? "draft" : "published")}>
                      <ConfirmSubmitButton
                        variant={l.status === "published" ? "outline" : "secondary"}
                        size="sm"
                        message={l.status === "draft" && l.review?.proposal ? "У урока есть правки проверки, которые вы не приняли и не отклонили. Студенты увидят текст без них. Опубликовать?" : undefined}
                      >
                        {l.status === "published" ? "Снять с публикации" : "Опубликовать"}
                      </ConfirmSubmitButton>
                    </form>
                    <form action={deleteLessonAction.bind(null, courseId, l.id)}>
                      <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">Удалить</Button>
                    </form>
                  </div>
                </div>
                {l.review?.proposal ? (
                  <div className="mt-4 rounded-lg border border-primary p-4 text-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold">Проверка предлагает правки</div>
                        {l.status === "published" ? <p className="mt-1 type-caption text-muted-foreground">Урок уже открыт студентам: принятая правка сразу изменит задачу и критерии у них.</p> : <p className="mt-1 type-caption text-muted-foreground">Пока правки не приняты и не отклонены, при публикации студенты увидят текст без них.</p>}
                        {l.review.flags.length > 0 ? (
                          <ul className="mt-2 space-y-1 type-caption text-muted-foreground">
                            {l.review.flags.map((f, j) => <li key={j} className="flex gap-2"><span aria-hidden className="font-semibold text-primary-strong">!</span><span>{f}</span></li>)}
                          </ul>
                        ) : null}
                      </div>
                      <div className="flex gap-2">
                        <form action={acceptProposalAction.bind(null, courseId, l.id)}><Button type="submit" size="sm">Принять</Button></form>
                        <form action={rejectProposalAction.bind(null, courseId, l.id)}><Button type="submit" size="sm" variant="outline">Оставить как есть</Button></form>
                      </div>
                    </div>
                    <dl className="mt-4 grid gap-4">
                      {lessonContentChanges(l.content, l.review.proposal).map((c) => (
                        <div key={c.key}>
                          <dt className="eyebrow">{c.label}</dt>
                          <dd className="mt-1 grid gap-2 sm:grid-cols-2">
                            <div className="whitespace-pre-wrap rounded-lg bg-surface p-3 text-muted-foreground"><span className="eyebrow">Сейчас</span><br />{c.before || "—"}</div>
                            <div className="whitespace-pre-wrap rounded-lg border border-primary p-3"><span className="eyebrow">Предлагается</span><br />{c.after || "—"}</div>
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ) : null}
                <details className="group mt-3 text-sm">
                  <summary className="inline-flex min-h-8 cursor-pointer list-none items-center gap-1 text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
                    <span aria-hidden className="transition-transform group-open:rotate-90">›</span> Содержимое урока
                  </summary>
                  <dl className="mt-3 grid gap-3 rounded-lg bg-surface p-4 type-body">
                    <div><dt className="eyebrow">Зачем</dt><dd className="mt-1">{l.content.intro}</dd></div>
                    <div><dt className="eyebrow">Идея урока</dt><dd className="mt-1">{l.content.keyIdea}</dd></div>
                    <div><dt className="eyebrow">Признаки</dt><dd><ul className="mt-1 list-disc pl-5">{l.content.signals.map((s, j) => <li key={j}>{s}</li>)}</ul></dd></div>
                    <div><dt className="eyebrow">Задача</dt><dd className="mt-1">{l.content.task}</dd></div>
                    {l.content.sample ? <div><dt className="eyebrow">Данные к задаче</dt><dd><blockquote className="mt-1 whitespace-pre-wrap border-l-2 pl-3 text-muted-foreground">{l.content.sample}</blockquote></dd></div> : null}
                    <div><dt className="eyebrow">Критерии</dt><dd><ul className="mt-1 list-disc pl-5">{l.content.rubricCriteria.map((s, j) => <li key={j}>{s}</li>)}</ul></dd></div>
                    <div><dt className="eyebrow">Вывод</dt><dd className="mt-1">{l.content.keyTakeaway}</dd></div>
                    <div><dt className="eyebrow">Карточки для повторения</dt><dd><ul className="mt-1 list-disc pl-5">{l.content.flashcards.map((f, j) => <li key={j}>{f.question} <span className="text-muted-foreground">· {f.answer}</span></li>)}</ul></dd></div>
                  </dl>
                </details>
              </li>
            ))}
          </ol>
        )}
      </section>
      <aside className="min-w-0">
        <LessonsGenerator courseId={courseId} disabled={!hasMaterials} builds={builds} />
      </aside>
    </div>
  );
}
