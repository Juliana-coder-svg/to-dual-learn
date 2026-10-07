import { notFound } from "next/navigation";
import { teacherCourse } from "@/lib/auth/access";
import { listHomeworkChecks } from "@/lib/db/queries";
import { HomeworkChecker } from "@/components/teach/HomeworkChecker";
import { HomeworkResultsView } from "@/components/teach/HomeworkResultsView";
import { formatDateTime } from "@/lib/utils/format";

export default async function HomeworkPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const ctx = await teacherCourse(courseId);
  if (!ctx) notFound();
  const history = listHomeworkChecks(courseId);

  return (
    <div className="space-y-8">
      <HomeworkChecker courseId={courseId} />
      {history.length > 0 ? (
        <section>
          <h2 className="text-lg font-semibold">Прошлые проверки</h2>
          <ul className="mt-4 space-y-3">
            {history.map((h) => (
              <li key={h.id} className="rounded-md border p-4">
                <details>
                  <summary className="cursor-pointer text-sm">
                    <span className="font-medium">{h.task.slice(0, 80)}</span>
                    <span className="text-muted-foreground"> · {h.results.results.length} работ · {formatDateTime(h.created_at)}</span>
                  </summary>
                  <div className="mt-4"><HomeworkResultsView results={h.results} /></div>
                </details>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
