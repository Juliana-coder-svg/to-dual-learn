/** Режим входа. `direct` — почта и имя, вход сразу, без письма (как в первом MVP; подходит для демо
 *  и закрытых пилотов, потому что любой, кто знает почту, войдёт под ней). `magic` — ссылка на почту
 *  через Supabase Auth.
 *
 *  Правило по умолчанию: `direct` только вне production (dev-сервер) или при ALLOW_DIRECT_LOGIN=1.
 *  В production без этой переменной всегда `magic`, даже если задано AUTH_LOGIN_MODE=direct:
 *  открытый вход по чужой почте — нарушение ст. 19 152-ФЗ (docs/legal/data-map.md, 7.5).
 *  AUTH_LOGIN_MODE=magic принудительно включает ссылку на почту в любом окружении. */
export type LoginMode = "direct" | "magic";

export function loginMode(): LoginMode {
  if (process.env.AUTH_LOGIN_MODE === "magic") return "magic";
  const directAllowed = process.env.NODE_ENV !== "production" || process.env.ALLOW_DIRECT_LOGIN === "1";
  return directAllowed ? "direct" : "magic";
}
