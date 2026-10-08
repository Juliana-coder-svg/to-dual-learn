/** Путь «куда вернуть после входа» из формы, cookie или query. Принимаем только относительный путь
 *  внутри сайта: `//evil.com` и `/\evil.com` браузер и `new URL()` читают как другой хост. */
export function safeNextPath(v: unknown): string {
  if (typeof v !== "string" || !v.startsWith("/") || /[\\]/.test(v) || v.startsWith("//")) return "";
  try {
    const base = "http://local.invalid";
    const url = new URL(v, base);
    if (url.origin !== base) return "";
    return url.pathname + url.search;
  } catch {
    return "";
  }
}
