import { cache } from "react";
import { redirect } from "next/navigation";
import { getSupabase } from "@/lib/supabase/server";
import { getUserById, hasActiveConsent, type User } from "@/lib/db/queries";
import { CONSENT_VERSION } from "@/lib/legal/versions";

/** Сессия — Supabase Auth (magic link по почте). Токен живёт в cookie, которую
 *  ставит @supabase/ssr; обновляет его src/proxy.ts. Здесь только обёртки. */

/** Id вошедшего пользователя из JWT в cookie. Подпись проверяется локально по JWKS (getClaims),
 *  без запроса к Auth: это экономит один круг до Supabase (~300 мс) на каждой странице. */
export const getCurrentUserId = cache(async (): Promise<string | null> => {
  const supabase = await getSupabase();
  const { data } = await supabase.auth.getClaims();
  return data?.claims.sub ?? null;
});

/** Профиль и действующее согласие на обработку одним заходом (запросы параллельно),
 *  чтобы проверка согласия в AppShell не добавляла круг до базы. */
const loadCurrent = cache(async (): Promise<{ user: User; consented: boolean } | null> => {
  const id = await getCurrentUserId();
  if (!id) return null;
  const [profile, consented] = await Promise.all([
    getUserById(id),
    hasActiveConsent(id, "processing", CONSENT_VERSION.processing),
  ]);
  if (!profile) return null;
  return { user: profile, consented };
});

/** Текущий пользователь с профилем. Один запрос на рендер: layout и page вызывают оба. */
export const getCurrentUser = cache(async (): Promise<User | null> => (await loadCurrent())?.user ?? null);

/** Есть ли у текущего пользователя действующее согласие на обработку в текущей версии документов. */
export async function currentUserConsented(): Promise<boolean> {
  return (await loadCurrent())?.consented ?? false;
}

/** Id пользователя без похода за профилем: чтобы страница могла грузить профиль и данные параллельно. */
export async function requireUserId(): Promise<string> {
  const id = await getCurrentUserId();
  if (!id) redirect("/login");
  return id;
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export function homeFor(user: User): string {
  return user.role === "teacher" ? "/teach" : "/learn";
}
