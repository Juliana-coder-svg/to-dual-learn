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
  const ctx = await teacherCourse(courseId);
  if (!ctx) return noCourseAccess(`/teach/${courseId}/signals`);
  const [lessons, answers, calibration, flashcards] = await Promise.all([
    listLessons(courseId, { publishedOnly: true }),
    listLessonAnswersForSignals(courseId),
    listCalibrationSamples(courseId),
    listFlashcardSignals(courseId),
  ]);

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
        description="Где ответы группы повторяют одну и ту же ошибку. Сервис считает по первым ответам студентов, ИИ не участвует. Это прототип: пороги пересмотрим по данным пилота."
      />
      {total === 0 ? (
        <EmptyState title="Ответов пока нет" description="Сигналы появятся, когда студенты сдадут первые уроки." />
      ) : (
        <>
          {!r.enoughData ? (
            <Notice>
              Мало данных: сигналы появятся, когда на урок ответят не меньше {THRESHOLDS.minSubmitters} человек.
              {r.mostAnswered ? ` Больше всего ответов пока на уроке ${r.mostAnswered.position}: ${r.mostAnswered.count}.` : ""}
            </Notice>
          ) : r.top.length === 0 ? (
            <Notice>Повторяющихся ошибок в ответах группы не нашли.</Notice>
          ) : (
            <ul className="frame divide-y">
              {r.top.map((s) => (
                <li key={s.key} className="p-4 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">Урок {s.lessonPosition}: {s.lessonTitle}</span>
                    <Badge variant={s.level === "proposal" ? "default" : "outline"}>{s.level === "proposal" ? "можно предложить правку" : "наблюдение"}</Badge>
                  </div>
                  <div className="mt-1">{SIGNAL_LABELS[s.kind]}: {s.text}</div>
                  <div className="mt-0.5 type-caption text-muted-foreground">{s.detail}</div>
                </li>
              ))}
            </ul>
          )}
          <div className="table-frame">
            <table className="data-table min-w-[720px]">
              <thead>
                <tr>
                  <th>Урок</th>
                  <th>Сдали</th>
                  <th>Средний балл</th>
                  <th>Слабее всего</th>
                  <th>Возражения</th>
                  <th>Сигналы</th>
                </tr>
              </thead>
              <tbody>
                {r.lessons.map((l) => (
                  <tr key={l.lessonId}>
                    <td>{l.position}. {l.title}</td>
                    <td>{l.submitters}</td>
                    <td>{l.avgScore ?? "—"}</td>
                    <td>
                      {l.worstCriterion ? (
                        <>
                          Критерий {l.worstCriterion.index + 1}: не выполнили {l.worstCriterion.failed} из {l.worstCriterion.of} ({Math.round(l.worstCriterion.share * 100)}%)
                        </>
                      ) : "—"}
                    </td>
                    <td>{l.objections}{l.objectionsScoreChanged ? ` (балл изменился у ${l.objectionsScoreChanged})` : ""}</td>
                    <td>
                      {l.signals.length > 0 ? l.signals.map((s) => <div key={s.key}>{SIGNAL_LABELS[s.kind]}</div>) : <span className="text-muted-foreground">{l.enoughData ? "нет" : "мало данных"}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {r.lessons.some((l) => l.mismatched > 0) ? (
            <p className="type-caption text-muted-foreground">
              В части разборов текст критерия не совпал с критерием урока, поэтому их не учли ({r.lessons.reduce((s, l) => s + l.mismatched, 0)}).
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
