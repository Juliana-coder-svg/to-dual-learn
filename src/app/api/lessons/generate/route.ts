import { NextResponse } from "next/server";
import { teacherCourse } from "@/lib/auth/access";
import { insertLessons, listLessons, listMaterials } from "@/lib/db/queries";
import { generateLessons } from "@/lib/ai/claude";
import { handleRouteError, jsonError } from "@/lib/api";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { courseId?: string; count?: number };
    const ctx = await teacherCourse(String(body.courseId ?? ""));
    if (!ctx) return jsonError("Нет доступа к курсу", 403);
    const count = Math.min(10, Math.max(1, Number(body.count) || 5));
    const materials = listMaterials(ctx.course.id);
    if (materials.length === 0) return jsonError("Сначала загрузи материалы");
    const existingTitles = listLessons(ctx.course.id).map((l) => l.title);
    const lessons = await generateLessons(ctx.course, materials, { count, existingTitles });
    const inserted = insertLessons(ctx.course.id, lessons);
    return NextResponse.json({ ok: true, added: inserted.length });
  } catch (e) {
    return handleRouteError(e);
  }
}
