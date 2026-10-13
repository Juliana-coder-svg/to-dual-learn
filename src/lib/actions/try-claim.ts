"use server";

import { requireUser } from "@/lib/auth/session";
import { addSubmission, enroll, getCourse, getLatestSubmission, hasActiveConsent, listLessons, updateUserProgress, upsertFlashcards } from "@/lib/db/queries";
import { CONSENT_VERSION } from "@/lib/legal/versions";
import { getTryLesson, tryCourseId } from "@/lib/try/catalog";
import { verifyAttempt } from "@/lib/try/claim-token";
import { nextStreak, xpForLesson } from "@/lib/progress/streak";
import { firstDueAt } from "@/lib/progress/flashcards";

export type ClaimResult =
  | { ok: true; href: string }
  | { ok: false; reason: "consent" | "invalid" | "expired" | "unavailable" };

/** Переносит пробный ответ и разбор гостя в профиль после входа. Подпись проверяется на сервере,
 *  поэтому вписать себе чужой разбор или оценку нельзя. Повторный вызов дублей не создаёт. */
export async function claimTryAttemptAction(raw: unknown): Promise<ClaimResult> {
  const user = await requireUser();
  // Ответ в базу только после согласия на обработку данных.
  if (!(await hasActiveConsent(user.id, "processing", CONSENT_VERSION.processing))) return { ok: false, reason: "consent" };

  const checked = verifyAttempt(raw);
  if (!checked.ok) return { ok: false, reason: checked.reason };
  const { attempt } = checked;

  const courseId = tryCourseId(attempt.slug);
  const tryLesson = getTryLesson(attempt.slug, attempt.lessonIndex);
  const course = courseId ? await getCourse(courseId) : undefined;
  if (!courseId || !tryLesson || !course) return { ok: false, reason: "unavailable" };

  await enroll(user.id, courseId);
  const lesson = (await listLessons(courseId, { publishedOnly: true }))[0];
  // Урок в базе должен быть тем же, на который отвечал гость.
  if (!lesson || lesson.content.title !== tryLesson.content.title) return { ok: false, reason: "unavailable" };
  const href = `/learn/${courseId}/lesson/${lesson.id}`;

  if (await getLatestSubmission(lesson.id, user.id)) return { ok: true, href };
  await addSubmission({ lessonId: lesson.id, userId: user.id, answer: attempt.answer, feedback: attempt.feedback });
  const gained = xpForLesson(attempt.feedback.score);
  await updateUserProgress(user.id, { streak: nextStreak(user.streak, user.last_lesson_at), last_lesson_at: new Date().toISOString(), xp: user.xp + gained });
  await upsertFlashcards(user.id, lesson.id, lesson.content.flashcards.length, firstDueAt());
  return { ok: true, href };
}
