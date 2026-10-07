/** Расход на модель считается в долларах (так выставляют счёт Anthropic и OpenRouter),
 *  а показывается в рублях по курсу из USD_RUB_RATE. Это оценка, точная сумма в кабинете поставщика. */
export function usdRubRate(): number {
  const v = Number(process.env.USD_RUB_RATE);
  return Number.isFinite(v) && v > 0 ? v : 90;
}

export function usdToRub(usd: number): number {
  return usd * usdRubRate();
}

export function formatRub(rub: number): string {
  const rounded = rub < 10 ? Math.round(rub * 10) / 10 : Math.round(rub);
  return `${rounded.toLocaleString("ru-RU")} ₽`;
}
