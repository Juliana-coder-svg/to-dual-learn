import { notFound } from "next/navigation";
import { teacherCourse } from "@/lib/auth/access";
import { listLessons, listStudentsWithStats, listSubmissionsByCourse } from "@/lib/db/queries";
import { formatDateTime } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";

export default async function StudentsPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const ctx = await teacherCourse(courseId);
  if (!ctx) notFound();
  const students = await listStudentsWithStats(courseId);
  const published = (await listLessons(courseId, { publishedOnly: true })).length;
  const submissions = (await listSubmissionsByCourse(courseId)).slice(0, 30);

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-lg font-semibold">Студенты</h2>
        <p className="mt-1 text-sm text-muted-foreground">Записываются по коду <span className="font-mono font-semibold">{ctx.course.join_code}</span>. Опубликовано уроков: {published}.</p>
        {students.length === 0 ? (
          <p className="mt-6 rounded-md border border-dashed p-6 text-sm text-muted-foreground">Пока никто не записался.</p>
        ) : (
          <table className="mt-6 w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr className="border-b"><th className="py-2 pr-4 font-medium">Студент</th><th className="py-2 pr-4 font-medium">Пройдено</th><th className="py-2 pr-4 font-medium">Средний балл</th><th className="py-2 pr-4 font-medium">Дней подряд</th><th className="py-2 font-medium">Баллы</th></tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.user_id} className="border-b">
                  <td className="py-2 pr-4"><div className="font-medium">{s.name}</div><div className="text-xs text-muted-foreground">{s.email}</div></td>
                  <td className="py-2 pr-4">{s.completed}/{published}</td>
                  <td className="py-2 pr-4">{s.avg_score != null ? s.avg_score.toFixed(1) : "-"}</td>
                  <td className="py-2 pr-4">{s.streak}</td>
                  <td className="py-2">{s.xp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      {submissions.length > 0 ? (
        <section>
          <h2 className="text-lg font-semibold">Последние ответы</h2>
          <ul className="mt-4 space-y-3">
            {submissions.map((s) => (
              <li key={s.id} className="rounded-md border p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div><span className="font-medium">{s.student_name}</span> <span className="text-muted-foreground">· Урок {s.lesson_position}: {s.lesson_title} · {formatDateTime(s.created_at)}</span></div>
                  <Badge>{s.score}/5</Badge>
                </div>
                <details className="mt-2">
                  <summary className="cursor-pointer text-muted-foreground">Ответ и разбор</summary>
                  <blockquote className="mt-2 whitespace-pre-wrap border-l-2 pl-3">{s.answer}</blockquote>
                  <p className="mt-2 text-muted-foreground">{s.feedback.summary}</p>
                </details>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
