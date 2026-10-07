import { NextResponse } from "next/server";
import { teacherCourse } from "@/lib/auth/access";
import { addGeneration, listMaterials } from "@/lib/db/queries";
import { generateArtifact } from "@/lib/ai";
import { ARTIFACT_KINDS, type ArtifactKind } from "@/lib/lessons/types";
import { handleRouteError, jsonError } from "@/lib/api";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { courseId?: string; kind?: string; instructions?: string };
    const ctx = await teacherCourse(String(body.courseId ?? ""));
    if (!ctx) return jsonError("Нет доступа к курсу", 403);
    const kind = body.kind as ArtifactKind;
    if (!(kind in ARTIFACT_KINDS)) return jsonError("Неизвестный тип документа");
    const materials = await listMaterials(ctx.course.id);
    if (materials.length === 0) return jsonError("Сначала загрузи материалы");
    const instructions = String(body.instructions ?? "").slice(0, 4000);
    const output = await generateArtifact({ userId: ctx.user.id, courseId: ctx.course.id }, ctx.course, materials, { kind, instructions });
    await addGeneration({ courseId: ctx.course.id, userId: ctx.user.id, kind, prompt: instructions, output });
    return NextResponse.json({ ok: true, output });
  } catch (e) {
    return handleRouteError(e);
  }
}
