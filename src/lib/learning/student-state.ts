/**
 * Состояние студента на вкладке «Студенты»: чистая функция без базы.
 * - «не начал»: записан, ответов нет;
 * - «сдал»: пройден последний опубликованный урок (есть хотя бы один ответ на него);
 * - «застрял»: не сдал, и либо последняя попытка на каком-то уроке оценена в 1–2,
 *   либо последний ответ был больше STUCK_AFTER_DAYS дней назад;
 * - «идёт»: остальные, у кого есть ответы. В сводке не считается, в фильтре есть.
 * Приоритет: сдал, затем застрял, затем идёт.
 */

export const STUCK_AFTER_DAYS = 3;
export const STUCK_MAX_SCORE = 2;

export type StudentState = "not_started" | "stuck" | "done" | "active";

export type StateAnswer = { user_id: string; lesson_id: string; score: number; created_at: string };

export type StudentProgress = {
  state: StudentState;
  /** Уроков из опубликованных, на которые есть ответ. */
  completed: number;
  /** ISO последнего ответа по опубликованным урокам или null. */
  lastAnswerAt: string | null;
};

/** publishedLessonIds — по порядку position; последний из них — финальный урок курса. */
export function computeStudentProgress(
  userIds: string[],
  publishedLessonIds: string[],
  answers: StateAnswer[],
  now: Date,
): Map<string, StudentProgress> {
  const published = new Set(publishedLessonIds);
  const lastId = publishedLessonIds[publishedLessonIds.length - 1];
  const byUser = new Map<string, Map<string, StateAnswer>>();
  const lastAt = new Map<string, string>();
  for (const a of answers) {
    if (!published.has(a.lesson_id)) continue;
    const latest = byUser.get(a.user_id) ?? new Map<string, StateAnswer>();
    const prev = latest.get(a.lesson_id);
    if (!prev || prev.created_at < a.created_at) latest.set(a.lesson_id, a);
    byUser.set(a.user_id, latest);
    const l = lastAt.get(a.user_id);
    if (!l || l < a.created_at) lastAt.set(a.user_id, a.created_at);
  }
  const out = new Map<string, StudentProgress>();
  for (const id of userIds) {
    const latest = byUser.get(id);
    const lastAnswerAt = lastAt.get(id) ?? null;
    let state: StudentState;
    if (!latest || !lastAnswerAt) state = "not_started";
    else if (lastId && latest.has(lastId)) state = "done";
    else {
      const lowScore = [...latest.values()].some((a) => a.score <= STUCK_MAX_SCORE);
      const silentDays = (now.getTime() - new Date(lastAnswerAt).getTime()) / 86_400_000;
      state = lowScore || silentDays > STUCK_AFTER_DAYS ? "stuck" : "active";
    }
    out.set(id, { state, completed: latest?.size ?? 0, lastAnswerAt });
  }
  return out;
}

export const STATE_LABEL: Record<StudentState, string> = {
  not_started: "Не начал",
  stuck: "Застрял",
  done: "Сдал",
  active: "Идёт",
};

export function parseStateFilter(v: string | undefined): StudentState | null {
  return v === "not_started" || v === "stuck" || v === "done" || v === "active" ? v : null;
}
