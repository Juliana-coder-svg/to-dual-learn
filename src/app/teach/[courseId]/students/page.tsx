import { teacherCourse, noCourseAccess } from "@/lib/auth/access";
import Link from "next/link";
import { listLessonAnswersForSignals, listLessonSummaries, listStudentsWithStats, listSubmissionsByCourse } from "@/lib/db/queries";
import { computeStudentProgress, parseStateFilter, STATE_LABEL, type StudentState } from "@/lib/learning/student-state";
import { DownloadStudentsButton } from "@/components/teach/DownloadStudentsButton";
import { cn } from "@/lib/utils";
import { formatDate, formatDateTime, plural } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { AiNote } from "@/components/shared/AiNote";
import { ProgressAsterisk } from "@/components/shared/ProgressAsterisk";

export default async function StudentsPage({ params, searchParams }: { params: Promise<{ courseId: string }>; searchParams: Promise<{ state?: string | string[] }> }) {
  const { courseId } = await params;
  const filter = parseStateFilter([(await searchParams).state].flat()[0]);
  const [ctx, students, publishedLessons, allSubmissions, answers] = await Promise.all([
    teacherCourse(courseId),
    // RPC бросает 42501 чужому пользователю, а запрос идёт параллельно с проверкой владельца: тогда пусто, дальше 404.
    listStudentsWithStats(courseId).catch((e: unknown) => {
      if (String(e).includes("not a course owner")) return [];
      throw e;
    }),
    listLessonSummaries(courseId, { publishedOnly: true }),
    listSubmissionsByCourse(courseId),
    listLessonAnswersForSignals(courseId).catch((e: unknown) => {
      if (String(e).includes("not a course owner") || String(e).includes("42501")) return [];
      throw e;
    }),
  ]);
  if (!ctx) return noCourseAccess(`/teach/${courseId}/students`);
  const published = publishedLessons.length;
  const submissions = allSubmissions.slice(0, 30);
  const progress = computeStudentProgress(
    students.map((s) => s.user_id),
    publishedLessons.map((l) => l.id),
    answers,
    new Date(),
  );
  const stateOf = (id: string): StudentState => progress.get(id)?.state ?? "not_started";
  const count = (st: StudentState) => students.filter((s) => stateOf(s.user_id) === st).length;
  const base = `/teach/${courseId}/students`;
  const shown = filter ? students.filter((s) => stateOf(s.user_id) === filter) : students;
  const csvRows: (string | number)[][] = [["Имя", "Почта", "Состояние", `Пройдено (из ${published})`, "Последний ответ", "Средний балл"]];
  for (const s of shown) {
    const p = progress.get(s.user_id);
    csvRows.push([
      s.name,
      s.email,
      STATE_LABEL[stateOf(s.user_id)],
      p?.completed ?? 0,
      p?.lastAnswerAt ? p.lastAnswerAt.slice(0, 10) : "",
      s.avg_score != null ? s.avg_score.toFixed(1).replace(".", ",") : "",
    ]);
  }
  const chips: { key: StudentState | null; label: string }[] = [
    { key: null, label: `Все ${students.length}` },
    { key: "not_started", label: `Не начали ${count("not_started")}` },
    { key: "stuck", label: `Застряли ${count("stuck")}` },
    { key: "done", label: `Сдали ${count("done")}` },
    { key: "active", label: `Идут ${count("active")}` },
  ];

  return (
    <div className="space-y-10">
      <section>
        <SectionHeader
          title="Студенты"
          description={<>Записываются по коду <span className="font-mono font-semibold tracking-wider text-foreground">{ctx.course.join_code}</span>. Опубликовано уроков: {published}.</>}
        />
        {students.length === 0 ? (
          <EmptyState className="mt-6" title="Пока никто не записался" description="Отправьте студентам код курса или ссылку-приглашение: кнопка «Отправить студентам» вверху страницы." />
        ) : (
          <>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <nav aria-label="Фильтр по состоянию" className="flex flex-wrap gap-2 text-sm">
              {chips.map((c) => (
                <Link
                  key={c.label}
                  href={c.key ? `${base}?state=${c.key}` : base}
                  aria-current={filter === c.key ? "page" : undefined}
                  className={cn("inline-flex min-h-9 items-center rounded-full border px-3.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring sm:min-h-8", filter === c.key ? "border-primary bg-primary-soft font-medium text-primary-strong" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
                >
                  {c.label}
                </Link>
              ))}
            </nav>
            <DownloadStudentsButton rows={csvRows} filename="students.csv" />
          </div>
          <p className="mt-4 max-w-prose type-caption text-muted-foreground">
            Баллы копятся за уроки и повторение. Серия считает дни без пропуска. Застрял: последний балл 1–2 или нет ответов больше трёх дней.
          </p>
          <div className="mt-4 overflow-x-auto rounded-lg border" tabIndex={0} role="region" aria-label="Таблица студентов">
            <table className="data-table min-w-[760px] whitespace-nowrap">
              <thead>
                <tr>
                  <th className="pl-4">Студент</th>
                  <th>Состояние</th>
                  <th>Пройдено</th>
                  <th>Последний ответ</th>
                  <th>Средний балл</th>
                  <th>Серия</th>
                  <th className="pr-4 text-right">Баллы</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((s) => (
                  <tr key={s.user_id}>
                    <td className="pl-4"><div className="font-medium">{s.name}</div><div className="type-caption font-normal text-muted-foreground">{s.email}</div></td>
                    <td><Badge variant={stateOf(s.user_id) === "stuck" ? "destructive" : stateOf(s.user_id) === "done" ? "default" : "outline"}>{STATE_LABEL[stateOf(s.user_id)]}</Badge></td>
                    <td>
                      <ProgressAsterisk size={16} value={{ done: progress.get(s.user_id)?.completed ?? 0, total: published }} label={`Пройдено ${progress.get(s.user_id)?.completed ?? 0} из ${published}`} count={`${progress.get(s.user_id)?.completed ?? 0}/${published}`} />
                    </td>
                    <td>{progress.get(s.user_id)?.lastAnswerAt ? formatDate(progress.get(s.user_id)!.lastAnswerAt!) : <span className="text-muted-foreground">—</span>}</td>
                    <td>{s.avg_score != null ? s.avg_score.toFixed(1) : <span className="text-muted-foreground">—</span>}</td>
                    <td>{s.streak}</td>
                    <td className="pr-4 text-right font-medium">{s.xp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {shown.length === 0 ? <p className="p-4 text-sm text-muted-foreground">Студентов с таким состоянием нет.</p> : null}
          </div>
          </>
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
