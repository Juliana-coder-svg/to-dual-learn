import { cache } from "react";
import { redirect } from "next/navigation";
import { getSupabase } from "@/lib/supabase/server";
import { getUserById, type User } from "@/lib/db/queries";

/** Сессия — Supabase Auth (magic link по почте). Токен живёт в cookie, которую
 *  ставит @supabase/ssr; обновляет его src/proxy.ts. Здесь только обёртки. */

/** Id вошедшего пользователя из JWT в cookie. Подпись проверяется локально по JWKS (getClaims),
 *  без запроса к Auth: это экономит один круг до Supabase (~300 мс) на каждой странице. */
export const getCurrentUserId = cache(async (): Promise<string | null> => {
  const supabase = await getSupabase();
  const { data } = await supabase.auth.getClaims();
  return data?.claims.sub ?? null;
});

/** Текущий пользователь с профилем. Один запрос на рендер: layout и page вызывают оба. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const id = await getCurrentUserId();
  if (!id) return null;
  return (await getUserById(id)) ?? null;
});

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export function homeFor(user: User): string {
  return user.role === "teacher" ? "/teach" : "/learn";
}
