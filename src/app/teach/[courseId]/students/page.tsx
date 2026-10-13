import { teacherCourse, noCourseAccess } from "@/lib/auth/access";
import { listLessonSummaries, listStudentsWithStats, listSubmissionsByCourse } from "@/lib/db/queries";
import { formatDateTime, plural } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { AiNote } from "@/components/shared/AiNote";

export default async function StudentsPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const [ctx, students, publishedLessons, allSubmissions] = await Promise.all([
    teacherCourse(courseId),
    // RPC бросает 42501 чужому пользователю, а запрос идёт параллельно с проверкой владельца: тогда пусто, дальше 404.
    listStudentsWithStats(courseId).catch((e: unknown) => {
      if (String(e).includes("not a course owner")) return [];
      throw e;
    }),
    listLessonSummaries(courseId, { publishedOnly: true }),
    listSubmissionsByCourse(courseId),
  ]);
  if (!ctx) return noCourseAccess(`/teach/${courseId}/students`);
  const published = publishedLessons.length;
  const submissions = allSubmissions.slice(0, 30);

  return (
    <div className="space-y-10">
      <section>
        <SectionHeader
          title="Студенты"
          description={<>Записываются по коду <span className="font-mono font-semibold tracking-wider text-foreground">{ctx.course.join_code}</span>. Опубликовано уроков: {published}.</>}
        />
        {students.length === 0 ? (
          <EmptyState className="mt-6" title="Пока никто не записался" description="Отправьте студентам код курса или ссылку-приглашение из настроек." />
        ) : (
          <div className="mt-6 overflow-x-auto rounded-lg border">
            <table className="data-table min-w-[560px]">
              <thead>
                <tr>
                  <th className="pl-4">Студент</th>
                  <th>Пройдено</th>
                  <th>Средний балл</th>
                  <th>Дней подряд</th>
                  <th className="pr-4 text-right">Баллы</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.user_id}>
                    <td className="pl-4"><div className="font-medium">{s.name}</div><div className="type-caption text-muted-foreground">{s.email}</div></td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-16 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-primary" style={{ width: `${published ? Math.round((s.completed / published) * 100) : 0}%` }} /></span>
                        <span>{s.completed}/{published}</span>
                      </div>
                    </td>
                    <td>{s.avg_score != null ? s.avg_score.toFixed(1) : <span className="text-muted-foreground">—</span>}</td>
                    <td>{s.streak}</td>
                    <td className="pr-4 text-right font-medium">{s.xp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {submissions.length > 0 ? (
        <section>
          <SectionHeader title="Последние ответы" description={`${plural(submissions.length, "ответ", "ответа", "ответов")}, новые сверху.`} />
          <ul className="mt-4 divide-y rounded-lg border">
            {submissions.map((s) => (
              <li key={s.id} className="p-4 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium">{s.student_name}</div>
                    <div className="type-caption text-muted-foreground">Урок {s.lesson_position}: {s.lesson_title} · {formatDateTime(s.created_at)}</div>
                  </div>
                  <Badge>{s.score}/5</Badge>
                </div>
                <details className="group mt-2">
                  <summary className="inline-flex min-h-6 cursor-pointer list-none items-center gap-1 text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
                    <span aria-hidden className="transition-transform group-open:rotate-90">›</span> Ответ и разбор
                  </summary>
                  <blockquote className="mt-3 whitespace-pre-wrap border-l-2 pl-3 type-body">{s.answer}</blockquote>
                  <p className="mt-3 text-muted-foreground">{s.feedback.summary}</p>
                  <AiNote kind="feedback" className="mt-2" />
                </details>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
