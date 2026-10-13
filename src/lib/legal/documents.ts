import { readFileSync } from "node:fs";
import path from "node:path";
import { LEGAL_VERSIONS, type LegalSlug } from "./versions";

/** Тексты документов живут в docs/legal/*.md: их правят юрист и compliance, а здесь мы
 *  вырезаем служебные части (пометки «требует проверки юристом», блоки «условие публикации»,
 *  чек-листы, инструкции разработке) и отдаём то, что можно показать пользователю.
 *  Файлы в docs не меняем. Если юрист добавит новый вид пометки, защита в конце роняет сборку,
 *  чтобы служебный текст не попал на сайт. Читается только на сборке: страницы /legal статические. */

const FILES: Record<LegalSlug, string> = {
  consent: "consent.md",
  privacy: "privacy-policy.md",
  terms: "terms.md",
};

/** Разделы, которые целиком не показываем (заголовок любого уровня, до следующего такого же или выше). */
const DROP_SECTIONS = ["Чек-лист публикации", "Для юриста", "Что должна сделать разработка", "Если пользователь младше 18 лет"];

/** Заголовки, которые убираем как строку, оставляя содержимое. */
const UNWRAP_HEADINGS = ["Полный текст"];

const SERVICE_MARK = /проверки юристом|условие публикации|требует утверждения|\.md\b/i;

export interface LegalDocument {
  slug: LegalSlug;
  title: string;
  version: string;
  body: string;
}

function headingLevel(line: string): number {
  const m = /^(#{1,6})\s/.exec(line);
  return m ? m[1].length : 0;
}

function headingText(line: string): string {
  return line.replace(/^#{1,6}\s+/, "").trim();
}

function cleanLine(line: string): string {
  let s = line;
  // «(условие публикации: …)» внутри строки помечает всё предложение как ещё не верное: убираем предложение целиком.
  s = s.replace(/[^.!?]*\([^()]*условие публикации[^()]*\)[.!?]?/gi, "");
  // Вставки в скобках: «(требует проверки юристом: …)», «(…, требует утверждения)».
  s = s.replace(/\s*\([^()]*(?:требует проверки юристом|требует утверждения)[^()]*\)/gi, "");
  // Хвосты внутри скобки или перед точкой: «…, требует проверки юристом)» и «…, проверить по тексту)».
  s = s.replace(/,\s*требует проверки юристом(?=[).])/gi, "");
  s = s.replace(/,\s*(?:срок\s+)?проверить(?:\s+по\s+(?:актуальному\s+)?тексту)?(?=[).])/gi, "");
  // Пометки, после которых до конца строки идёт служебный текст.
  // Без \b: в JS без флага u граница слова не работает после кириллицы.
  s = s.replace(/\s*(?:Требует проверки юристом|Условие публикации|Вариант для пункта).*$/i, "");
  // Ссылки → текст; буквальное « [ссылка]» убираем, плейсхолдеры [ИНН] и подобные оставляем.
  s = s.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  s = s.replace(/\s*\[ссылка\]/gi, "");
  return s.replace(/[ \t]+$/g, "");
}

export function loadLegalDocument(slug: LegalSlug): LegalDocument {
  const file = FILES[slug];
  const raw = readFileSync(path.join(process.cwd(), "docs", "legal", file), "utf8").replace(/\r\n/g, "\n");

  const versionMatch = /^Версия проекта:\s*([^,\n]+)/m.exec(raw);
  const version = versionMatch?.[1].trim() ?? "";
  if (version !== LEGAL_VERSIONS[slug]) {
    throw new Error(`${file}: версия в файле «${version}» не совпадает с LEGAL_VERSIONS.${slug} = «${LEGAL_VERSIONS[slug]}». Обновите src/lib/legal/versions.ts.`);
  }

  // 1. Служебное вступление: всё до первого разделителя «---».
  const lines = raw.split("\n");
  const firstRule = lines.findIndex((l) => /^-{3,}\s*$/.test(l));
  const body = firstRule >= 0 ? lines.slice(firstRule + 1) : lines;

  // 2. Разделы из стоп-списка и заголовки-обёртки.
  const kept: string[] = [];
  let dropLevel = 0;
  for (const line of body) {
    const level = headingLevel(line);
    if (level > 0) {
      const text = headingText(line);
      if (dropLevel > 0 && level <= dropLevel) dropLevel = 0;
      if (dropLevel === 0 && DROP_SECTIONS.some((h) => text.startsWith(h))) {
        dropLevel = level;
        continue;
      }
      if (dropLevel === 0 && UNWRAP_HEADINGS.includes(text)) continue;
    }
    if (dropLevel > 0) continue;
    kept.push(line);
  }

  // 3. Строки: вставки внутри, затем строки с условиями публикации целиком.
  const cleaned: string[] = [];
  let skipQuote = false;
  for (const original of kept) {
    const startsWithCondition = /^\s*Условие публикации/i.test(original);
    const line = cleanLine(original);
    if (startsWithCondition || /публикац/i.test(line) && /условие|публиковать|к публикации/i.test(line)) {
      // Условие и цитата после него — текст, который публиковать нельзя, пока условие не выполнено.
      skipQuote = startsWithCondition;
      continue;
    }
    if (line.startsWith(">")) {
      if (skipQuote) continue;
      cleaned.push(line.replace(/^>\s?/, ""));
      continue;
    }
    if (line.trim() !== "") skipQuote = false;
    cleaned.push(line);
  }

  // 4. Заголовки без содержимого, пустые строки подряд, разделители по краям.
  const compact: string[] = [];
  for (let i = 0; i < cleaned.length; i++) {
    const line = cleaned[i];
    if (headingLevel(line) > 0) {
      const level = headingLevel(line);
      let j = i + 1;
      while (j < cleaned.length && cleaned[j].trim() === "") j++;
      const nextLevel = j < cleaned.length ? headingLevel(cleaned[j]) : 0;
      if (j >= cleaned.length || (nextLevel > 0 && nextLevel <= level)) continue;
    }
    if (line.trim() === "" && (compact.length === 0 || compact[compact.length - 1].trim() === "")) continue;
    compact.push(line);
  }
  while (compact.length > 0 && /^(-{3,})?\s*$/.test(compact[compact.length - 1])) compact.pop();
  while (compact.length > 0 && /^(-{3,})?\s*$/.test(compact[0])) compact.shift();

  const text = compact.join("\n");
  const bad = text.split("\n").find((l) => SERVICE_MARK.test(l));
  if (bad) throw new Error(`${file}: в тексте для публикации осталась служебная пометка: «${bad.slice(0, 80)}». Дополните правила в src/lib/legal/documents.ts.`);

  // Первый заголовок — название документа; страница выводит его сама, из тела убираем.
  const titleIndex = compact.findIndex((l) => headingLevel(l) > 0);
  const title = titleIndex >= 0 ? headingText(compact[titleIndex]) : slug;
  if (titleIndex >= 0) compact.splice(titleIndex, 1);
  while (compact.length > 0 && compact[0].trim() === "") compact.shift();
  return { slug, title, version, body: compact.join("\n") };
}
