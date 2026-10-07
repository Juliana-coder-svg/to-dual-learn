import { cookies } from "next/headers";
import type { Role } from "@/lib/db/queries";

/** Имя и роль из формы входа. Supabase применяет user_metadata только при первой
 *  регистрации, а нам нужно обновлять их при каждом входе, как раньше. Поэтому форма
 *  кладёт их в короткоживущую cookie, а callback magic link переносит в profiles. */

const COOKIE = "tdd_login_prefs";
const MAX_AGE_SEC = 60 * 30;

export interface LoginPrefs {
  name: string;
  role: Role;
  /** Куда вернуть после входа (например, /join/КОД). Только относительный путь. */
  next?: string;
}

export async function setLoginPrefs(prefs: LoginPrefs): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, JSON.stringify(prefs), { httpOnly: true, sameSite: "lax", path: "/", maxAge: MAX_AGE_SEC });
}

export async function takeLoginPrefs(): Promise<LoginPrefs | null> {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (!raw) return null;
  store.delete(COOKIE);
  try {
    const parsed = JSON.parse(raw) as { name?: unknown; role?: unknown; next?: unknown };
    const name = typeof parsed.name === "string" ? parsed.name.trim() : "";
    const role: Role = parsed.role === "teacher" ? "teacher" : "student";
    const next = typeof parsed.next === "string" && parsed.next.startsWith("/") && !parsed.next.startsWith("//") ? parsed.next : undefined;
    return { name: name.length >= 2 ? name : "", role, next };
  } catch {
    return null;
  }
}
