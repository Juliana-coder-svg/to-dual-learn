import { NextResponse } from "next/server";
import { teacherCourse } from "@/lib/auth/access";
import { addMaterial, listMaterials } from "@/lib/db/queries";
import { clarifyingQuestions } from "@/lib/ai";
import { handleRouteError, jsonError } from "@/lib/api";
import { NOTES_FILENAME } from "@/lib/lessons/notes";

export const runtime = "nodejs";
export const maxDuration = 120;

/** GET: вопросы к преподавателю по материалам. POST: сохранить ответы как материал курса. */
export async function GET(req: Request) {
  try {
    const courseId = new URL(req.url).searchParams.get("courseId") ?? "";
    const ctx = await teacherCourse(courseId);
    if (!ctx) return jsonError("Нет доступа к курсу", 403);
    const materials = await listMaterials(courseId);
    if (materials.length === 0) return jsonError("Сначала загрузите материалы");
    const result = await clarifyingQuestions({ userId: ctx.user.id, courseId }, ctx.course, materials);
    return NextResponse.json({ ok: true, questions: result.questions });
  } catch (e) {
    return handleRouteError(e);
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { courseId?: string; answers?: { question: string; answer: string }[] };
    const ctx = await teacherCourse(String(body.courseId ?? ""));
    if (!ctx) return jsonError("Нет доступа к курсу", 403);
    const answers = (body.answers ?? []).map((a) => ({ question: String(a.question ?? "").trim(), answer: String(a.answer ?? "").trim() })).filter((a) => a.question && a.answer);
    if (answers.length === 0) return jsonError("Ответьте хотя бы на один вопрос");
    const text = answers.map((a) => `Вопрос: ${a.question}\nОтвет преподавателя: ${a.answer}`).join("\n\n");
    await addMaterial({ courseId: ctx.course.id, filename: NOTES_FILENAME, kind: "txt", contentText: text });
    return NextResponse.json({ ok: true, saved: answers.length });
  } catch (e) {
    return handleRouteError(e);
  }
}
