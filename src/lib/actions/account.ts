"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { listOwnedCoursesWithStudents, withdrawConsent } from "@/lib/db/queries";
import { recordConsents } from "@/lib/legal/consents";
import { createServiceClient, getSupabase } from "@/lib/supabase/server";

/** Письма о программах To Dual: отдельное согласие, включается и отзывается на странице «Мои данные». */
export async function setMarketingConsentAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (formData.get("enabled") === "1") await recordConsents(user.id, ["marketing"]);
  else await withdrawConsent(user.id, "marketing");
  revalidatePath("/account/data");
  redirect("/account/data");
}

/** Отзыв согласия и удаление аккаунта. Удаляет пользователя из Supabase Auth через service role:
 *  каскад убирает профиль, согласия, записи на курсы, ответы, карточки, учёт вызовов и курсы без студентов
 *  со всем содержимым. Если на курсах пользователя есть другие люди, удаление заблокировано:
 *  иначе пропали бы их ответы (docs/legal/data-map.md, раздел 6). */
export async function deleteAccountAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const confirm = String(formData.get("confirm") ?? "").trim().toLowerCase();
  if (confirm !== user.email.toLowerCase()) redirect("/account/data?error=confirm");
  if ((await listOwnedCoursesWithStudents(user.id)).length > 0) redirect("/account/data?error=courses");

  const { error } = await createServiceClient().auth.admin.deleteUser(user.id);
  if (error) {
    // Почту в лог не пишем.
    console.error("[account] delete", user.id, error.message);
    redirect("/account/data?error=delete");
  }
  await (await getSupabase()).auth.signOut({ scope: "local" });
  redirect("/login?deleted=1");
}
