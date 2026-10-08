import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/server";
import { getCurrentUser, homeFor } from "@/lib/auth/session";
import { takeLoginPrefs } from "@/lib/auth/login-prefs";
import { hasActiveConsent, updateProfile } from "@/lib/db/queries";
import { recordConsents } from "@/lib/legal/consents";
import { CONSENT_VERSION } from "@/lib/legal/versions";
import { safeNextPath } from "@/lib/auth/next-path";

export const runtime = "nodejs";

const OTP_TYPES: EmailOtpType[] = ["magiclink", "email", "signup", "invite", "recovery", "email_change"];

/** Сюда возвращает ссылка из письма. Поддерживаются оба формата Supabase:
 *  PKCE (`?code=`) и token hash (`?token_hash=&type=`), последний удобен для тестов через admin.generateLink. */
export async function GET(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const supabase = await getSupabase();

  let failed: string | null = null;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    failed = error?.message ?? null;
  } else if (tokenHash && type && OTP_TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    failed = error?.message ?? null;
  } else {
    failed = "no code";
  }
  if (failed) {
    console.error("[auth] callback", failed);
    return NextResponse.redirect(new URL("/login?error=link", url.origin));
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login?error=link", url.origin));

  const prefs = await takeLoginPrefs();
  let target = homeFor(user);
  if (prefs) {
    const patch = { role: prefs.role, ...(prefs.name ? { name: prefs.name } : {}) };
    await updateProfile(user.id, patch);
    if (prefs.consents?.length) await recordConsents(user.id, prefs.consents);
    target = safeNextPath(prefs.next) || homeFor({ ...user, ...patch });
  }
  // Ссылку открыли в другом браузере, и отметок формы входа нет: просим согласие ещё раз.
  if (!(await hasActiveConsent(user.id, "processing", CONSENT_VERSION.processing))) {
    return NextResponse.redirect(new URL(`/consent?next=${encodeURIComponent(target)}`, url.origin));
  }
  return NextResponse.redirect(new URL(target, url.origin));
}
