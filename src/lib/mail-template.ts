/**
 * Вёрстка письма «урок дня» в цветах и характере интерфейса (docs/design.md, разделы «Письмо» и «Стиль опроса»: графит, #F6F6F4, радиусы 12/20).
 * HTML-почта не знает переменных CSS, next/font и oklch, поэтому токены переведены в hex, вёрстка табличная,
 * стили встроенные, шрифт Onest с системным запасным (почтовые клиенты его не подгрузят). Без градиентов, теней и картинок:
 * звёздочка логотипа набрана символом, а не файлом, чтобы её не блокировали «картинки по запросу».
 */

const C = {
  primary: "#FF4A07",
  primaryStrong: "#C43C00",
  primarySoft: "#FBEEE7",
  foreground: "#161616",
  muted: "#6B6B66",
  border: "#E6E5E1",
  surface: "#F6F6F4",
  white: "#FFFFFF",
} as const;

const FONT = "Onest, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

export const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export interface DailyMailItem {
  href: string;
  /** Уже экранированный HTML-текст ссылки. */
  html: string;
}

export interface DailyMailInput {
  name: string;
  items: DailyMailItem[];
  /** Ссылка и число карточек на повторение; null, если повторять нечего. */
  due: { href: string; count: number } | null;
  streakLine: string;
  settingsHref: string;
}

/** Письмо: шапка с логотипом, приветствие, строки-ссылки в рамке, строка про серию и подвал. Тексты не менялись, только вёрстка. */
export function dailyMailHtml({ name, items, due, streakLine, settingsHref }: DailyMailInput): string {
  const rows = [
    ...items.map((i) => ({ href: i.href, html: i.html })),
    ...(due ? [{ href: due.href, html: `Повторить карточки: ${due.count}` }] : []),
  ];
  const list = rows
    .map(
      (r, i) =>
        `<tr><td style="padding:14px 16px;${i > 0 ? `border-top:1px solid ${C.border};` : ""}font-size:16px;line-height:1.45;"><a href="${r.href}" style="color:${C.foreground};font-weight:500;text-decoration:underline;">${r.html}</a></td></tr>`,
    )
    .join("");
  return `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Урок дня</title></head><body style="margin:0;padding:0;background:${C.surface};">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${C.surface};"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:${C.white};border:1px solid ${C.border};border-radius:20px;font-family:${FONT};color:${C.foreground};">
<tr><td style="padding:20px 24px 0 24px;font-size:16px;font-weight:500;letter-spacing:0.04em;"><span style="color:${C.primary};font-size:20px;">&#10033;</span>&nbsp;TO DUAL</td></tr>
<tr><td style="padding:20px 24px 0 24px;font-size:20px;line-height:1.35;font-weight:500;">${escapeHtml(name)}, на сегодня:</td></tr>
<tr><td style="padding:16px 24px 0 24px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid ${C.border};border-radius:12px;">${list}</table></td></tr>
<tr><td style="padding:16px 24px 0 24px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${C.primarySoft};border-radius:12px;"><tr><td style="padding:14px 16px;font-size:16px;line-height:1.5;">${streakLine}</td></tr></table></td></tr>
<tr><td style="padding:20px 24px 24px 24px;font-size:14px;line-height:1.5;color:${C.muted};">Отключить письма можно на <a href="${settingsHref}" style="color:${C.muted};text-decoration:underline;">странице «Мои данные»</a>.</td></tr>
</table></td></tr></table>
</body></html>`;
}
