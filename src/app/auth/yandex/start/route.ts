import { NextResponse } from "next/server";
import { yandexConfig } from "@/lib/auth/yandex";
import { parseRole, requestOrigin, safeNext } from "@/lib/auth/yandex-flow";
import { getCurrentUser, homeFor } from "@/lib/auth/session";

export const runtime = "nodejs";

/** Вход через Яндекс ID по ссылке: /auth/yandex/start?role=teacher&next=/join/КОД.
 *  Сразу к Яндексу не ведём: по ссылке негде отметить согласие на обработку данных, а аккаунт
 *  без согласия создавать нельзя. Поэтому отправляем на /login с ролью и адресом возврата,
 *  где кнопка «Войти с Яндекс ID» идёт через server action startYandexLogin вместе с чекбоксами. */
export async function GET(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  const origin = await requestOrigin();
  const role = parseRole(url.searchParams.get("role"));
  const next = safeNext(url.searchParams.get("next"));
  const tail = `role=${role}${next ? `&next=${encodeURIComponent(next)}` : ""}`;

  const user = await getCurrentUser();
  if (user) return NextResponse.redirect(new URL(next || homeFor(user), origin));

  const cfg = yandexConfig();
  if (!cfg) return NextResponse.redirect(new URL(`/login?yandex=off&${tail}`, origin));
  return NextResponse.redirect(new URL(`/login?${tail}`, origin));
}
