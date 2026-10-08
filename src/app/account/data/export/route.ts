import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { exportUserData } from "@/lib/db/queries";
import { getSupabase } from "@/lib/supabase/server";
import { LEGAL_VERSIONS } from "@/lib/legal/versions";

export const runtime = "nodejs";

/** Лимит ответа функции Vercel 4,5 МБ: если выгрузка больше, текст материалов отдаём без содержимого. */
const MAX_BYTES = 4 * 1024 * 1024;

/** «Скачать мои данные»: JSON со всеми записями пользователя. Доступ только своей сессии,
 *  запросы идут под RLS с явным фильтром по пользователю (exportUserData). */
export async function GET(): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Нужно войти" }, { status: 401 });
  const data = await exportUserData(user.id);
  if (!data) return NextResponse.json({ ok: false, error: "Профиль не найден" }, { status: 404 });
  const {
    data: { user: authUser },
  } = await (await getSupabase()).auth.getUser();

  const payload: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    service: "To Dual Learn",
    documents_version: LEGAL_VERSIONS,
    account: authUser ? { email: authUser.email, created_at: authUser.created_at, last_sign_in_at: authUser.last_sign_in_at ?? null } : null,
    ...data,
  };
  let body = JSON.stringify(payload, null, 2);
  if (Buffer.byteLength(body) > MAX_BYTES) {
    payload.materials = data.materials.map((m) => ({ ...m, content_text: null }));
    payload.note = "Выгрузка больше лимита: текст материалов не включён, полный текст пришлём по запросу.";
    body = JSON.stringify(payload, null, 2);
    if (Buffer.byteLength(body) > MAX_BYTES) {
      return NextResponse.json({ ok: false, error: "Выгрузка слишком большая для одного файла. Напишите нам, пришлём архив по запросу." }, { status: 413 });
    }
  }
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="to-dual-learn-data-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
