import { notFound } from "next/navigation";
import { teacherCourse } from "@/lib/auth/access";
import { requireUserId } from "@/lib/auth/session";
import { countMaterials, listChatMessages } from "@/lib/db/queries";
import { clearChatAction } from "@/lib/actions/courses";
import { CourseChat } from "@/components/teach/CourseChat";
import { Button } from "@/components/ui/button";

export default async function ChatPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const userId = await requireUserId();
  const [ctx, messages, materialsCount] = await Promise.all([teacherCourse(courseId), listChatMessages(courseId, userId), countMaterials(courseId)]);
  if (!ctx) notFound();

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Вопросы по материалам</h2>
          <p className="mt-1 text-sm text-muted-foreground">Спросите, что есть в материалах, попросите пример, вопросы к семинару, разбор темы. Загружено материалов: {materialsCount}.</p>
        </div>
        {messages.length > 0 ? (
          <form action={clearChatAction.bind(null, courseId)}>
            <Button type="submit" variant="ghost" size="sm">Очистить</Button>
          </form>
        ) : null}
      </div>
      <div className="mt-6">
        <CourseChat courseId={courseId} initial={messages.map((m) => ({ id: m.id, role: m.role, content: m.content }))} />
      </div>
    </div>
  );
}
