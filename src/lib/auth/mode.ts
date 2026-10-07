/** Режим входа. `direct` — почта и имя, вход сразу, без письма (как в первом MVP; подходит для демо
 *  и закрытых пилотов, потому что любой, кто знает почту, войдёт под ней). `magic` — ссылка на почту
 *  через Supabase Auth. Задаётся переменной AUTH_LOGIN_MODE, по умолчанию direct. */
export type LoginMode = "direct" | "magic";

export function loginMode(): LoginMode {
  return process.env.AUTH_LOGIN_MODE === "magic" ? "magic" : "direct";
}
