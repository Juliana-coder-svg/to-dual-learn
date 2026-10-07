import { cache } from "react";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseEnv } from "./env";
import type { Database } from "./types";

/** Серверный клиент для Server Components, server actions и route handlers.
 *  Работает от имени пользователя из cookie-сессии, доступ к строкам проверяет RLS.
 *  Один клиент на запрос: React cache() переживает вызовы из разных функций одного рендера. */
export const getSupabase = cache(async () => {
  const cookieStore = await cookies();
  const { url, anonKey } = supabaseEnv();
  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Server Component не может писать cookie. Сессию обновляет src/proxy.ts.
        }
      },
    },
  });
});

export type SupabaseServerClient = Awaited<ReturnType<typeof getSupabase>>;
