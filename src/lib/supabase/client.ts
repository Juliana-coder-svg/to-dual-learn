"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "./env";
import type { Database } from "./types";

/** Клиент для client components. Сейчас страницы ходят в базу только с сервера,
 *  клиент пригодится для realtime или загрузки файлов в Storage. */
export function createClient() {
  const { url, anonKey } = supabaseEnv();
  return createBrowserClient<Database>(url, anonKey);
}
