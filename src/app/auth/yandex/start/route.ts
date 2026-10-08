import { NextResponse } from "next/server";
import { yandexConfig } from "@/lib/auth/yandex";
import { beginYandexLogin, parseRole, safeNext } from "@/lib/auth/yandex-flow";
import { getCurrentUser, homeFor } from "@/lib/auth/session";

export const runtime = "nodejs";

/** Начало входа через Яндекс ID по ссылке: /auth/yandex/start?role=teacher&next=/join/КОД.
 *  Кнопка на /login идёт через server action startYandexLogin, здесь то же самое для ссылок. */
export async function GET(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  const role = parseRole(url.searchParams.get("role"));
  const next = safeNext(url.searchParams.get("next"));
  const tail = `role=${role}${next ? `&next=${encodeURIComponent(next)}` : ""}`;

  const cfg = yandexConfig();
  if (!cfg) return NextResponse.redirect(new URL(`/login?yandex=off&${tail}`, url.origin));

  const user = await getCurrentUser();
  if (user) return NextResponse.redirect(new URL(next || homeFor(user), url.origin));

  return NextResponse.redirect(await beginYandexLogin(cfg, { role, next }));
}
