import { notFound } from "next/navigation";
import { teacherCourse, noCourseAccess } from "@/lib/auth/access";
import { listCalibrationSamples, listFlashcardSignals, listLessonAnswersForSignals, listLessons } from "@/lib/db/queries";
import { computeSignals, SIGNAL_LABELS, THRESHOLDS } from "@/lib/learning/signals";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Notice } from "@/components/shared/Notice";

/** Прототип, часть 1: сигналы без модели в простой таблице. За флагом CONCEPT_SIGNALS=1. */
export default async function SignalsPage({ params }: { params: Promise<{ courseId: string }> }) {
  if (process.env.CONCEPT_SIGNALS !== "1") notFound();
  const { courseId } = await params;
  const [ctx, lessons, answers, calibration, flashcards] = await Promise.all([
    teacherCourse(courseId),
    listLessons(courseId, { publishedOnly: true }),
    listLessonAnswersForSignals(courseId),
    listCalibrationSamples(courseId),
    listFlashcardSignals(courseId).catch((e: unknown) => {
      if (String(e).includes("not a course owner")) return [];
      throw e;
    }),
  ]);
  if (!ctx) return noCourseAccess(`/teach/${courseId}/signals`);

  const r = computeSignals({
    lessons: lessons.map((l) => ({ id: l.id, position: l.position, title: l.title, rubricCriteria: l.content.rubricCriteria })),
    answers,
    flashcards,
    calibration: calibration.map((c) => ({ lesson_id: c.lesson_id, answer: c.answer, score: c.score })),
    excludeUserIds: [ctx.course.owner_id],
  });
  const total = r.lessons.reduce((s, l) => s + l.submitters, 0);

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Сигналы"
        description="Где ответы группы повторяют одну и ту же ошибку. Считается кодом по первым ответам студентов, модель не вызывается. Прототип: пороги пересматриваем по данным пилота."
      />
      {total === 0 ? (
        <EmptyState title="Ответов пока нет" description="Сигналы появятся, когда студенты сдадут первые уроки." />
      ) : (
        <>
          {!r.enoughData ? (
            <Notice>
              Мало данных: разбор появится, когда на урок ответят хотя бы {THRESHOLDS.minSubmitters} студентов.
              {r.mostAnswered ? ` Сейчас больше всего ответов на уроке ${r.mostAnswered.position}: ${r.mostAnswered.count}.` : ""}
            </Notice>
          ) : r.top.length === 0 ? (
            <Notice>Повторяющихся ошибок в ответах группы не нашли.</Notice>
          ) : (
            <ul className="divide-y rounded-lg border">
              {r.top.map((s) => (
                <li key={s.key} className="p-4 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">Урок {s.lessonPosition}: {s.lessonTitle}</span>
                    <Badge variant={s.level === "proposal" ? "default" : "outline"}>{s.level === "proposal" ? "достаточно для предложения" : "наблюдение"}</Badge>
                  </div>
                  <div className="mt-1">{SIGNAL_LABELS[s.kind]}: {s.text}</div>
                  <div className="mt-0.5 type-caption text-muted-foreground">{s.detail}</div>
                </li>
              ))}
            </ul>
          )}
          <div className="overflow-x-auto rounded-lg border">
            <table className="data-table min-w-[720px]">
              <thead>
                <tr>
                  <th className="pl-4">Урок</th>
                  <th>Сдали</th>
                  <th>Средний балл</th>
                  <th>Худший критерий</th>
                  <th>Возражения</th>
                  <th className="pr-4">Сигналы</th>
                </tr>
              </thead>
              <tbody>
                {r.lessons.map((l) => (
                  <tr key={l.lessonId}>
                    <td className="pl-4">{l.position}. {l.title}</td>
                    <td>{l.submitters}</td>
                    <td>{l.avgScore ?? "—"}</td>
                    <td>
                      {l.worstCriterion ? (
                        <>
                          Критерий {l.worstCriterion.index + 1}: {l.worstCriterion.failed} из {l.worstCriterion.of} ({Math.round(l.worstCriterion.share * 100)}%)
                        </>
                      ) : "—"}
                    </td>
                    <td>{l.objections}{l.objectionsScoreChanged ? ` (балл изменился у ${l.objectionsScoreChanged})` : ""}</td>
                    <td className="pr-4">
                      {l.signals.length > 0 ? l.signals.map((s) => <div key={s.key}>{SIGNAL_LABELS[s.kind]}</div>) : <span className="text-muted-foreground">{l.enoughData ? "нет" : "мало данных"}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {r.lessons.some((l) => l.mismatched > 0) ? (
            <p className="type-caption text-muted-foreground">
              В некоторых разборах текст критерия не совпал с критерием урока: такие строки в подсчёт не вошли ({r.lessons.reduce((s, l) => s + l.mismatched, 0)}).
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
