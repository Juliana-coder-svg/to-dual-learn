import { cache } from "react";
import { redirect } from "next/navigation";
import { getSupabase } from "@/lib/supabase/server";
import { getUserById, hasActiveConsent, type User } from "@/lib/db/queries";
import { CONSENT_VERSION } from "@/lib/legal/versions";

/** Сессия — Supabase Auth (magic link по почте). Токен живёт в cookie, которую
 *  ставит @supabase/ssr; обновляет его src/proxy.ts. Здесь только обёртки. */

/** Профиль и действующее согласие на обработку одним заходом (запросы параллельно),
 *  чтобы проверка согласия в AppShell не добавляла круг до базы. */
const loadCurrent = cache(async (): Promise<{ user: User; consented: boolean } | null> => {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const [profile, consented] = await Promise.all([
    getUserById(user.id),
    hasActiveConsent(user.id, "processing", CONSENT_VERSION.processing),
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

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export function homeFor(user: User): string {
  return user.role === "teacher" ? "/teach" : "/learn";
}
