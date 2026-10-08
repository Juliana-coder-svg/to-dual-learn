import { randomBytes, randomUUID } from "node:crypto";

export const newId = (): string => randomUUID();

export const nowIso = (): string => new Date().toISOString();

/** Короткий код для входа студентов в курс. Без похожих символов (0/O, 1/I). */
export function newJoinCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Id из адреса проверяем до запросов: на не-uuid PostgREST отвечает ошибкой 22P02, а не пустотой. */
export function isUuid(id: string): boolean {
  return UUID.test(id);
}
