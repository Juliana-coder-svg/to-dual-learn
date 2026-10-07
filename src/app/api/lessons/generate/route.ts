import { NextResponse } from "next/server";
import { teacherCourse } from "@/lib/auth/access";
import { insertLessons, listLessons, listMaterials, setLessonReview } from "@/lib/db/queries";
import { generateLessons, reviewLessons } from "@/lib/ai";
import { handleRouteError, jsonError } from "@/lib/api";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { courseId?: string; count?: number; review?: boolean };
    const ctx = await teacherCourse(String(body.courseId ?? ""));
    if (!ctx) return jsonError("Нет доступа к курсу", 403);
    const count = Math.min(10, Math.max(1, Number(body.count) || 5));
    const materials = listMaterials(ctx.course.id);
    if (materials.length === 0) return jsonError("Сначала загрузи материалы");
    const existingTitles = listLessons(ctx.course.id).map((l) => l.title);
    const callCtx = { userId: ctx.user.id, courseId: ctx.course.id };
    const generated = await generateLessons(callCtx, ctx.course, materials, { count, existingTitles });
    let reviewSummary: string | undefined;
    let lessons = generated;
    let notes: { changed: boolean; flags: string[]; title: string }[] | null = null;
    if (body.review !== false) {
      const review = await reviewLessons(callCtx, ctx.course, materials, generated);
      lessons = review.lessons;
      notes = review.notes;
      reviewSummary = review.summary;
    }
    const inserted = insertLessons(ctx.course.id, lessons);
    if (notes) inserted.forEach((l, i) => setLessonReview(l.id, ctx.course.id, notes![i] ?? null));
    return NextResponse.json({ ok: true, added: inserted.length, reviewSummary });
  } catch (e) {
    return handleRouteError(e);
  }
}
