import { cn } from "@/lib/utils";

/** Больше этого сегменты сливаются в полосу: рисуем один сплошной трек. */
const MAX_SEGMENTS = 24;

const SIZES = {
  /** В карточках и списках: 6 px высоты, сегмент 20 px. */
  sm: { seg: "h-1.5 w-5", track: "h-1.5" },
  /** В шапке урока: 8 px, сегмент 48 px. */
  md: { seg: "h-2 w-12", track: "h-2" },
  /** Во всю ширину блока: 10 px, сегменты делят ширину поровну. */
  lg: { seg: "h-2.5 flex-1", track: "h-2.5" },
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
  const a11y = label
    ? { role: "progressbar" as const, "aria-label": label, "aria-valuemin": 0, "aria-valuemax": total, "aria-valuenow": Math.min(filled, total) }
    : { "aria-hidden": true as const };

  if (total <= 0 || total > MAX_SEGMENTS) {
    const pct = total > 0 ? Math.round((Math.min(filled, total) / total) * 100) : 0;
    return (
      <div {...a11y} className={cn("w-full overflow-hidden rounded-full", s.track, off, className)}>
        <div className={cn("bar-grow h-full rounded-full", on)} style={{ width: `${pct}%` }} />
      </div>
    );
  }

  return (
    <div {...a11y} className={cn("flex gap-1", size === "lg" ? "w-full gap-1.5" : "", className)}>
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1;
        const state = n <= filled ? on : n === current ? half : off;
        const text = labels?.[i];
        return (
          <div key={n} className={cn("flex min-w-0 flex-col gap-1", size === "lg" ? "flex-1" : "")}>
            <span className={cn("block rounded-full", s.seg, state)} />
            {text ? (
              <span className={cn("type-caption", n === current || (current === undefined && n === filled) ? "font-medium" : tone === "inverse" ? "text-primary-foreground/75" : "text-muted-foreground")}>
                {text}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
