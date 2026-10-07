import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/server";
import { getCurrentUser, homeFor } from "@/lib/auth/session";
import { takeLoginPrefs } from "@/lib/auth/login-prefs";
import { updateProfile } from "@/lib/db/queries";

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
  if (prefs) {
    const patch = { role: prefs.role, ...(prefs.name ? { name: prefs.name } : {}) };
    await updateProfile(user.id, patch);
    return NextResponse.redirect(new URL(prefs.next ?? homeFor({ ...user, ...patch }), url.origin));
  }
  return NextResponse.redirect(new URL(homeFor(user), url.origin));
}
