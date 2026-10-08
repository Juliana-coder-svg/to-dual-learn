import { ensureConsents, type ConsentKind } from "@/lib/db/queries";
import { CONSENT_VERSION } from "./versions";

/** Записывает согласия текущей версии документов. Не server action: файл без "use server",
 *  чтобы функция не стала открытым маршрутом. */
export async function recordConsents(userId: string, kinds: ConsentKind[]): Promise<void> {
  await ensureConsents(userId, kinds.map((kind) => ({ kind, version: CONSENT_VERSION[kind] })));
}
