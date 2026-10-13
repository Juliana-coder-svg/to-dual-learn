import { createHash } from "node:crypto";

/** Хэш IP для суточного лимита: сырой IP не храним. Соль и дата в хэше, поэтому на следующие сутки он другой
 *  и IP по хэшу не восстановить и не отследить между днями. */
export function hashIp(req: Request, now = new Date()): string {
  const fwd = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = req.headers.get("x-real-ip")?.trim() || fwd || "unknown";
  const salt = process.env.TRY_IP_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || "dev-salt";
  return createHash("sha256").update(`${salt}|${now.toISOString().slice(0, 10)}|${ip}`).digest("hex").slice(0, 32);
}

export const TRY_WINDOW_MS = 24 * 60 * 60 * 1000;

export function tryDailyLimit(): number {
  const n = Number(process.env.TRY_DAILY_LIMIT_PER_IP ?? 3);
  return Number.isInteger(n) && n >= 0 ? n : 3;
}
