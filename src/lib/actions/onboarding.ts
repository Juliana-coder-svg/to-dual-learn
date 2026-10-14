"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth/session";
import { START_HIDDEN_COOKIE } from "@/lib/onboarding/teacher-steps";

/** «Скрыть» на панели «С чего начать». Флажок в cookie браузера: панель не возвращается после обновления,
 *  а страница «Как это работает» остаётся в шапке. */
export async function hideStartPanelAction(): Promise<void> {
  await requireUserId();
  (await cookies()).set(START_HIDDEN_COOKIE, "1", { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", httpOnly: true });
  redirect("/teach");
}
