import { NextResponse } from "next/server";
import { teacherCourse } from "@/lib/auth/access";
import { listLessons, listMaterials, setLessonReview } from "@/lib/db/queries";
import { lessonContentChanges } from "@/lib/lessons/diff";
import { reviewLessons } from "@/lib/ai";
import { handleRouteError, jsonError } from "@/lib/api";
import { plural } from "@/lib/utils/format";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { courseId?: string };
    const ctx = await teacherCourse(String(body.courseId ?? ""));
    if (!ctx) return jsonError("Нет доступа к курсу", 403);
    const lessons = await listLessons(ctx.course.id);
    if (lessons.length === 0) return jsonError("Нет уроков для проверки");
    if (lessons.length > 15) return jsonError("За раз методист проверяет до 15 уроков");
    const materials = await listMaterials(ctx.course.id);
    const review = await reviewLessons({ userId: ctx.user.id, courseId: ctx.course.id }, ctx.course, materials, lessons.map((l) => l.content));
    // Методист ничего не переписывает сам: его версия ложится рядом с текущей, преподаватель принимает или отклоняет.
    // Проверка идёт минуты: урок, который за это время поправили руками, пропускаем, его предложение посчитано от старого текста.
    const fresh = new Map((await listLessons(ctx.course.id)).map((l) => [l.id, JSON.stringify(l.content)]));
    let proposals = 0;
    let flagged = 0;
    let skipped = 0;
    for (const [i, l] of lessons.entries()) {
      if (fresh.get(l.id) !== JSON.stringify(l.content)) {
        skipped += 1;
        continue;
      }
      const note = review.notes[i] ?? { title: l.title, changed: false, flags: [] };
      const proposed = review.lessons[i];
      const differs = lessonContentChanges(l.content, proposed).length > 0;
      if (differs) proposals += 1;
      else if (note.flags.length > 0) flagged += 1;
      await setLessonReview(l.id, ctx.course.id, differs ? { ...note, changed: true, proposal: proposed } : { ...note, changed: false });
    }
    const tail =
      proposals > 0
        ? ` Предложены правки в ${plural(proposals, "уроке", "уроках", "уроках")}: примите или оставьте свой текст под каждым уроком.`
        : " Правок не предложено.";
    const flaggedTail = flagged > 0 ? ` Замечания без правок: ${flagged}.` : "";
    const skippedTail = skipped > 0 ? ` ${plural(skipped, "урок", "урока", "уроков")} вы изменили во время проверки, для них предложения не записаны.` : "";
    return NextResponse.json({ ok: true, summary: `${review.summary}${tail}${flaggedTail}${skippedTail}` });
  } catch (e) {
    return handleRouteError(e);
  }
}
