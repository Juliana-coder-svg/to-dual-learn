const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Новый streak после прохождения урока. Сегодня уже был урок — не меняем; вчера — +1; раньше — сброс в 1. */
export function nextStreak(prev: number, lastLessonAt: string | null, now = new Date()): number {
  if (!lastLessonAt) return 1;
  const diffDays = Math.round((startOfDay(now) - startOfDay(new Date(lastLessonAt))) / DAY_MS);
  if (diffDays === 0) return Math.max(prev, 1);
  if (diffDays === 1) return prev + 1;
  return 1;
}

export function xpForLesson(score: number): number {
  return 10 + score * 2;
}
