import type { ConsentKind } from "@/lib/supabase/types";

/** Версии документов из docs/legal/*.md (строка «Версия проекта: …»). При выпуске новой версии
 *  поднять число здесь и в файле: загрузчик сверяет их и роняет сборку при расхождении,
 *  а пользователям со старой версией согласия снова показывается /consent. */
export const LEGAL_VERSIONS = { consent: "0.1", privacy: "0.1", terms: "0.1" } as const;

export type LegalSlug = keyof typeof LEGAL_VERSIONS;

/** Что именно принимал пользователь: записывается в consents.version. */
export const CONSENT_VERSION: Record<ConsentKind, string> = {
  processing: `consent:${LEGAL_VERSIONS.consent};privacy:${LEGAL_VERSIONS.privacy}`,
  marketing: `consent:${LEGAL_VERSIONS.consent}`,
  terms: `terms:${LEGAL_VERSIONS.terms}`,
};
