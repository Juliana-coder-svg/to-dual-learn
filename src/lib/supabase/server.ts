import { cache } from "react";
import { AsyncLocalStorage } from "node:async_hooks";
import { cookies } from "next/headers";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { supabaseEnv } from "./env";
import type { Database } from "./types";

export type SupabaseServerClient = SupabaseClient<Database>;

/** Клиент от имени пользователя из cookie-сессии. Доступ к строкам проверяет RLS.
 *  Один клиент на запрос: React cache() переживает вызовы из разных функций одного рендера. */
const getUserSupabase = cache(async (): Promise<SupabaseServerClient> => {
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

const serviceScope = new AsyncLocalStorage<SupabaseServerClient>();

/** Клиент с service-role ключом: RLS не действует. Только для фоновых задач без пользователя (крон)
 *  и для admin API (вход без письма). В Server Components и клиентский код не передавать. */
export function createServiceClient(): SupabaseServerClient {
  const { url } = supabaseEnv();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Не задан SUPABASE_SERVICE_ROLE_KEY.");
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Выполняет fn так, что все запросы из src/lib/db/queries.ts внутри идут от service role.
 *  Нужно крону: у него нет пользователя, а RLS без сессии не отдаёт ни одной строки. */
export function runAsService<T>(fn: () => Promise<T>): Promise<T> {
  return serviceScope.run(createServiceClient(), fn);
}

/** Клиент для текущего контекста: service role внутри runAsService, иначе пользовательский. */
export async function getSupabase(): Promise<SupabaseServerClient> {
  return serviceScope.getStore() ?? getUserSupabase();
}
