import { redirect } from "next/navigation";
import { getCurrentUser, homeFor } from "@/lib/auth/session";

/** Точка входа для вошедших: лендинг статический и не знает о сессии, поэтому его клиентский
 *  SessionRedirect отправляет сюда, а роль и главную страницу определяем уже на сервере. */
export async function GET(): Promise<never> {
  const user = await getCurrentUser();
  redirect(user ? homeFor(user) : "/login");
}
