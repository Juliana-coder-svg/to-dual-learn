"use server";

import { redirect } from "next/navigation";
import type { ConsentKind } from "@/lib/db/queries";
import { yandexConfig } from "@/lib/auth/yandex";
import { beginYandexLogin, parseRole, safeNext } from "@/lib/auth/yandex-flow";

/** Согласия из формы входа, те же правила, что у входа по почте (src/lib/actions/auth.ts):
 *  без согласия на обработку входа нет, соглашение принимается кнопкой, письма по отдельному чекбоксу. */
function parseConsents(formData: FormData): ConsentKind[] | null {
  if (formData.get("consent_processing") !== "1") return null;
  const kinds: ConsentKind[] = ["processing", "terms"];
  if (formData.get("consent_marketing") === "1") kinds.push("marketing");
  return kinds;
}

/** Кнопка «Войти с Яндекс ID» внутри формы входа: берёт из формы роль, адрес возврата и согласия,
 *  почту и имя не читает. Дальше тот же путь, что у /auth/yandex/callback. */
export async function startYandexLogin(formData: FormData): Promise<void> {
  const role = parseRole(formData.get("role"));
  const next = safeNext(formData.get("next"));
  const tail = `role=${role}${next ? `&next=${encodeURIComponent(next)}` : ""}`;
  const consents = parseConsents(formData);
  if (!consents) redirect(`/login?error=consent&${tail}`);
  const cfg = yandexConfig();
  if (!cfg) redirect(`/login?yandex=off&${tail}`);
  redirect(await beginYandexLogin(cfg, { role, next, consents }));
}
