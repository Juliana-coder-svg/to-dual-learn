import { NextResponse } from "next/server";
import { teacherCourse } from "@/lib/auth/access";
import { addHomeworkCheck, listMaterials } from "@/lib/db/queries";
import { checkHomework } from "@/lib/ai";
import { handleRouteError, jsonError } from "@/lib/api";
import { parseWorks } from "@/lib/homework/parse";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { courseId?: string; task?: string; criteria?: string; works?: string };
    const ctx = await teacherCourse(String(body.courseId ?? ""));
    if (!ctx) return jsonError("Нет доступа к курсу", 403);
    const task = String(body.task ?? "").trim();
    const criteria = String(body.criteria ?? "").trim();
    const submissions = parseWorks(String(body.works ?? ""));
    if (!task || !criteria) return jsonError("Нужны задание и критерии");
    if (submissions.length === 0) return jsonError("Нет работ для проверки");
    if (submissions.length > 40) return jsonError("За раз можно проверить до 40 работ");
    const results = await checkHomework({ userId: ctx.user.id, courseId: ctx.course.id }, await listMaterials(ctx.course.id), { task, criteria, submissions, tone: ctx.course.tone });
    await addHomeworkCheck({ courseId: ctx.course.id, userId: ctx.user.id, task, criteria, results });
    return NextResponse.json({ ok: true, results });
  } catch (e) {
    return handleRouteError(e);
  }
}
