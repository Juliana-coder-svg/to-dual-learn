/** Состояние сборки уроков и честная оценка времени. Запись хранится в generations (kind = BUILD_KIND):
 *  prompt — параметры, output — состояние в JSON. Схема базы не менялась. */

export const BUILD_KIND = "lessons_build";

/** Сборка в функции живёт не дольше maxDuration (300 с). Запись «идёт» старше этого срока (с небольшим запасом) считаем прерванной. */
export const BUILD_STALE_SECONDS = 320;

export interface BuildParams {
  count: number;
  review: boolean;
}

export type BuildOutput =
  | { status: "running" }
  | { status: "done"; added: number; seconds: number; summary?: string }
  | { status: "failed"; error: string };

export interface BuildState {
  id: string;
  startedAt: string;
  params: BuildParams;
  /** Прошло секунд с запуска на момент чтения; для «идёт» и «прервана». */
  ageSeconds: number;
  output: BuildOutput;
}

export type BuildStatus = "running" | "done" | "failed" | "stale";

export function buildStatus(b: Pick<BuildState, "output" | "ageSeconds">): BuildStatus {
  if (b.output.status === "running") return b.ageSeconds > BUILD_STALE_SECONDS ? "stale" : "running";
  return b.output.status;
}

export function parseBuildParams(prompt: string): BuildParams {
  try {
    const p = JSON.parse(prompt) as Partial<BuildParams>;
    return { count: Math.min(10, Math.max(1, Number(p.count) || 5)), review: p.review !== false };
  } catch {
    return { count: 5, review: true };
  }
}

export function parseBuildOutput(output: string): BuildOutput {
  try {
    const o = JSON.parse(output) as BuildOutput;
    if (o && (o.status === "running" || o.status === "done" || o.status === "failed")) return o;
  } catch {
    /* ниже запись считается идущей: так её увидит и устаревший порог */
  }
  // Нераспознанная запись не должна вечно держать сборку «идущей»: считаем её оборванной.
  return { status: "failed", error: "Сборка не удалась. Попробуйте ещё раз." };
}

/** Без истории: замер 15–16 октября 2026. Пять уроков с проверкой заняли от 4 до 7 минут. Берём верхнюю границу:
 *  лучше пообещать больше и уложиться. Чтение материалов ~20 с, урок ~55 с, проверка ~25 с на урок. */
const BASE_SECONDS = 20;
const PER_LESSON_SECONDS = 55;
const REVIEW_PER_LESSON_SECONDS = 25;

export interface FinishedBuild {
  count: number;
  review: boolean;
  seconds: number;
}

/** Оценка в секундах. Если в истории курса есть завершённые сборки с такой же проверкой, берём их медиану на урок
 *  (последние пять), иначе константы. Одна случайная сборка не должна ломать оценку, поэтому медиана. */
export function estimateBuildSeconds(count: number, review: boolean, history: FinishedBuild[] = []): { seconds: number; fromHistory: boolean } {
  const same = history.filter((h) => h.review === review && h.count > 0 && h.seconds > 0).slice(0, 5);
  if (same.length > 0) {
    const perLesson = same.map((h) => (h.seconds - BASE_SECONDS) / h.count).sort((a, b) => a - b);
    const mid = Math.floor(perLesson.length / 2);
    const median = perLesson.length % 2 ? perLesson[mid] : (perLesson[mid - 1] + perLesson[mid]) / 2;
    return { seconds: Math.round(BASE_SECONDS + Math.max(20, median) * count), fromHistory: true };
  }
  return { seconds: BASE_SECONDS + (PER_LESSON_SECONDS + (review ? REVIEW_PER_LESSON_SECONDS : 0)) * count, fromHistory: false };
}

/** «около 7 минут», «около 40 секунд». Округляем вверх до полуминуты: оценка не должна обещать меньше. */
export function formatEstimate(seconds: number): string {
  if (seconds < 60) return `около ${Math.max(10, Math.ceil(seconds / 10) * 10)} секунд`;
  const minutes = Math.ceil(seconds / 30) / 2;
  const whole = Number.isInteger(minutes);
  const text = whole ? String(minutes) : String(minutes).replace(".", ",");
  const unit = whole ? (minutes % 10 === 1 && minutes % 100 !== 11 ? "минуту" : minutes % 10 >= 2 && minutes % 10 <= 4 && (minutes % 100 < 10 || minutes % 100 >= 20) ? "минуты" : "минут") : "минуты";
  return `около ${text} ${unit}`;
}

export interface Stage {
  label: string;
  /** Доля общего времени. */
  share: number;
}

export function buildStages(review: boolean): Stage[] {
  return review
    ? [{ label: "Читаю материалы", share: 0.07 }, { label: "Собираю уроки", share: 0.6 }, { label: "Проверяю уроки", share: 0.33 }]
    : [{ label: "Читаю материалы", share: 0.1 }, { label: "Собираю уроки", share: 0.9 }];
}

/** Номер этапа по прошедшему времени. Этап не возвращается назад: если время вышло за оценку, остаёмся на последнем. */
export function currentStage(stages: Stage[], totalSeconds: number, elapsed: number): number {
  let acc = 0;
  for (let i = 0; i < stages.length; i++) {
    acc += stages[i].share * totalSeconds;
    if (elapsed < acc) return i;
  }
  return stages.length - 1;
}
