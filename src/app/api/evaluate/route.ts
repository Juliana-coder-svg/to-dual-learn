import { NextResponse } from "next/server";
import { studentCourse } from "@/lib/auth/access";
import {
  addSubmission,
  countLessonsStartedToday,
  getLatestSubmission,
  getLesson,
  listCalibrationSamples,
  updateUserProgress,
  upsertFlashcards,
} from "@/lib/db/queries";
import { evaluateAnswer, reevaluateAnswer } from "@/lib/ai";
import { plural } from "@/lib/utils/format";
import { nextStreak, xpForLesson } from "@/lib/progress/streak";
import { firstDueAt } from "@/lib/progress/flashcards";
import { handleRouteError, jsonError } from "@/lib/api";
import { isUuid } from "@/lib/utils/ids";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { lessonId?: string; answer?: string; objection?: string };
    const lessonId = String(body.lessonId ?? "");
    const lesson = isUuid(lessonId) ? await getLesson(lessonId) : null;
    if (!lesson) return jsonError("Урок не найден", 404);
    const ctx = await studentCourse(lesson.course_id);
    if (!ctx) return jsonError("Нет доступа к курсу", 403);
    const { user, course } = ctx;
    const isOwner = course.owner_id === user.id;
    if (lesson.status !== "published" && !isOwner) return jsonError("Урок ещё не опубликован", 403);
    const callCtx = { userId: user.id, courseId: course.id };
    const previous = await getLatestSubmission(lesson.id, user.id);

    // Возражение на оценку: переоценка без изменения прогресса.
    const objection = String(body.objection ?? "").trim().slice(0, 2000);
    if (objection) {
      if (!previous) return jsonError("Сначала нужно получить оценку");
      const feedback = await reevaluateAnswer(callCtx, lesson.content, previous.answer, previous.feedback, objection, { tone: course.tone });
      await addSubmission({ lessonId: lesson.id, userId: user.id, answer: previous.answer, feedback, objection });
      return NextResponse.json({ ok: true, feedback, firstTime: false, progress: { streak: user.streak, xp: user.xp, gained: 0 } });
    }

    const answer = String(body.answer ?? "").trim().slice(0, 6000);
    if (answer.length < 10) return jsonError("Напишите ответ хотя бы в одно предложение");
    const firstTime = !previous;
    if (firstTime && !isOwner && course.daily_limit > 0 && await countLessonsStartedToday(user.id, course.id) >= course.daily_limit) {
      return jsonError(`Сегодня можно начать только ${course.daily_limit === 1 ? "один новый урок" : plural(course.daily_limit, "новый урок", "новых урока", "новых уроков")}. Следующий откроется завтра.`, 429);
    }

    const samples = (await listCalibrationSamples(course.id, lesson.id)).map((s) => ({ answer: s.answer, score: s.score, comment: s.comment }));
    const feedback = await evaluateAnswer(callCtx, lesson.content, answer, { tone: course.tone, samples });
    await addSubmission({ lessonId: lesson.id, userId: user.id, answer, feedback });

    let progress = { streak: user.streak, xp: user.xp, gained: 0 };
    if (firstTime) {
      const streak = nextStreak(user.streak, user.last_lesson_at);
      const gained = xpForLesson(feedback.score);
      await updateUserProgress(user.id, { streak, last_lesson_at: new Date().toISOString(), xp: user.xp + gained });
      await upsertFlashcards(user.id, lesson.id, lesson.content.flashcards.length, firstDueAt());
      progress = { streak, xp: user.xp + gained, gained };
    }
    return NextResponse.json({ ok: true, feedback, firstTime, progress });
  } catch (e) {
    return handleRouteError(e);
  }
}
