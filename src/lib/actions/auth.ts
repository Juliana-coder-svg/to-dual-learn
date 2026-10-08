"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createServiceClient, getSupabase } from "@/lib/supabase/server";
import { setDailyEmail, setUserRole, updateProfile, type ConsentKind, type Role } from "@/lib/db/queries";
import { getCurrentUser, homeFor, requireUser } from "@/lib/auth/session";
import { setLoginPrefs } from "@/lib/auth/login-prefs";
import { loginMode } from "@/lib/auth/mode";
import { recordConsents } from "@/lib/legal/consents";
import { safeNextPath } from "@/lib/auth/next-path";

function parseRole(v: FormDataEntryValue | null): Role {
  return v === "teacher" ? "teacher" : "student";
}

/** Согласия из формы входа: обязательное на обработку (без него null), соглашение принимается кнопкой,
 *  письма о программах по отдельному чекбоксу. */
function parseConsents(formData: FormData): ConsentKind[] | null {
  if (formData.get("consent_processing") !== "1") return null;
  const kinds: ConsentKind[] = ["processing", "terms"];
  if (formData.get("consent_marketing") === "1") kinds.push("marketing");
  return kinds;
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

/** Вход. В режиме direct — сразу, без письма; в режиме magic — ссылка на почту.
 *  Имя и роль уходят в user_metadata (для нового пользователя) и в профиль (для существующего). */
export async function login(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const role = parseRole(formData.get("role"));
  if (!email.includes("@") || name.length < 2) redirect("/login?error=1");
  const safeNext = safeNextPath(formData.get("next"));
  const consents = parseConsents(formData);
  if (!consents) redirect(`/login?error=consent&role=${role}${safeNext ? `&next=${encodeURIComponent(safeNext)}` : ""}`);

  if (loginMode() === "direct") {
    const failed = await loginDirect(email, name, role, consents);
    if (failed) {
      console.error("[auth] direct login", failed);
      redirect(`/login?error=send&role=${role}${safeNext ? `&next=${encodeURIComponent(safeNext)}` : ""}`);
    }
    const user = await getCurrentUser();
    redirect(safeNext || (user ? homeFor(user) : "/login"));
  }

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
    const kind = error.code === "email_address_invalid" ? "email" : "send";
    redirect(`/login?error=${kind}&role=${role}${safeNext ? `&next=${encodeURIComponent(safeNext)}` : ""}`);
  }
  await setLoginPrefs({ name, role, next: safeNext, consents });
  redirect(`/login?sent=1&role=${role}`);
}

/** Согласие для уже вошедшего пользователя: старая сессия или ссылка из письма, открытая
 *  в другом браузере, где cookie с отметками формы входа нет. */
export async function acceptConsentAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const safeNext = safeNextPath(formData.get("next"));
  const consents = parseConsents(formData);
  if (!consents) redirect(`/consent?error=consent${safeNext ? `&next=${encodeURIComponent(safeNext)}` : ""}`);
  await recordConsents(user.id, consents);
  redirect(safeNext || homeFor(user));
}

/** Вход без письма: service role выпускает одноразовый токен входа, мы тут же подтверждаем его
 *  от имени пользователя, и @supabase/ssr кладёт сессию в cookie. Письмо при этом не отправляется.
 *  Возвращает текст ошибки или null. */
async function loginDirect(email: string, name: string, role: Role, consents: ConsentKind[]): Promise<string | null> {
  const admin = createServiceClient();
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email, options: { data: { name, role } } });
  if (error) return error.message;
  const supabase = await getSupabase();
  const { data: session, error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: data.properties.hashed_token,
    type: data.properties.verification_type as EmailOtpType,
  });
  if (verifyError) return verifyError.message;
  if (session.user) {
    await updateProfile(session.user.id, { name, role });
    await recordConsents(session.user.id, consents);
  }
  return null;
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

export async function setDailyEmailAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  await setDailyEmail(user.id, formData.get("enabled") === "1");
  redirect("/learn");
}
