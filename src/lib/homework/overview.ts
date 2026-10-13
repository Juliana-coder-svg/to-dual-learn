import type { HomeworkOverview, HomeworkResults, StoredHomeworkResults } from "@/lib/lessons/types";

/** Критерий считается одним и тем же у разных студентов, если совпадает текст без регистра, пробелов по краям и точки в конце. */
function key(criterion: string): string {
  return criterion.trim().toLowerCase().replace(/[.!…]+$/, "");
}

/** Сколько работ не выполнили каждый критерий. Порядок: по убыванию провалов, при равенстве как встретились в работах. */
export function countFailures(results: HomeworkResults["results"]): { criterion: string; failed: number; total: number }[] {
  const seen = new Map<string, { criterion: string; failed: number; total: number }>();
  for (const r of results) {
    for (const c of r.criteria) {
      const k = key(c.criterion);
      const entry = seen.get(k) ?? { criterion: c.criterion, failed: 0, total: 0 };
      entry.total += 1;
      if (!c.met) entry.failed += 1;
      seen.set(k, entry);
    }
  }
  return [...seen.values()].sort((a, b) => b.failed - a.failed);
}

/** Критерии, которые не выполнила половина работ или больше. */
export function failedByMost(results: HomeworkResults["results"]): HomeworkOverview["failedCriteria"] {
  return countFailures(results).filter((c) => c.failed > 0 && c.failed * 2 >= c.total);
}

/** Числа в сводке модели заменяем на подсчёт по результатам: названия критериев берём у модели, считать ей не доверяем.
 *  Критерий, которого нет в результатах, остаётся как есть. Выбор критериев модели сохраняется. */
export function recountFailedCriteria(results: HomeworkResults): HomeworkResults {
  const counted = new Map(countFailures(results.results).map((c) => [key(c.criterion), c]));
  const failedCriteria = results.overview.failedCriteria.map((item) => {
    const real = counted.get(key(item.criterion));
    return real ? { criterion: item.criterion, failed: real.failed, total: real.total } : item;
  });
  return { ...results, overview: { ...results.overview, failedCriteria } };
}

/** Запись из базы: новая со структурной сводкой или старая с overview-строкой. */
export function normalizeHomeworkResults(raw: unknown): StoredHomeworkResults {
  const r = raw as Omit<HomeworkResults, "overview"> & { overview?: unknown };
  if (r && typeof r.overview === "string") {
    const { overview, ...rest } = r;
    return { ...rest, overview: { failedCriteria: failedByMost(rest.results), reteach: [], quickWins: [] }, overviewText: overview };
  }
  return r as StoredHomeworkResults;
}
