import { createHash } from "node:crypto";
import { isIPv6 } from "node:net";

/** IPv6: у клиента обычно целая сеть /64, поэтому считаем по первым 64 битам, а не по полному адресу. */
function ipKey(ip: string): string {
  if (!isIPv6(ip)) return ip;
  const [head, tail = ""] = ip.split("::");
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  const groups = ip.includes("::") ? [...left, ...Array(Math.max(0, 8 - left.length - right.length)).fill("0"), ...right] : left;
  return groups.slice(0, 4).map((g) => g.toLowerCase().replace(/^0+(?=.)/, "")).join(":");
}

/** Хэш IP для суточного лимита: сырой IP не храним, соль из окружения обязательна. Ключ считается без даты,
 *  чтобы окно в 24 часа не сбрасывалось в полночь; живёт хэш не дольше суток (purgeTryIpHashes). */
export function hashIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = req.headers.get("x-real-ip")?.trim() || fwd || "unknown";
  const salt = process.env.TRY_IP_SALT || (process.env.NODE_ENV === "production" ? "" : "dev-salt");
  if (!salt) throw new Error("Не задана TRY_IP_SALT: без соли хэш IP не считаем.");
  return createHash("sha256").update(`${salt}|${ipKey(ip)}`).digest("hex").slice(0, 32);
}

export const TRY_WINDOW_MS = 24 * 60 * 60 * 1000;

export function tryDailyLimit(): number {
  const n = Number(process.env.TRY_DAILY_LIMIT_PER_IP ?? 3);
  return Number.isInteger(n) && n >= 0 ? n : 3;
}
