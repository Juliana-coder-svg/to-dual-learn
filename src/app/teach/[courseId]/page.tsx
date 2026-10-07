import { notFound } from "next/navigation";
import { teacherCourse } from "@/lib/auth/access";
import { listMaterials } from "@/lib/db/queries";
import { deleteMaterialAction } from "@/lib/actions/courses";
import { MaterialsUploader } from "@/components/teach/MaterialsUploader";
import { Button } from "@/components/ui/button";
import { formatChars, formatDate } from "@/lib/utils/format";

export default async function MaterialsPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const ctx = await teacherCourse(courseId);
  if (!ctx) notFound();
  const materials = await listMaterials(courseId);
  const totalChars = materials.reduce((s, m) => s + m.char_count, 0);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <section>
        <h2 className="text-lg font-semibold">Материалы курса</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Программа, методички, учебники, статьи. Всё, что вы загрузите, ИИ использует, когда собирает уроки и задания и отвечает на вопросы.
        </p>
        {materials.length === 0 ? (
          <p className="mt-6 rounded-md border border-dashed p-6 text-sm text-muted-foreground">Материалов пока нет. Загрузите хотя бы один файл, чтобы собрать уроки.</p>
        ) : (
          <ul className="mt-6 divide-y rounded-md border">
            {materials.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">{m.filename}</div>
                  <div className="text-xs text-muted-foreground">
                    {m.kind.toUpperCase()} · {formatChars(m.char_count)} · {formatDate(m.created_at)}
                  </div>
                  <details className="mt-1 text-xs">
                    <summary className="cursor-pointer text-muted-foreground">Показать текст</summary>
                    <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded bg-muted p-3">{m.content_text.slice(0, 4000)}{m.content_text.length > 4000 ? "\n…" : ""}</pre>
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
          <p className="mt-3 text-xs text-muted-foreground">Всего {formatChars(totalChars)} (~{Math.max(1, Math.round(totalChars / 3.5 / 1000))} тыс. токенов, в них считается расход на ИИ). Материалы кэшируются, повторные запросы выходят дешевле.</p>
        ) : null}
      </section>
      <aside>
        <MaterialsUploader courseId={courseId} />
      </aside>
    </div>
  );
}
