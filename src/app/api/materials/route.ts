import { NextResponse } from "next/server";
import { teacherCourse } from "@/lib/auth/access";
import { addMaterial } from "@/lib/db/queries";
import { extractMaterialText } from "@/lib/ai";
import { handleRouteError, jsonError } from "@/lib/api";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_BYTES = 20 * 1024 * 1024;

function kindOf(name: string, mime: string): "pdf" | "md" | "txt" | null {
  const lower = name.toLowerCase();
  if (mime === "application/pdf" || lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".md") || mime === "text/markdown") return "md";
  if (lower.endsWith(".txt") || mime.startsWith("text/")) return "txt";
  return null;
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const courseId = String(form.get("courseId") ?? "");
    const ctx = await teacherCourse(courseId);
    if (!ctx) return jsonError("Нет доступа к курсу", 403);

    let added = 0;
    const pasted = form.get("text");
    if (typeof pasted === "string" && pasted.trim().length > 0) {
      await addMaterial({ courseId, filename: String(form.get("title") ?? "Текст"), kind: "txt", contentText: pasted.trim() });
      added++;
    }

    for (const entry of form.getAll("files")) {
      if (!(entry instanceof File)) continue;
      const kind = kindOf(entry.name, entry.type);
      if (!kind) return jsonError(`Формат не поддерживается: ${entry.name}. Нужны PDF, TXT или MD.`);
      if (entry.size > MAX_BYTES) return jsonError(`Файл больше 20 МБ: ${entry.name}`);
      const bytes = Buffer.from(await entry.arrayBuffer());
      const text = await extractMaterialText({ userId: ctx.user.id, courseId }, { name: entry.name, mime: entry.type, bytes });
      if (text.trim().length === 0) return jsonError(`Не удалось извлечь текст из ${entry.name}. Проверьте, что в файле есть текст, а не только картинки`);
      await addMaterial({ courseId, filename: entry.name, kind, contentText: text });
      added++;
    }
    if (added === 0) return jsonError("Нечего загружать: выберите файл или вставьте текст");
    return NextResponse.json({ ok: true, added });
  } catch (e) {
    return handleRouteError(e);
  }
}
