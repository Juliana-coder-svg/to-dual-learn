import { cache } from "react";
import { redirect } from "next/navigation";
import { getSupabase } from "@/lib/supabase/server";
import { getUserById, type User } from "@/lib/db/queries";

/** Сессия — Supabase Auth (magic link по почте). Токен живёт в cookie, которую
 *  ставит @supabase/ssr; обновляет его src/proxy.ts. Здесь только обёртки. */

/** Текущий пользователь с профилем. Один запрос на рендер: layout и page вызывают оба. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return (await getUserById(user.id)) ?? null;
});

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export function homeFor(user: User): string {
  return user.role === "teacher" ? "/teach" : "/learn";
}
