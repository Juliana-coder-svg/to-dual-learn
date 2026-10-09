import { teacherCourse, noCourseAccess } from "@/lib/auth/access";
import { countMaterials, listGenerations } from "@/lib/db/queries";
import { ARTIFACT_KINDS, type ArtifactKind } from "@/lib/lessons/types";
import { ArtifactGenerator } from "@/components/teach/ArtifactGenerator";
import { Markdown } from "@/components/shared/Markdown";
import { AiNote } from "@/components/shared/AiNote";
import { SectionHeader } from "@/components/shared/PageHeader";
import { formatDateTime } from "@/lib/utils/format";

export default async function GeneratePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const [ctx, history, materialsCount] = await Promise.all([teacherCourse(courseId), listGenerations(courseId), countMaterials(courseId)]);
  if (!ctx) return noCourseAccess(`/teach/${courseId}/generate`);
  const hasMaterials = materialsCount > 0;

  return (
    <div className="space-y-10">
      <section>
        <SectionHeader title="Материалы для занятий" description="Задание, тест, конспект или план занятия по материалам курса." />
        <div className="mt-6">
          <ArtifactGenerator courseId={courseId} disabled={!hasMaterials} />
        </div>
      </section>
      {history.length > 0 ? (
        <section>
          <SectionHeader title="История" />
          <ul className="mt-4 divide-y rounded-lg border">
            {history.map((g) => (
              <li key={g.id} className="p-4">
                <details className="group">
                  <summary className="flex min-h-8 cursor-pointer list-none items-center gap-2 text-sm [&::-webkit-details-marker]:hidden">
                    <span aria-hidden className="text-muted-foreground transition-transform group-open:rotate-90">›</span>
                    <span className="font-medium">{ARTIFACT_KINDS[g.kind as ArtifactKind] ?? g.kind}</span>
                    <span className="text-muted-foreground"> · {formatDateTime(g.created_at)}{g.prompt ? ` · ${g.prompt.slice(0, 80)}` : ""}</span>
                  </summary>
                  <div className="mt-3 border-t pt-4">
                    <AiNote kind="artifact" className="mb-3" />
                    <Markdown text={g.output} />
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
