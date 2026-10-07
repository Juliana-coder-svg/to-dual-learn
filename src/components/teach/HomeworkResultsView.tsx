import type { HomeworkResults } from "@/lib/lessons/types";
import { Badge } from "@/components/ui/badge";

export function HomeworkResultsView({ results }: { results: HomeworkResults }) {
  return (
    <div className="space-y-4">
      <div className="rounded-md bg-muted p-4 text-sm">
        <div className="font-medium">Сводка для преподавателя</div>
        <p className="mt-1 whitespace-pre-wrap">{results.overview}</p>
      </div>
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
