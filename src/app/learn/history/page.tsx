import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { listUserSubmissions } from "@/lib/db/queries";
import { AppShell } from "@/components/shared/AppShell";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils/format";

export default async function HistoryPage() {
  const user = await requireUser();
  const items = await listUserSubmissions(user.id);

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight">Мои ответы</h1>
        <p className="mt-1 text-sm text-muted-foreground">Все ответы и разбор наставника. Пересмотры после возражений отмечены.</p>
        {items.length === 0 ? (
          <p className="mt-6 rounded-md border border-dashed p-6 text-sm text-muted-foreground">Пока пусто. <Link href="/learn" className="text-primary">К урокам</Link></p>
        ) : (
          <ul className="mt-6 space-y-3">
            {items.map((s) => (
              <li key={s.id} className="rounded-md border p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <Link href={`/learn/${s.course_id}/lesson/${s.lesson_id}`} className="font-medium hover:text-primary">Урок {s.lesson_position}: {s.lesson_title}</Link>
                    <div className="text-xs text-muted-foreground">{s.course_title} · {formatDateTime(s.created_at)}{s.objection ? " · пересмотр" : ""}</div>
                  </div>
                  <Badge>{s.score}/5</Badge>
                </div>
                <p className="mt-2 text-muted-foreground">{s.feedback.summary}</p>
                <details className="mt-2">
                  <summary className="cursor-pointer text-muted-foreground">Мой ответ{s.objection ? " и возражение" : ""}</summary>
                  <blockquote className="mt-2 whitespace-pre-wrap border-l-2 pl-3">{s.answer}</blockquote>
                  {s.objection ? <blockquote className="mt-2 whitespace-pre-wrap border-l-2 border-primary pl-3">{s.objection}</blockquote> : null}
                </details>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
