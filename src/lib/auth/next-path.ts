/** Путь «куда вернуть после входа» из формы, cookie или query. Принимаем только относительный путь
 *  внутри сайта: `//evil.com` и `/\evil.com` браузер и `new URL()` читают как другой хост.
 *  Проверяем уже нормализованный pathname, а не вход: `/.//evil.com` после разбора становится `//evil.com`. */
export function safeNextPath(v: unknown): string {
  if (typeof v !== "string" || !v.startsWith("/")) return "";
  try {
    const base = "http://local.invalid";
    const url = new URL(v, base);
    if (url.origin !== base) return "";
    const path = url.pathname;
    if (!path.startsWith("/") || path.startsWith("//") || /[\\]/.test(path) || /[\\]/.test(url.search)) return "";
    return "/" + path.replace(/^\/+/, "") + url.search;
  } catch {
    return "";
  }
}
