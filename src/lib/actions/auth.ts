"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabase } from "@/lib/supabase/server";
import { setUserRole, type Role } from "@/lib/db/queries";
import { homeFor, requireUser } from "@/lib/auth/session";
import { setLoginPrefs } from "@/lib/auth/login-prefs";

function parseRole(v: FormDataEntryValue | null): Role {
  return v === "teacher" ? "teacher" : "student";
}

/** Адрес приложения для ссылки в письме. Должен быть в Redirect URLs проекта Supabase. */
async function siteOrigin(): Promise<string> {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Отправляет magic link. Имя и роль уходят в user_metadata (для нового пользователя)
 *  и в cookie (для обновления профиля существующего после перехода по ссылке). */
export async function login(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const role = parseRole(formData.get("role"));
  if (!email.includes("@") || name.length < 2) redirect("/login?error=1");

  const supabase = await getSupabase();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      data: { name, role },
      emailRedirectTo: `${await siteOrigin()}/auth/callback`,
    },
  });
  if (error) {
    console.error("[auth] signInWithOtp", error.message);
    redirect(`/login?error=send&role=${role}`);
  }
  await setLoginPrefs({ name, role });
  redirect(`/login?sent=1&role=${role}`);
}

export async function logout(): Promise<void> {
  const supabase = await getSupabase();
  await supabase.auth.signOut();
  redirect("/");
}

export async function switchRole(): Promise<void> {
  const user = await requireUser();
  const role: Role = user.role === "teacher" ? "student" : "teacher";
  await setUserRole(user.id, role);
  redirect(homeFor({ ...user, role }));
}
