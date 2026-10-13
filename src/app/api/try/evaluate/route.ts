import { NextResponse } from "next/server";
import { evaluateAnswer } from "@/lib/ai";
import { countTryCalls, purgeTryIpHashes, releaseTryCall, reserveTryCall } from "@/lib/db/queries";
import { runAsService } from "@/lib/supabase/server";
import { handleRouteError, jsonError } from "@/lib/api";
import { getTryLesson } from "@/lib/try/catalog";
import { hashIp, tryDailyLimit, TRY_WINDOW_MS } from "@/lib/try/ip";
import { MAX_ANSWER_CHARS, assertClaimConfigured, signAttempt } from "@/lib/try/claim-token";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Пробный разбор для гостя. В базу пишется только расход (ai_calls: хэш IP, без курса и пользователя).
 *  Ответ и разбор в базу не попадают, карточек, очков и серии нет: согласия на обработку у гостя ещё нет. */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { slug?: unknown; lessonIndex?: unknown; answer?: unknown };
    const slug = String(body.slug ?? "");
    const lessonIndex = Number(body.lessonIndex);
    const lesson = getTryLesson(slug, lessonIndex);
    if (!lesson) return jsonError("Этот урок открывается только после входа. Войдите или начните с пробного урока на главной", 404);
    const answer = String(body.answer ?? "").trim().slice(0, MAX_ANSWER_CHARS);
    if (answer.length < 10) return jsonError("Напишите ответ хотя бы в одно предложение");

    assertClaimConfigured();
    const limit = tryDailyLimit();
    const ipHash = hashIp(req);
    const since = new Date(Date.now() - TRY_WINDOW_MS);
    // Попытка занимается до вызова модели и считается вместе с остальными: параллельные запросы лимит не обходят.
    const reservation = await runAsService(async () => {
      await purgeTryIpHashes(since);
      const id = await reserveTryCall(ipHash);
      if ((await countTryCalls(ipHash, since)) > limit) {
        await releaseTryCall(id);
        return null;
      }
      return id;
    });
    if (!reservation) {
      return jsonError("Пробные разборы без входа на сегодня закончились. Войдите, чтобы пройти урок в своём профиле, или вернитесь завтра.", 429);
    }
    let feedback;
    try {
      feedback = await evaluateAnswer({ userId: null, ipHash }, lesson.content, answer, { tone: lesson.tone, samples: [] });
    } finally {
      await runAsService(() => releaseTryCall(reservation));
    }
    return NextResponse.json({ ok: true, feedback, claimToken: signAttempt({ slug, lessonIndex, answer, feedback }) });
  } catch (e) {
    return handleRouteError(e);
  }
}
