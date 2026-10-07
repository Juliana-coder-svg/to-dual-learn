/** Разбор CSV без зависимостей: кавычки, запятые и точки с запятой, переносы внутри кавычек. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  const src = text.replace(/^﻿/, "");
  const delimiter = (src.split("\n")[0]?.split(";").length ?? 0) > (src.split("\n")[0]?.split(",").length ?? 0) ? ";" : ",";
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else cell += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === delimiter) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}

/** CSV с колонками «имя, ответ» (заголовок необязателен) → текст формата «## Имя\nответ». */
export function csvToWorks(text: string): string {
  const rows = parseCsv(text);
  if (rows.length === 0) return "";
  const first = rows[0].map((c) => c.trim().toLowerCase());
  const nameIdx = Math.max(0, first.findIndex((c) => /имя|фио|student|name/.test(c)));
  const answerIdx = (() => { const i = first.findIndex((c) => /ответ|работа|answer|text/.test(c)); return i === -1 ? (nameIdx === 0 ? 1 : 0) : i; })();
  const hasHeader = first.some((c) => /имя|фио|student|name|ответ|работа|answer|text/.test(c));
  return rows
    .slice(hasHeader ? 1 : 0)
    .map((r) => `## ${(r[nameIdx] ?? "").trim() || "Без имени"}\n${(r[answerIdx] ?? "").trim()}`)
    .join("\n\n");
}

export function toCsv(rows: (string | number)[][]): string {
  return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\r\n");
}
