import { notFound } from "next/navigation";
import { teacherCourse } from "@/lib/auth/access";
import { listHomeworkChecks } from "@/lib/db/queries";
import { HomeworkChecker } from "@/components/teach/HomeworkChecker";
import { HomeworkResultsView } from "@/components/teach/HomeworkResultsView";
import { SectionHeader } from "@/components/shared/PageHeader";
import { formatDateTime, plural } from "@/lib/utils/format";

export default async function HomeworkPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const [ctx, history] = await Promise.all([teacherCourse(courseId), listHomeworkChecks(courseId)]);
  if (!ctx) notFound();

  return (
    <div className="space-y-10">
      <HomeworkChecker courseId={courseId} />
      {history.length > 0 ? (
        <section>
          <SectionHeader title="Прошлые проверки" />
          <ul className="mt-4 divide-y rounded-lg border">
            {history.map((h) => (
              <li key={h.id} className="p-4">
                <details className="group">
                  <summary className="flex min-h-8 cursor-pointer list-none items-center gap-2 text-sm [&::-webkit-details-marker]:hidden">
                    <span aria-hidden className="text-muted-foreground transition-transform group-open:rotate-90">›</span>
                    <span className="font-medium">{h.task.slice(0, 80)}</span>
                    <span className="text-muted-foreground"> · {plural(h.results.results.length, "работа", "работы", "работ")} · {formatDateTime(h.created_at)}</span>
                  </summary>
                  <div className="mt-4 border-t pt-4"><HomeworkResultsView results={h.results} /></div>
                </details>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
