import { notFound } from "next/navigation";
import { teacherCourse } from "@/lib/auth/access";
import { countMaterials, listGenerations } from "@/lib/db/queries";
import { ARTIFACT_KINDS, type ArtifactKind } from "@/lib/lessons/types";
import { ArtifactGenerator } from "@/components/teach/ArtifactGenerator";
import { Markdown } from "@/components/shared/Markdown";
import { AiNote } from "@/components/shared/AiNote";
import { formatDateTime } from "@/lib/utils/format";

export default async function GeneratePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const [ctx, history, materialsCount] = await Promise.all([teacherCourse(courseId), listGenerations(courseId), countMaterials(courseId)]);
  if (!ctx) notFound();
  const hasMaterials = materialsCount > 0;

  return (
    <div className="space-y-8">
      <ArtifactGenerator courseId={courseId} disabled={!hasMaterials} />
      {history.length > 0 ? (
        <section>
          <h2 className="text-lg font-semibold">История</h2>
          <ul className="mt-4 space-y-3">
            {history.map((g) => (
              <li key={g.id} className="rounded-md border p-4">
                <details>
                  <summary className="cursor-pointer text-sm">
                    <span className="font-medium">{ARTIFACT_KINDS[g.kind as ArtifactKind] ?? g.kind}</span>
                    <span className="text-muted-foreground"> · {formatDateTime(g.created_at)}{g.prompt ? ` · ${g.prompt.slice(0, 80)}` : ""}</span>
                  </summary>
                  <div className="mt-3"><AiNote kind="artifact" /><Markdown text={g.output} /></div>
                </details>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
