import { teacherCourse, noCourseAccess } from "@/lib/auth/access";
import { requireUserId } from "@/lib/auth/session";
import { countMaterials, listChatMessages } from "@/lib/db/queries";
import { clearChatAction } from "@/lib/actions/courses";
import { CourseChat } from "@/components/teach/CourseChat";
import { SectionHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { plural } from "@/lib/utils/format";

export default async function ChatPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const userId = await requireUserId();
  const [ctx, messages, materialsCount] = await Promise.all([teacherCourse(courseId), listChatMessages(courseId, userId), countMaterials(courseId)]);
  if (!ctx) return noCourseAccess(`/teach/${courseId}/chat`);

  return (
    <div className="mx-auto max-w-3xl">
      <SectionHeader
        title="Вопросы по материалам"
        description={`Спросите, что есть в материалах, попросите пример, вопросы к семинару, разбор темы. Загружено: ${plural(materialsCount, "материал", "материала", "материалов")}.`}
        actions={
          messages.length > 0 ? (
            <form action={clearChatAction.bind(null, courseId)}>
              <Button type="submit" variant="ghost" size="sm">Очистить</Button>
            </form>
          ) : undefined
        }
      />
      <div className="mt-6">
        <CourseChat courseId={courseId} initial={messages.map((m) => ({ id: m.id, role: m.role, content: m.content }))} />
      </div>
    </div>
  );
}
