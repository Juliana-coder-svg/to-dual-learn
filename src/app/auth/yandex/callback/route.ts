import { NextResponse } from "next/server";
import { exchangeCode, fetchYandexProfile, yandexConfig } from "@/lib/auth/yandex";
import { consumeYandexState, requestOrigin } from "@/lib/auth/yandex-flow";
import { takeLoginPrefs } from "@/lib/auth/login-prefs";
import { getCurrentUser, homeFor } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Сюда возвращает Яндекс после экрана разрешений: ?code=&state= или ?error=&state=.
 *  Сверяем state, меняем код на токен, читаем почту и имя, потом выпускаем сессию Supabase
 *  тем же приёмом, что вход без письма (admin.generateLink): одноразовый token_hash уходит
 *  на /auth/callback, который подтверждает его и переносит роль и адрес возврата из cookie
 *  tdd_login_prefs в профиль. Так у входа через Яндекс и у ссылки из письма один финал. */
export async function GET(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  const origin = await requestOrigin();
  const fail = async (kind: "off" | "denied" | "state" | "email" | "failed", detail?: string) => {
    if (detail) console.error(`[auth] yandex ${kind}: ${detail}`);
    // Роль и адрес возврата этой попытки больше не нужны: иначе их подхватит следующий вход по ссылке из письма.
    await takeLoginPrefs();
    return NextResponse.redirect(new URL(`/login?yandex=${kind}`, origin));
  };

  const cfg = yandexConfig();
  if (!cfg) return fail("off");

  const stateOk = await consumeYandexState(url.searchParams.get("state"));
  // Код ошибки Яндекса идёт в лог: оставляем только безопасные символы, параметр может прислать кто угодно.
  const yandexError = (url.searchParams.get("error") ?? "").replace(/[^\w.-]/g, "").slice(0, 64);
  if (yandexError) return fail(yandexError === "access_denied" ? "denied" : "failed", `yandex error ${yandexError}`);
  if (!stateOk) {
    // Повторное открытие адреса (F5, «назад») после удачного входа: просто ведём на главную роли.
    const user = await getCurrentUser();
    if (user) return NextResponse.redirect(new URL(homeFor(user), origin));
    return fail("state", "state missing or mismatched");
  }
  const code = url.searchParams.get("code");
  if (!code) return fail("failed", "no code");

  const token = await exchangeCode(code, cfg);
  if (!token.ok) return fail(token.reason, token.detail);
  const info = await fetchYandexProfile(token.accessToken);
  if (!info.ok) return fail(info.reason, info.detail);
  const { email, name } = info.profile;

  // Почту подтвердил Яндекс, поэтому письмо не нужно: service role выпускает одноразовый токен входа.
  // Имя уходит в user_metadata и попадает только в профиль нового пользователя.
  const admin = createServiceClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { data: { ...(name ? { name } : {}), role: "student" } },
  });
  if (error) return fail("failed", `generateLink ${error.code ?? error.status ?? ""} ${error.message}`.trim());

  const finish = new URL("/auth/callback", origin);
  finish.searchParams.set("token_hash", data.properties.hashed_token);
  finish.searchParams.set("type", data.properties.verification_type);
  return NextResponse.redirect(finish);
}
