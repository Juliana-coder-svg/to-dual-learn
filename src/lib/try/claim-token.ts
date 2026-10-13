import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { FeedbackSchema, type Feedback } from "@/lib/lessons/types";

/** Подпись пробного разбора. Гость уносит ответ и разбор в localStorage, а после входа сервер переносит их в профиль.
 *  Подпись нужна, чтобы нельзя было вписать себе чужой разбор или оценку: сверяются хэши ответа и разбора. */

const TTL_MS = 24 * 60 * 60 * 1000;
export const MAX_ANSWER_CHARS = 6000;
/** Верхняя граница размера разбора, который принимаем от клиента. */
const MAX_FEEDBACK_JSON = 30_000;

export interface TryAttempt {
  slug: string;
  lessonIndex: number;
  answer: string;
  feedback: Feedback;
  claimToken: string;
}

function secret(): string {
  const s = process.env.TRY_CLAIM_SECRET || (process.env.NODE_ENV === "production" ? "" : "dev-secret");
  if (!s) throw new Error("Не задан TRY_CLAIM_SECRET.");
  return s;
}

const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const canonical = (f: Feedback) => JSON.stringify(FeedbackSchema.parse(f));
const mac = (body: string) => createHmac("sha256", secret()).update(body).digest("base64url");

/** Бросает, если секрет подписи не задан: проверять до платного вызова модели. */
export function assertClaimConfigured(): void {
  secret();
}

export function signAttempt(a: { slug: string; lessonIndex: number; answer: string; feedback: Feedback }): string {
  const body = Buffer.from(JSON.stringify({ s: a.slug, i: a.lessonIndex, a: sha(a.answer), f: sha(canonical(a.feedback)), e: Date.now() + TTL_MS })).toString("base64url");
  return `${body}.${mac(body)}`;
}

/** Возвращает проверенную попытку или причину отказа. Вход не доверенный: форма, размер и подпись проверяются здесь. */
export function verifyAttempt(raw: unknown): { ok: true; attempt: TryAttempt } | { ok: false; reason: "invalid" | "expired" } {
  if (!raw || typeof raw !== "object") return { ok: false, reason: "invalid" };
  const r = raw as Record<string, unknown>;
  if (typeof r.slug !== "string" || typeof r.lessonIndex !== "number" || typeof r.answer !== "string" || typeof r.claimToken !== "string") return { ok: false, reason: "invalid" };
  if (r.answer.length > MAX_ANSWER_CHARS || r.claimToken.length > 4000) return { ok: false, reason: "invalid" };
  let feedback: Feedback;
  try {
    if (JSON.stringify(r.feedback).length > MAX_FEEDBACK_JSON) return { ok: false, reason: "invalid" };
    feedback = FeedbackSchema.parse(r.feedback);
  } catch {
    return { ok: false, reason: "invalid" };
  }
  const [body, sig] = r.claimToken.split(".");
  if (!body || !sig) return { ok: false, reason: "invalid" };
  const expected = mac(body);
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return { ok: false, reason: "invalid" };
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as { s: string; i: number; a: string; f: string; e: number };
    if (p.s !== r.slug || p.i !== r.lessonIndex || p.a !== sha(r.answer) || p.f !== sha(canonical(feedback))) return { ok: false, reason: "invalid" };
    if (Date.now() > p.e) return { ok: false, reason: "expired" };
  } catch {
    return { ok: false, reason: "invalid" };
  }
  return { ok: true, attempt: { slug: r.slug, lessonIndex: r.lessonIndex, answer: r.answer, feedback, claimToken: r.claimToken } };
}
