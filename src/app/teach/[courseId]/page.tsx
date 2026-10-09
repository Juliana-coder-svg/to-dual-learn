import { teacherCourse, noCourseAccess } from "@/lib/auth/access";
import { listMaterials } from "@/lib/db/queries";
import { deleteMaterialAction } from "@/lib/actions/courses";
import { MaterialsUploader } from "@/components/teach/MaterialsUploader";
import { SectionHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatChars, formatDate } from "@/lib/utils/format";

export default async function MaterialsPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const [ctx, materials] = await Promise.all([teacherCourse(courseId), listMaterials(courseId)]);
  if (!ctx) return noCourseAccess(`/teach/${courseId}`);
  const totalChars = materials.reduce((s, m) => s + m.char_count, 0);

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
      <section>
        <SectionHeader
          title="Материалы курса"
          description="Программа, методички, учебники, статьи. Всё, что вы загрузите, ИИ использует, когда собирает уроки и задания и отвечает на вопросы."
        />
        {materials.length === 0 ? (
          <EmptyState className="mt-6" title="Материалов пока нет" description="Загрузите хотя бы один файл или вставьте текст справа, чтобы собрать уроки." />
        ) : (
          <ul className="mt-6 divide-y rounded-lg border">
            {materials.map((m) => (
              <li key={m.id} className="flex items-start justify-between gap-4 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium">{m.filename}</span>
                    <Badge variant="outline">{m.kind.toUpperCase()}</Badge>
                  </div>
                  <div className="mt-0.5 type-caption text-muted-foreground tabular-nums">
                    {formatChars(m.char_count)} · {formatDate(m.created_at)}
                  </div>
                  <details className="mt-2 text-sm">
                    <summary className="inline-flex min-h-6 cursor-pointer items-center text-muted-foreground hover:text-foreground">Показать текст</summary>
                    <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-3 type-caption">{m.content_text.slice(0, 4000)}{m.content_text.length > 4000 ? "\n…" : ""}</pre>
                  </details>
                </div>
                <form action={deleteMaterialAction.bind(null, courseId, m.id)}>
                  <Button type="submit" variant="ghost" size="sm">Удалить</Button>
                </form>
              </li>
            ))}
          </ul>
        )}
        {materials.length > 0 ? (
          <p className="mt-3 type-caption text-muted-foreground">Всего {formatChars(totalChars)} (~{Math.max(1, Math.round(totalChars / 3.5 / 1000))} тыс. токенов, по ним считается расход на ИИ). Повторные запросы выходят дешевле: материалы берутся из кэша.</p>
        ) : null}
      </section>
      <aside>
        <MaterialsUploader courseId={courseId} />
      </aside>
    </div>
  );
}
