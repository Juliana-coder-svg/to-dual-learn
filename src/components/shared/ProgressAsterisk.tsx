import { cn } from "@/lib/utils";

/**
 * Звёздочка To Dual как индикатор прогресса. Шесть лучей это шесть долей круга: заполняются оранжевым
 * по часовой от верхнего луча пропорционально доле пройденного, последний луч частично, длиной отрезка.
 * На нуле лучи серые, в центре оранжевая точка. Рядом всегда число («3 из 5»): звёздочка не заменяет счёт,
 * а даёт ему форму. `due`: пройденные лучи точками, карточки ждут повторения. `thinking`: та же звёздочка
 * вращается, прогресса нет, цвет от currentColor (белая на оранжевой кнопке).
 *
 * Не логотип. В шапке, фавиконе и рядом со словами TO DUAL или LEARN стоит целая `Asterisk`.
 * Этот компонент живёт только внутри интерфейса рядом с числом. Правила чтения: docs/design.md.
 */

const SIZES = {
  16: "size-4",
  24: "size-6",
  40: "size-10",
  96: "size-24",
} as const;

const RAYS = 6;
/** Геометрия как у `Asterisk`: viewBox 24, центр 12, луч 9.5, штрих 3.2 с круглыми концами. */
const CENTER = 12;
const RAY = 9.5;
const STROKE = 3.2;

type Value = number | { done: number; total: number };

function fraction(value: Value): number {
  const v = typeof value === "number" ? value : value.total > 0 ? value.done / value.total : 0;
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0;
}

/** Конец луча `i` (по часовой от верха) на длине `len`. Округление, чтобы разметка на сервере и в браузере совпадала. */
function tip(i: number, len: number): { x: number; y: number } {
  const a = (i * 2 * Math.PI) / RAYS;
  return { x: +(CENTER + len * Math.sin(a)).toFixed(3), y: +(CENTER - len * Math.cos(a)).toFixed(3) };
}

export function ProgressAsterisk({
  value = 0,
  size = 24,
  due = false,
  thinking = false,
  tone = "default",
  label,
  count,
  countClassName,
  className,
}: {
  /** Доля 0..1 или пара `{ done, total }`. */
  value?: Value;
  size?: keyof typeof SIZES;
  /** Карточки ждут повторения: пройденные лучи точками. */
  due?: boolean;
  /** Модель работает: звёздочка вращается, прогресса нет. */
  thinking?: boolean;
  /** `inverse` для оранжевой плашки: пройденные лучи белые, остальные полупрозрачные. */
  tone?: "default" | "inverse";
  /** Подпись для экранного диктора («Пройдено 3 из 5»). Без неё знак декоративный, а `count` читается как обычный текст. */
  label?: string;
  /** Число рядом со звёздочкой («3 из 5», «3/5»). */
  count?: string;
  countClassName?: string;
  className?: string;
}) {
  const f = thinking ? 1 : fraction(value);
  const on = thinking ? "stroke-current" : tone === "inverse" ? "stroke-primary-foreground" : "stroke-primary";
  const off = tone === "inverse" ? "stroke-primary-foreground/30" : "stroke-border";
  const dots = due && !thinking ? { strokeDasharray: `0 ${RAY / 2}` } : undefined;
  const a11y = label ? { role: "img" as const, "aria-label": label } : undefined;

  return (
    <span {...a11y} className={cn("inline-flex shrink-0 items-center gap-2", className)}>
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        strokeWidth={STROKE}
        strokeLinecap="round"
        className={cn("shrink-0", SIZES[size], thinking ? "asterisk-spin" : "")}
      >
        {!thinking
          ? Array.from({ length: RAYS }, (_, i) => {
              const t = tip(i, RAY);
              return <line key={i} x1={CENTER} y1={CENTER} x2={t.x} y2={t.y} className={off} />;
            })
          : null}
        {Array.from({ length: RAYS }, (_, i) => {
          // Доля этого луча: 1 у пройденных, 0..1 у текущего, 0 у будущих (их не рисуем, иначе круглый конец даст точку).
          const part = Math.min(1, Math.max(0, f * RAYS - i));
          if (part <= 0) return null;
          const t = tip(i, RAY * part);
          return <line key={i} x1={CENTER} y1={CENTER} x2={t.x} y2={t.y} className={on} {...dots} />;
        })}
        {f <= 0 ? <circle cx={CENTER} cy={CENTER} r={STROKE / 2} className={cn("stroke-none", tone === "inverse" ? "fill-primary-foreground" : "fill-primary")} /> : null}
      </svg>
      {count ? <span className={cn("tabular-nums", countClassName)}>{count}</span> : null}
    </span>
  );
}
