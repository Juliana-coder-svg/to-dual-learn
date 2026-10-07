import Link from "next/link";
import { notFound } from "next/navigation";
import { teacherCourse } from "@/lib/auth/access";
import { getLesson } from "@/lib/db/queries";
import { updateLessonAction } from "@/lib/actions/courses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default async function EditLessonPage({ params, searchParams }: { params: Promise<{ courseId: string; lessonId: string }>; searchParams: Promise<{ error?: string }> }) {
  const { courseId, lessonId } = await params;
  const sp = await searchParams;
  const ctx = await teacherCourse(courseId);
  if (!ctx) notFound();
  const lesson = await getLesson(lessonId);
  if (!lesson || lesson.course_id !== courseId) notFound();
  const c = lesson.content;

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/teach/${courseId}/lessons`} className="text-sm text-muted-foreground hover:text-foreground">← Уроки</Link>
      <h2 className="mt-1 text-lg font-semibold">Урок {lesson.position}: правка</h2>
      {sp.error ? <p className="mt-3 text-sm text-destructive">Не удалось сохранить: проверьте, что заполнены все поля, есть хотя бы два признака и два критерия.</p> : null}
      {lesson.review?.flags.length ? (
        <div className="mt-3 rounded-md border border-dashed p-3 text-sm">
          <div className="font-medium">Замечания методиста</div>
          <ul className="mt-1 list-disc pl-5 text-muted-foreground">{lesson.review.flags.map((f, i) => <li key={i}>{f}</li>)}</ul>
        </div>
      ) : null}
      <form action={updateLessonAction.bind(null, courseId, lessonId)} className="mt-6 space-y-4">
        <div className="space-y-2"><Label htmlFor="title">Название</Label><Input id="title" name="title" defaultValue={c.title} required /></div>
        <div className="space-y-2"><Label htmlFor="concept">Навык (одна фраза)</Label><Input id="concept" name="concept" defaultValue={c.concept} required /></div>
        <div className="space-y-2"><Label htmlFor="intro">Зачем это нужно</Label><Textarea id="intro" name="intro" rows={3} defaultValue={c.intro} required /></div>
        <div className="space-y-2"><Label htmlFor="keyIdea">Ключевая идея</Label><Textarea id="keyIdea" name="keyIdea" rows={3} defaultValue={c.keyIdea} required /></div>
        <div className="space-y-2"><Label htmlFor="signals">Признаки, по одному на строку</Label><Textarea id="signals" name="signals" rows={4} defaultValue={c.signals.join("\n")} required /></div>
        <div className="space-y-2"><Label htmlFor="task">Задача</Label><Textarea id="task" name="task" rows={3} defaultValue={c.task} required /></div>
        <div className="space-y-2"><Label htmlFor="sample">Текст или пример для разбора (пусто, если не нужен)</Label><Textarea id="sample" name="sample" rows={4} defaultValue={c.sample ?? ""} /></div>
        <div className="space-y-2"><Label htmlFor="rubricCriteria">Критерии оценки, по одному на строку</Label><Textarea id="rubricCriteria" name="rubricCriteria" rows={4} defaultValue={c.rubricCriteria.join("\n")} required /></div>
        <div className="space-y-2"><Label htmlFor="keyTakeaway">Вывод</Label><Input id="keyTakeaway" name="keyTakeaway" defaultValue={c.keyTakeaway} required /></div>
        <div className="space-y-2">
          <Label htmlFor="flashcards">Карточки для повторения: «вопрос | ответ», по одной на строку</Label>
          <Textarea id="flashcards" name="flashcards" rows={4} defaultValue={c.flashcards.map((f) => `${f.question} | ${f.answer}`).join("\n")} />
        </div>
        <div className="flex gap-3">
          <Button type="submit">Сохранить</Button>
          <Button nativeButton={false} render={<Link href={`/teach/${courseId}/lessons`} />} variant="ghost">Отмена</Button>
        </div>
      </form>
    </div>
  );
}
