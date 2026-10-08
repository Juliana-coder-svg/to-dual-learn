import { randomBytes, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import type { Role } from "@/lib/db/queries";
import { setLoginPrefs } from "@/lib/auth/login-prefs";
import { buildAuthorizeUrl, type YandexConfig } from "@/lib/auth/yandex";
import { safeNextPath } from "@/lib/auth/next-path";

/** Cookie-часть входа через Яндекс: state против CSRF и роль с адресом возврата в tdd_login_prefs. */

const STATE_COOKIE = "tdd_yandex_state";
/** Код Яндекса живёт 10 минут, столько же держим state. */
const STATE_MAX_AGE_SEC = 60 * 10;
/** Cookie нужна только на /auth/yandex/callback; lax, потому что callback — переход с oauth.yandex.ru. */
const STATE_COOKIE_PATH = "/auth/yandex";

export function parseRole(v: unknown): Role {
  return v === "teacher" ? "teacher" : "student";
}

/** Адрес возврата после входа: только относительный путь внутри сайта (см. next-path.ts). */
export const safeNext = safeNextPath;

const LOOPBACK = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

/** Адрес, с которого пришёл запрос, по заголовкам. В dev `new URL(req.url).origin` всегда даёт localhost,
 *  даже если страницу открыли на 127.0.0.1 или [::1], а cookie привязаны к хосту из адресной строки. */
export async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (LOOPBACK.test(host) ? "http" : "https");
  return `${proto}://${host}`;
}

/** Адрес приложения для redirect_uri: NEXT_PUBLIC_SITE_URL, иначе хост запроса. Яндекс принимает только
 *  redirect_uri, зарегистрированные в приложении, поэтому подделка заголовка Host ничего не даёт. */
export async function siteOrigin(): Promise<string> {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return requestOrigin();
}

export async function yandexRedirectUri(): Promise<string> {
  return `${await siteOrigin()}/auth/yandex/callback`;
}

/** Запоминает роль и адрес возврата, ставит state и возвращает адрес страницы разрешений Яндекса. */
export async function beginYandexLogin(cfg: YandexConfig, p: { role: Role; next: string }): Promise<string> {
  const state = randomBytes(32).toString("base64url");
  const store = await cookies();
  store.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: STATE_COOKIE_PATH,
    maxAge: STATE_MAX_AGE_SEC,
  });
  // Имя не задаём: новый пользователь получит его из Яндекса через user_metadata,
  // а имя существующего профиля при входе не перезаписываем.
  await setLoginPrefs({ name: "", role: p.role, ...(p.next ? { next: p.next } : {}) });
  return buildAuthorizeUrl({ clientId: cfg.clientId, redirectUri: await yandexRedirectUri(), state });
}

/** Сверяет state из адреса с cookie и удаляет cookie при любом исходе. */
export async function consumeYandexState(fromQuery: string | null): Promise<boolean> {
  const store = await cookies();
  const expected = store.get(STATE_COOKIE)?.value ?? "";
  store.set(STATE_COOKIE, "", { httpOnly: true, sameSite: "lax", path: STATE_COOKIE_PATH, maxAge: 0 });
  if (!expected || !fromQuery) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(fromQuery);
  return a.length === b.length && timingSafeEqual(a, b);
}
