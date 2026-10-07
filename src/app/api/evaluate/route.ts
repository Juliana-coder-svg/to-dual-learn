import { NextResponse } from "next/server";
import { studentCourse } from "@/lib/auth/access";
import { addSubmission, getLatestSubmission, getLesson, updateUserProgress, upsertFlashcard } from "@/lib/db/queries";
import { evaluateAnswer } from "@/lib/ai/claude";
import { nextStreak, xpForLesson } from "@/lib/progress/streak";
import { firstDueAt } from "@/lib/progress/flashcards";
import { handleRouteError, jsonError } from "@/lib/api";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { lessonId?: string; answer?: string };
    const lesson = getLesson(String(body.lessonId ?? ""));
    if (!lesson) return jsonError("Урок не найден", 404);
    const ctx = await studentCourse(lesson.course_id);
    if (!ctx) return jsonError("Нет доступа к курсу", 403);
    if (lesson.status !== "published" && ctx.course.owner_id !== ctx.user.id) return jsonError("Урок ещё не опубликован", 403);
    const answer = String(body.answer ?? "").trim().slice(0, 6000);
    if (answer.length < 10) return jsonError("Напиши ответ хотя бы в одно предложение");

    const feedback = await evaluateAnswer(lesson.content, answer);
    const firstTime = !getLatestSubmission(lesson.id, ctx.user.id);
    addSubmission({ lessonId: lesson.id, userId: ctx.user.id, answer, feedback });

    let progress = { streak: ctx.user.streak, xp: ctx.user.xp, gained: 0 };
    if (firstTime) {
      const streak = nextStreak(ctx.user.streak, ctx.user.last_lesson_at);
      const gained = xpForLesson(feedback.score);
      updateUserProgress(ctx.user.id, { streak, last_lesson_at: new Date().toISOString(), xp: ctx.user.xp + gained });
      upsertFlashcard(ctx.user.id, lesson.id, firstDueAt());
      progress = { streak, xp: ctx.user.xp + gained, gained };
    }
    return NextResponse.json({ ok: true, feedback, firstTime, progress });
  } catch (e) {
    return handleRouteError(e);
  }
}
