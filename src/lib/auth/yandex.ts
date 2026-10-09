import { z } from "zod";

/** Вход через Яндекс ID: OAuth 2.0 без SDK, на fetch. Ключи живут только на сервере.
 *  Токен Яндекса используется один раз, чтобы прочитать почту и имя, и не сохраняется. */

const AUTHORIZE_URL = "https://oauth.yandex.ru/authorize";
const TOKEN_URL = "https://oauth.yandex.ru/token";
const INFO_URL = "https://login.yandex.ru/info?format=json";
/** Права приложения на oauth.yandex.ru должны совпадать с этим списком, иначе Яндекс вернёт invalid_scope. */
export const YANDEX_SCOPE = "login:email login:info";
const TIMEOUT_MS = 8_000;

export interface YandexConfig {
  clientId: string;
  clientSecret: string;
}

/** Ключи приложения Яндекса. Нет хотя бы одного — вход через Яндекс выключен, кнопка не показывается. */
export function yandexConfig(): YandexConfig | null {
  const clientId = process.env.YANDEX_CLIENT_ID?.trim();
  const clientSecret = process.env.YANDEX_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export function buildAuthorizeUrl(p: { clientId: string; redirectUri: string; state: string }): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: p.clientId,
    redirect_uri: p.redirectUri,
    state: p.state,
    scope: YANDEX_SCOPE,
  });
  return `${AUTHORIZE_URL}?${params}`;
}

export type YandexFailure = { ok: false; reason: "failed" | "email"; detail: string };

/** Меняет одноразовый код на access token. В detail нет ни кода, ни токена: его можно писать в лог. */
export async function exchangeCode(code: string, cfg: YandexConfig): Promise<{ ok: true; accessToken: string } | YandexFailure> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
  });
  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as { access_token?: unknown; error?: unknown };
    if (!res.ok || typeof json.access_token !== "string" || !json.access_token) {
      return { ok: false, reason: "failed", detail: `token ${res.status} ${typeof json.error === "string" ? json.error : ""}`.trim() };
    }
    return { ok: true, accessToken: json.access_token };
  } catch (e) {
    return { ok: false, reason: "failed", detail: `token ${e instanceof Error ? e.name : "error"}` };
  }
}

const profileSchema = z.object({
  default_email: z.string().optional(),
  emails: z.array(z.string()).optional(),
  real_name: z.string().optional(),
  display_name: z.string().optional(),
});

export interface YandexProfile {
  email: string;
  /** Имя из Яндекса или пустая строка: тогда профиль получит часть почты до @. */
  name: string;
}

/** Почта считается подтверждённой, только если она и в default_email, и в списке emails: явного флага
 *  в ответе Яндекса нет. Имя: «Имя Фамилия» из Яндекс ID, иначе отображаемое имя. */
export function parseYandexProfile(raw: unknown): { ok: true; profile: YandexProfile } | YandexFailure {
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: "failed", detail: "info: unexpected shape" };
  const d = parsed.data;
  const email = (d.default_email ?? "").trim().toLowerCase();
  if (!email.includes("@")) return { ok: false, reason: "email", detail: "info: no default_email" };
  if (Array.isArray(d.emails) && !d.emails.some((e) => e.trim().toLowerCase() === email)) {
    return { ok: false, reason: "email", detail: "info: default_email not in emails" };
  }
  const name = (d.real_name || d.display_name || "").trim().slice(0, 100);
  return { ok: true, profile: { email, name: name.length >= 2 ? name : "" } };
}

export async function fetchYandexProfile(accessToken: string): Promise<{ ok: true; profile: YandexProfile } | YandexFailure> {
  try {
    const res = await fetch(INFO_URL, {
      headers: { Authorization: `OAuth ${accessToken}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, reason: "failed", detail: `info ${res.status}` };
    return parseYandexProfile(await res.json());
  } catch (e) {
    return { ok: false, reason: "failed", detail: `info ${e instanceof Error ? e.name : "error"}` };
  }
}
