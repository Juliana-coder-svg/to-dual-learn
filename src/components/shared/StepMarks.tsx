import { cn } from "@/lib/utils";

/** Больше этого сегменты сливаются в полосу: рисуем один сплошной трек. */
const MAX_SEGMENTS = 24;

const SIZES = {
  /** В карточках и списках: 6 px высоты, сегмент 20 px. */
  sm: { seg: "h-2 w-6", track: "h-2" },
  /** В шапке урока: 8 px, сегмент 48 px. */
  md: { seg: "h-3 w-14", track: "h-3" },
  /** Во всю ширину блока: 10 px, сегменты делят ширину поровну. */
  lg: { seg: "h-3 w-full", track: "h-3" },
  /** Графика: сегменты во всю ширину и в 24–40 px высотой, как разделитель секции. */
  xl: { seg: "h-6 w-full md:h-10", track: "h-6 md:h-10" },
} as const;

/**
 * Фирменный знак: ряд сегментов. В уроке три (идея, задача, разбор), в карточке курса по одному на урок,
 * в повторении по одному на карточку. Закрашенные слева: сделано, полупрозрачный: текущий, серые: впереди.
 * Внутри оранжевой плашки tone="inverse" рисует белым. Если сегментов больше 24, рисуется сплошная полоса.
 */
export function StepMarks({
  total,
  filled,
  current,
  labels,
  size = "sm",
  tone = "default",
  label,
  className,
}: {
  total: number;
  /** Сколько сегментов слева закрашено полностью. */
  filled: number;
  /** Номер текущего сегмента (с единицы): закрашен наполовину. */
  current?: number;
  /** Подписи под сегментами, по одной на сегмент (шаги урока). */
  labels?: string[];
  size?: keyof typeof SIZES;
  tone?: "default" | "inverse";
  /** Подпись для screen reader; без неё знак декоративный. */
  label?: string;
  className?: string;
}) {
  const s = SIZES[size];
  const on = tone === "inverse" ? "bg-primary-foreground" : "bg-primary";
  const half = tone === "inverse" ? "bg-primary-foreground/50" : "bg-primary/40";
  const off = tone === "inverse" ? "bg-primary-foreground/25" : "bg-muted";
  const a11y = label && total > 0
    ? { role: "progressbar" as const, "aria-label": label, "aria-valuemin": 0, "aria-valuemax": total, "aria-valuenow": Math.min(filled, total) }
    : { "aria-hidden": true as const };

  if (total <= 0 || total > MAX_SEGMENTS) {
    const pct = total > 0 ? Math.round((Math.min(filled, total) / total) * 100) : 0;
    return (
      <div {...a11y} className={cn("w-full overflow-hidden", s.track, off, className)}>
        <div className={cn("bar-grow h-full", on)} style={{ width: `${pct}%` }} />
      </div>
    );
  }

  return (
    <div {...a11y} className={cn("flex gap-1", size === "lg" || size === "xl" ? "w-full gap-1.5" : "", className)}>
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1;
        const state = n <= filled ? on : n === current ? half : off;
        const text = labels?.[i];
        return (
          <div key={n} className={cn("flex min-w-0 flex-col gap-1", size === "lg" || size === "xl" ? "flex-1" : "")}>
            <span className={cn("block", s.seg, state)} />
            {text ? (
              <span className={cn("type-caption", n === current || (current === undefined && n === filled) ? "font-medium" : tone === "inverse" ? "text-primary-foreground/90" : "text-muted-foreground")}>
                {text}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
