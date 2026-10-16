import { NextResponse } from "next/server";
import { teacherCourse } from "@/lib/auth/access";
import { finishLessonBuild, insertLessons, listLessonBuilds, listLessons, listMaterials, setLessonReview, startLessonBuild } from "@/lib/db/queries";
import { buildStatus } from "@/lib/lessons/build";
import { generateLessons, reviewLessons } from "@/lib/ai";
import { handleRouteError, jsonError } from "@/lib/api";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  let buildId: string | null = null;
  const startedAt = Date.now();
  try {
    const body = (await req.json()) as { courseId?: string; count?: number; review?: boolean };
    const ctx = await teacherCourse(String(body.courseId ?? ""));
    if (!ctx) return jsonError("Нет доступа к курсу", 403);
    const count = Math.min(10, Math.max(1, Number(body.count) || 5));
    const materials = await listMaterials(ctx.course.id);
    if (materials.length === 0) return jsonError("Сначала загрузите материалы");
    const [latest] = await listLessonBuilds(ctx.course.id, 1);
    if (latest && buildStatus(latest) === "running") return jsonError("Сборка уже идёт. Дождитесь её конца: уроки появятся в списке.", 409);
    const review = body.review !== false;
    buildId = await startLessonBuild({ courseId: ctx.course.id, userId: ctx.user.id, params: { count, review } });
    const existingTitles = (await listLessons(ctx.course.id)).map((l) => l.title);
    const callCtx = { userId: ctx.user.id, courseId: ctx.course.id };
    const generated = await generateLessons(callCtx, ctx.course, materials, { count, existingTitles });
    let reviewSummary: string | undefined;
    let lessons = generated;
    let notes: { changed: boolean; flags: string[]; title: string }[] | null = null;
    if (review) {
      const reviewed = await reviewLessons(callCtx, ctx.course, materials, generated, { existingCount: existingTitles.length });
      lessons = reviewed.lessons;
      notes = reviewed.notes;
      reviewSummary = reviewed.summary;
    }
    const inserted = await insertLessons(ctx.course.id, lessons);
    if (notes) {
      for (const [i, l] of inserted.entries()) await setLessonReview(l.id, ctx.course.id, notes[i] ?? null);
    }
    await finishLessonBuild(buildId, { status: "done", added: inserted.length, seconds: Math.round((Date.now() - startedAt) / 1000), summary: reviewSummary });
    return NextResponse.json({ ok: true, added: inserted.length, reviewSummary });
  } catch (e) {
    if (buildId) await finishLessonBuild(buildId, { status: "failed", error: "Сборка не удалась. Попробуйте ещё раз, а если снова не выйдет, возьмите меньше уроков." }).catch(() => undefined);
    return handleRouteError(e);
  }
}
