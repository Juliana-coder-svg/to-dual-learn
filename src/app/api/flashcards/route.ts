import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getFlashcard, updateFlashcard } from "@/lib/db/queries";
import { nextReview, type RecallQuality } from "@/lib/progress/flashcards";
import { handleRouteError, jsonError } from "@/lib/api";

export const runtime = "nodejs";

const QUALITIES: RecallQuality[] = ["forgot", "vague", "remembered"];

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Нужно войти", 401);
    const body = (await req.json()) as { id?: string; quality?: string };
    const card = await getFlashcard(String(body.id ?? ""), user.id);
    if (!card) return jsonError("Карточка не найдена", 404);
    const quality = body.quality as RecallQuality;
    if (!QUALITIES.includes(quality)) return jsonError("Неизвестная оценка");
    const next = nextReview(card.round, quality);
    await updateFlashcard(card.id, { nextDueAt: next.nextDueAt, round: next.round, quality });
    return NextResponse.json({ ok: true, nextDueAt: next.nextDueAt });
  } catch (e) {
    return handleRouteError(e);
  }
}
