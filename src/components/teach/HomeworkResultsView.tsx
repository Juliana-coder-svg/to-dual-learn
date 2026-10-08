import type { ReactNode } from "react";
import type { StoredHomeworkResults } from "@/lib/lessons/types";
import { Badge } from "@/components/ui/badge";
import { plural } from "@/lib/utils/format";
import { DownloadResultsButton } from "./DownloadResultsButton";
import { AiNote } from "@/components/shared/AiNote";

/** Карточка сводки. Пустое состояние словами, а не пустой рамкой: преподаватель должен понять, что в этой колонке ничего нет, а не что она не загрузилась. */
function OverviewCard({ title, empty, accent, children }: { title: string; empty: string; accent?: boolean; children: ReactNode | null }) {
  return (
    <section aria-label={title} className={`min-w-0 rounded-md p-4 text-sm ${accent ? "border-l-4 border-primary bg-muted/50" : "border"}`}>
      <h4 className={accent ? "text-xs font-medium uppercase text-primary" : "text-xs font-medium uppercase text-muted-foreground"}>{title}</h4>
      {children ?? <p className="mt-2 text-muted-foreground">{empty}</p>}
    </section>
  );
}

export function HomeworkResultsView({ results }: { results: StoredHomeworkResults }) {
  const o = results.overview;
  const total = results.results.length;
  return (
    <div className="space-y-4">
      <section>
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-medium">Сводка по группе <span className="font-normal text-muted-foreground">· {plural(total, "работа", "работы", "работ")}</span></h3>
          <DownloadResultsButton results={results} />
        </div>
        <AiNote kind="homework" className="mt-1" />
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <OverviewCard title="Провалили чаще всего" empty="Каждый критерий выполнило большинство.">
            {o.failedCriteria.length > 0 ? (
              <ul className="mt-2 space-y-2">
                {o.failedCriteria.map((c, i) => (
                  <li key={i} className="flex items-start justify-between gap-3 [overflow-wrap:anywhere]">
                    <span>{c.criterion}</span>
                    <span className="shrink-0 font-medium tabular-nums"><span className="sr-only">не выполнили </span>{c.failed} из {c.total}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </OverviewCard>
          <OverviewCard title="Переобъяснить" accent empty="Переобъяснять нечего: общих пробелов в работах нет.">
            {o.reteach.length > 0 ? (
              <ul className="mt-2 space-y-3">
                {o.reteach.map((r, i) => (
                  <li key={i} className="[overflow-wrap:anywhere]">
                    <div className="font-medium">{r.topic}</div>
                    <p className="mt-0.5 text-muted-foreground">{r.why}</p>
                  </li>
                ))}
              </ul>
            ) : null}
          </OverviewCard>
          <OverviewCard title="Уже получается" empty="Пока нечего выделить: ни один критерий не выполнило большинство.">
            {o.quickWins.length > 0 ? (
              <ul className="mt-2 space-y-2">
                {o.quickWins.map((w, i) => <li key={i} className="flex gap-2 [overflow-wrap:anywhere]"><span aria-hidden className="text-primary">✓</span><span>{w}</span></li>)}
              </ul>
            ) : null}
          </OverviewCard>
        </div>
        {results.overviewText ? <p className="mt-3 whitespace-pre-wrap rounded-md bg-muted p-4 text-sm">{results.overviewText}</p> : null}
      </section>
      <ul className="space-y-3">
        {results.results.map((r, i) => (
          <li key={i} className="rounded-md border p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-medium">{r.student}</div>
              <div className="flex items-center gap-2">
                {r.flags.map((f, j) => <Badge key={j} variant="outline">{f}</Badge>)}
                <Badge>{r.score}/10</Badge>
              </div>
            </div>
            <ul className="mt-3 space-y-1">
              {r.criteria.map((c, j) => (
                <li key={j} className="flex gap-2">
                  <span className={c.met ? "text-primary" : "text-muted-foreground"}>{c.met ? "✓" : "✗"}</span>
                  <span><span className="font-medium">{c.criterion}.</span> <span className="text-muted-foreground">{c.comment}</span></span>
                </li>
              ))}
            </ul>
            <p className="mt-3 whitespace-pre-wrap">{r.feedback}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
