import { NextResponse } from "next/server";
import { teacherCourse } from "@/lib/auth/access";
import { listLessons, listMaterials, setLessonReview, updateLessonContent } from "@/lib/db/queries";
import { reviewLessons } from "@/lib/ai";
import { handleRouteError, jsonError } from "@/lib/api";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { courseId?: string };
    const ctx = await teacherCourse(String(body.courseId ?? ""));
    if (!ctx) return jsonError("Нет доступа к курсу", 403);
    const lessons = listLessons(ctx.course.id);
    if (lessons.length === 0) return jsonError("Нет уроков для проверки");
    if (lessons.length > 15) return jsonError("За раз методист проверяет до 15 уроков");
    const materials = listMaterials(ctx.course.id);
    const review = await reviewLessons({ userId: ctx.user.id, courseId: ctx.course.id }, ctx.course, materials, lessons.map((l) => l.content));
    lessons.forEach((l, i) => {
      updateLessonContent(l.id, ctx.course.id, review.lessons[i]);
      setLessonReview(l.id, ctx.course.id, review.notes[i] ?? null);
    });
    const changed = review.notes.filter((n) => n.changed).length;
    const flagged = review.notes.filter((n) => n.flags.length > 0).length;
    return NextResponse.json({ ok: true, summary: `${review.summary} Изменено уроков: ${changed}, с замечаниями: ${flagged}.` });
  } catch (e) {
    return handleRouteError(e);
  }
}
