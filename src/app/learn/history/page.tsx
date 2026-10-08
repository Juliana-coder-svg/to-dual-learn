import Link from "next/link";
import { requireUser, requireUserId } from "@/lib/auth/session";
import { listUserSubmissions } from "@/lib/db/queries";
import { AppShell } from "@/components/shared/AppShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AiNote } from "@/components/shared/AiNote";
import { formatDateTime, plural } from "@/lib/utils/format";

export default async function HistoryPage() {
  const userId = await requireUserId();
  const [user, items] = await Promise.all([requireUser(), listUserSubmissions(userId)]);

  return (
    <AppShell user={user} width="narrow">
      <PageHeader
        title="Мои ответы"
        description={items.length > 0 ? `${plural(items.length, "ответ", "ответа", "ответов")} и разбор наставника. Пересмотры после возражений отмечены.` : "Все ответы и разбор наставника. Пересмотры после возражений отмечены."}
      />
      {items.length === 0 ? (
        <EmptyState className="mt-8" title="Ответов пока нет" description="Пройдите первый урок, и здесь появится разбор." action={<Button nativeButton={false} render={<Link href="/learn" />} variant="outline">К урокам</Button>} />
      ) : (
        <ul className="mt-8 space-y-3">
          {items.map((s) => (
            <li key={s.id} className="rounded-lg border p-4 text-sm md:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="type-caption text-muted-foreground">{s.course_title} · {formatDateTime(s.created_at)}</div>
                  <Link href={`/learn/${s.course_id}/lesson/${s.lesson_id}`} className="mt-0.5 block text-base font-semibold hover:text-primary-strong">Урок {s.lesson_position}: {s.lesson_title}</Link>
                </div>
                <div className="flex items-center gap-1.5">
                  {s.objection ? <Badge variant="soft">Пересмотр</Badge> : null}
                  <Badge className="h-7 px-3 text-sm">{s.score}/5</Badge>
                </div>
              </div>
              <p className="mt-3 type-body">{s.feedback.summary}</p>
              <AiNote kind="feedback" className="mt-2" />
              <details className="group mt-3">
                <summary className="inline-flex min-h-8 cursor-pointer list-none items-center gap-1 text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
                  <span aria-hidden className="transition-transform group-open:rotate-90">›</span> Мой ответ{s.objection ? " и возражение" : ""}
                </summary>
                <blockquote className="mt-3 whitespace-pre-wrap border-l-2 pl-4 type-body text-muted-foreground">{s.answer}</blockquote>
                {s.objection ? (
                  <div className="mt-3">
                    <div className="eyebrow">Возражение</div>
                    <blockquote className="mt-1 whitespace-pre-wrap border-l-2 border-primary pl-4 type-body">{s.objection}</blockquote>
                  </div>
                ) : null}
              </details>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
