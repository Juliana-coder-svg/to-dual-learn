"use server";

import { redirect } from "next/navigation";
import { setUserRole, upsertUser, type Role } from "@/lib/db/queries";
import { clearSession, homeFor, requireUser, setSession } from "@/lib/auth/session";

function parseRole(v: FormDataEntryValue | null): Role {
  return v === "teacher" ? "teacher" : "student";
}

export async function login(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!email.includes("@") || name.length < 2) redirect("/login?error=1");
  const user = upsertUser({ email, name, role: parseRole(formData.get("role")) });
  await setSession(user.id);
  redirect(homeFor(user));
}

export async function logout(): Promise<void> {
  await clearSession();
  redirect("/");
}

export async function switchRole(): Promise<void> {
  const user = await requireUser();
  const role: Role = user.role === "teacher" ? "student" : "teacher";
  setUserRole(user.id, role);
  redirect(role === "teacher" ? "/teach" : "/learn");
}
