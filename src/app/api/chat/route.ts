import { NextResponse } from "next/server";
import { teacherCourse } from "@/lib/auth/access";
import { addChatMessage, listChatMessages, listMaterials } from "@/lib/db/queries";
import { chatWithMaterials } from "@/lib/ai";
import { handleRouteError, jsonError } from "@/lib/api";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { courseId?: string; message?: string };
    const ctx = await teacherCourse(String(body.courseId ?? ""));
    if (!ctx) return jsonError("Нет доступа к курсу", 403);
    const question = String(body.message ?? "").trim().slice(0, 8000);
    if (!question) return jsonError("Пустой вопрос");
    const history = listChatMessages(ctx.course.id, ctx.user.id, 20).map((m) => ({ role: m.role, content: m.content }));
    const materials = listMaterials(ctx.course.id);
    const reply = await chatWithMaterials({ userId: ctx.user.id, courseId: ctx.course.id }, materials, history, question);
    addChatMessage({ courseId: ctx.course.id, userId: ctx.user.id, role: "user", content: question });
    const saved = addChatMessage({ courseId: ctx.course.id, userId: ctx.user.id, role: "assistant", content: reply });
    return NextResponse.json({ ok: true, reply, id: saved.id });
  } catch (e) {
    return handleRouteError(e);
  }
}
