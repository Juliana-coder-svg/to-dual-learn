"use server";

import { redirect } from "next/navigation";
import { yandexConfig } from "@/lib/auth/yandex";
import { beginYandexLogin, parseRole, safeNext } from "@/lib/auth/yandex-flow";

/** Кнопка «Войти с Яндекс ID» внутри формы входа: берёт из формы роль и адрес возврата,
 *  почту и имя не читает. Дальше тот же путь, что у GET /auth/yandex/start. */
export async function startYandexLogin(formData: FormData): Promise<void> {
  const role = parseRole(formData.get("role"));
  const next = safeNext(formData.get("next"));
  const cfg = yandexConfig();
  if (!cfg) redirect(`/login?yandex=off&role=${role}${next ? `&next=${encodeURIComponent(next)}` : ""}`);
  redirect(await beginYandexLogin(cfg, { role, next }));
}
