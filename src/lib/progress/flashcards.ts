const DAY_MS = 24 * 60 * 60 * 1000;

export type RecallQuality = "forgot" | "vague" | "remembered";

const REMEMBERED_INTERVALS_DAYS = [7, 14, 30];

/** Первое повторение — через день после урока. */
export function firstDueAt(now = new Date()): string {
  return new Date(now.getTime() + DAY_MS).toISOString();
}

/** Интервалы из ARCHITECTURE.md: забыл → 1 день, смутно → 2 дня, помню → 7, 14, 30. */
export function nextReview(
  round: number,
  quality: RecallQuality,
  now = new Date(),
): { nextDueAt: string; round: number } {
  if (quality === "forgot") {
    return { nextDueAt: new Date(now.getTime() + DAY_MS).toISOString(), round: 0 };
  }
  if (quality === "vague") {
    return { nextDueAt: new Date(now.getTime() + 2 * DAY_MS).toISOString(), round };
  }
  const days = REMEMBERED_INTERVALS_DAYS[Math.min(round, REMEMBERED_INTERVALS_DAYS.length - 1)];
  return { nextDueAt: new Date(now.getTime() + days * DAY_MS).toISOString(), round: round + 1 };
}
